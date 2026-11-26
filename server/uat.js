// Shared UAT transport. No credential values are returned to the browser.
const fs = require('node:fs');
const crypto = require('node:crypto');
const https = require('node:https');
const BASE = 'https://uat-api.ssg-wsg.sg';
const IV = Buffer.from('SSGAPIInitVector');

function source(name) {
  try {
    const value = process.env[`${name}_FILE`] ? fs.readFileSync(process.env[`${name}_FILE`], 'utf8') : process.env[name];
    return value?.replace(/\\n/g, '\n').trim();
  } catch { return undefined; }
}
function credentials() {
  const cert = source('UAT_CERT'); const key = source('UAT_KEY');
  const encoded = source('UAT_ENCRYPTION_KEY');
  let encKey;
  if (encoded && /^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 32 && bytes.toString('base64') === encoded) encKey = bytes;
  }
  let certificate; let keyMatches = false;
  try { certificate = new crypto.X509Certificate(cert); keyMatches = certificate.checkPrivateKey(crypto.createPrivateKey(key)); } catch { /* reported below */ }
  const fingerprint = certificate?.fingerprint256.replace(/:/g, '').toLowerCase() || null;
  const now = Date.now();
  const certificateValid = !!certificate && now >= Date.parse(certificate.validFrom) && now < Date.parse(certificate.validTo);
  const fingerprintMatches = !!fingerprint && fingerprint === (process.env.UAT_EXPECTED_CERT_SHA256 || '').replace(/:/g, '').toLowerCase();
  const hostAllowed = !process.env.UAT_API_BASE || process.env.UAT_API_BASE.replace(/\/+$/, '') === BASE;
  const encryptionSourceConfirmed = process.env.UAT_ENCRYPTION_KEY_SOURCE === 'swda-2026-11-24';
  const status = { base: BASE, ready: !!(certificateValid && keyMatches && fingerprintMatches && hostAllowed), hasCertificate: !!cert, hasPrivateKey: !!key,
    hasEncryptionKey: !!encKey, certificateValid, keyMatches, fingerprintMatches, fingerprint, hostAllowed, encryptionSourceConfirmed,
    certificateExpires: certificate ? new Date(certificate.validTo).toISOString() : null };
  return { cert, key, encKey, status };
}
function aes(mode, key, text) {
  const cipher = mode === 'enc' ? crypto.createCipheriv('aes-256-cbc', key, IV) : crypto.createDecipheriv('aes-256-cbc', key, IV);
  return mode === 'enc' ? cipher.update(text, 'utf8', 'base64') + cipher.final('base64') : cipher.update(text, 'base64', 'utf8') + cipher.final('utf8');
}
async function send({ method, url, headers = {}, body = '', encrypt = false }) {
  const target = new URL(url);
  if (target.origin !== BASE || target.username || target.password) throw new Error('Only the SWDA UAT host is allowed.');
  const u = credentials();
  if (!u.status.ready) throw new Error('The confirmed UAT certificate and matching private key are not ready.');
  if (encrypt && !u.encKey) throw new Error('The UAT encryption key is not configured.');
  const payload = method !== 'GET' && body ? (encrypt ? aes('enc', u.encKey, body) : body) : null;
  const outgoing = { Accept: 'application/json', ...headers };
  if (payload !== null) { outgoing['Content-Type'] = 'application/json'; outgoing['Content-Length'] = Buffer.byteLength(payload); }
  const start = Date.now();
  const result = await new Promise((resolve, reject) => {
    const request = https.request({ hostname: target.hostname, port: 443, path: target.pathname + target.search, method, cert: u.cert, key: u.key, headers: outgoing, timeout: 45000 }, response => {
      let text = ''; let size = 0;
      response.on('data', chunk => { size += chunk.length; if (size > 2 * 1024 * 1024) response.destroy(new Error('UAT response exceeded the size limit.')); else text += chunk; });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, rawBody: text }));
    });
    request.on('timeout', () => request.destroy(new Error('SWDA UAT did not answer within 45 seconds.')));
    request.on('error', reject);
    if (payload !== null) request.write(payload);
    request.end();
  });
  let text = result.rawBody; let decrypted = false;
  if (u.encKey && text.trim() && !/^[\[{<]/.test(text.trim())) { try { text = aes('dec', u.encKey, text.trim()); decrypted = true; } catch { /* preserve original */ } }
  let parsed = text; try { parsed = JSON.parse(text); } catch { /* preserve original */ }
  return { status: result.status, ms: Date.now() - start, at: new Date().toISOString(), body: parsed, rawBody: result.rawBody, decrypted, encryptedRequest: encrypt ? payload : null };
}
module.exports = { BASE, credentials, aes, send };
