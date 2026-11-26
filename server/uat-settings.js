// Dedicated UAT credentials. Uploaded values are never sent back in status
// responses, evidence or browser backups, and are never logged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { dataDirectory } = require('./data-directory');
const FORMAT = 'portal-uat-settings-v1';
const BASE = 'https://uat-api.ssg-wsg.sg';
// Public SHA-256 fingerprint from the confirmed November UAT certificate.
const DEFAULT_FINGERPRINT = 'caea43ed26876675e2a389da8cc279a3b430e02fe8bfc0cdf67482e6ed1b9d0b';
const file = () => path.join(dataDirectory(), 'uat-settings.enc');
const fingerprint = value => typeof value === 'string' ? value.replace(/:/g, '').trim().toLowerCase() : '';
const pem = value => typeof value === 'string' && value.length <= 128 * 1024 ? value.replace(/\\n/g, '\n').trim() : '';
function storageKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || ['dev-insecure-secret-change-me', 'change-me-to-a-long-random-string'].includes(secret)) throw new Error('Encrypted UAT storage needs a stable server session secret of at least 32 characters.');
  return crypto.hkdfSync('sha256', secret, 'portal-uat-settings', FORMAT, 32);
}
function canSave() { try { storageKey(); return true; } catch { return false; } }
function read() {
  let bytes;
  try { const target = file(); const stat = fs.statSync(target); if (stat.size > 512 * 1024) throw new Error(); bytes = fs.readFileSync(target); } catch (e) { if (e.code === 'ENOENT') return null; throw new Error('Saved UAT settings cannot be read. Preserve the data folder before repairing it.'); }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', storageKey(), bytes.subarray(0, 12)); decipher.setAAD(Buffer.from(FORMAT)); decipher.setAuthTag(bytes.subarray(12, 28));
    const value = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    if (value.schema !== 1 || !value.certificate || !value.privateKey || !value.encryptionKey || !value.expectedFingerprint || !value.keyReplyDate || !value.revision) throw new Error();
    return value;
  } catch { throw new Error('Saved UAT settings cannot be decrypted. Keep the original data folder and server session secret.'); }
}
function validate(raw) {
  const checks = []; const add = (name, pass) => checks.push({ name, pass: !!pass });
  const fields = ['certificate', 'privateKey', 'encryptionKey', 'expectedFingerprint', 'keyReplyDate', 'sourceConfirmed'];
  add('Only UAT setup fields supplied', raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).every(key => fields.includes(key)));
  const certificatePem = pem(raw?.certificate); const privatePem = pem(raw?.privateKey);
  let certificate; let privateKey;
  try { certificate = new crypto.X509Certificate(certificatePem); } catch { /* safe checks below */ }
  try { privateKey = crypto.createPrivateKey(privatePem); } catch { /* no raw parser errors */ }
  add('Certificate PEM can be read', !!certificate); add('Private-key PEM can be read', !!privateKey);
  let matches = false; try { matches = certificate.checkPrivateKey(privateKey); } catch { /* no raw parser errors */ }
  add('Private key matches the certificate', matches);
  const now = Date.now(); add('Certificate is currently valid', certificate && now >= Date.parse(certificate.validFrom) && now < Date.parse(certificate.validTo));
  const expected = fingerprint(raw?.expectedFingerprint); const actual = certificate ? fingerprint(certificate.fingerprint256) : null;
  add('Expected SHA-256 fingerprint supplied', /^[a-f0-9]{64}$/.test(expected)); add('Certificate matches the expected fingerprint', actual && actual === expected);
  const pinned = fingerprint(process.env.UAT_EXPECTED_CERT_SHA256); add('Matches any hosting fingerprint restriction', !pinned || expected === pinned);
  const encoded = typeof raw?.encryptionKey === 'string' && raw.encryptionKey.length <= 128 ? raw.encryptionKey.trim() : '';
  let validKey = false;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) { const key = Buffer.from(encoded, 'base64'); validKey = key.length === 32 && key.toString('base64') === encoded; }
  add('Encryption key is canonical base64 for 32 bytes', validKey);
  const date = typeof raw?.keyReplyDate === 'string' ? raw.keyReplyDate : '';
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  add('SWDA reply date supplied', parsedDate); add('Operator confirmed the SWDA UAT key source', raw?.sourceConfirmed === true);
  add('Destination is restricted to SWDA UAT', !process.env.UAT_API_BASE || process.env.UAT_API_BASE.replace(/\/+$/, '') === BASE);
  add('Server encryption is configured', canSave());
  return { valid: checks.every(c => c.pass), checks, certificate: certificate ? { fingerprint: actual, validFrom: new Date(certificate.validFrom).toISOString(), expiresAt: new Date(certificate.validTo).toISOString() } : null };
}
function save(raw, actor) {
  const result = validate(raw);
  if (!result.valid) { const error = new Error('UAT settings were not saved. Complete the failed validation checks.'); error.validation = result; throw error; }
  const previous = read(); // A damaged existing file is never silently replaced.
  const at = new Date().toISOString(); const revision = crypto.randomUUID();
  const entry = { at, by: actor, fingerprint: fingerprint(raw.expectedFingerprint), keyReplyDate: raw.keyReplyDate, revision };
  const value = { schema: 1, certificate: pem(raw.certificate), privateKey: pem(raw.privateKey), encryptionKey: raw.encryptionKey.trim(), expectedFingerprint: fingerprint(raw.expectedFingerprint),
    keyReplyDate: raw.keyReplyDate, savedAt: at, savedBy: actor, revision, audit: [...(previous?.audit || []), entry].slice(-40) };
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', storageKey(), iv); cipher.setAAD(Buffer.from(FORMAT));
  const content = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  const target = file(); const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  try { fs.writeFileSync(tmp, Buffer.concat([iv, cipher.getAuthTag(), content]), { mode: 0o600, flag: 'wx' }); fs.renameSync(tmp, target); }
  finally { try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  return { savedAt: at, savedBy: actor, validation: result };
}
module.exports = { read, validate, save, canSave, fingerprint, DEFAULT_FINGERPRINT };
