// Shared UAT transport. No credential values are returned to the browser.
const fs = require('node:fs');
const crypto = require('node:crypto');
const https = require('node:https');
const BASE = 'https://uat-api.ssg-wsg.sg';
const IV = Buffer.from('SSGAPIInitVector');
const settings = require('./uat-settings');

function source(name) {
  try {
    const value = process.env[`${name}_FILE`] ? fs.readFileSync(process.env[`${name}_FILE`], 'utf8') : process.env[name];
    return value?.replace(/\\n/g, '\n').trim();
  } catch { return undefined; }
}
function credentials() {
  let saved; let configurationError;
  try { saved = settings.read(); } catch (e) { configurationError = e.message; }
  const cert = saved?.certificate || (!configurationError ? source('UAT_CERT') : undefined);
  const key = saved?.privateKey || (!configurationError ? source('UAT_KEY') : undefined);
  const encoded = saved?.encryptionKey || (!configurationError ? source('UAT_ENCRYPTION_KEY') : undefined);
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
  const expectedFingerprint = settings.fingerprint(process.env.UAT_EXPECTED_CERT_SHA256) || saved?.expectedFingerprint || '';
  const fingerprintMatches = !!fingerprint && fingerprint === expectedFingerprint;
  const hostAllowed = !process.env.UAT_API_BASE || process.env.UAT_API_BASE.replace(/\/+$/, '') === BASE;
  const encryptionKeySource = saved ? `swda-${saved.keyReplyDate}` : !configurationError ? process.env.UAT_ENCRYPTION_KEY_SOURCE?.trim() : '';
  const encryptionSourceConfirmed = !!encryptionKeySource;
  const status = { base: BASE, ready: !!(certificateValid && keyMatches && fingerprintMatches && hostAllowed && !configurationError), hasCertificate: !!cert, hasPrivateKey: !!key,
    hasEncryptionKey: !!encKey, certificateValid, keyMatches, fingerprintMatches, fingerprint, hostAllowed, encryptionSourceConfirmed,
    certificateExpires: certificate ? new Date(certificate.validTo).toISOString() : null,
    configurationError: configurationError || null, profileSource: saved ? 'Saved UAT settings' : configurationError ? 'Saved settings unavailable' : 'Hosting UAT configuration' };
  return { cert, key, encKey, status, expectedFingerprint, encryptionKeySource, revision: saved?.revision || '' };
}
function aes(mode, key, text) {
  const cipher = mode === 'enc' ? crypto.createCipheriv('aes-256-cbc', key, IV) : crypto.createDecipheriv('aes-256-cbc', key, IV);
  return mode === 'enc' ? cipher.update(text, 'utf8', 'base64') + cipher.final('base64') : cipher.update(text, 'base64', 'utf8') + cipher.final('utf8');
}
function readiness({ auth = 'uat-mtls', encrypt = false } = {}) {
  const u = credentials(); const missing = [];
  if (u.status.configurationError && (auth === 'uat-mtls' || encrypt || process.env.UAT_OAUTH_USE_MTLS === 'true')) missing.push(u.status.configurationError);
  if (!u.status.hostAllowed) missing.push('SWDA UAT host configuration');
  if (auth === 'uat-mtls' || process.env.UAT_OAUTH_USE_MTLS === 'true') {
    if (!u.status.hasCertificate) missing.push('UAT certificate');
    if (!u.status.keyMatches) missing.push('Matching UAT private key');
    if (!u.status.certificateValid) missing.push('Valid UAT certificate dates');
    if (!u.status.fingerprintMatches) missing.push('Confirmed UAT certificate fingerprint');
  }
  if (auth === 'uat-oauth') {
    let validTokenURL = false; try { const t = new URL(process.env.UAT_OAUTH_TOKEN_URL); validTokenURL = t.origin === BASE && !t.username && !t.password; } catch { /* missing */ }
    if (!validTokenURL || !source('UAT_OAUTH_CLIENT_ID') || !source('UAT_OAUTH_CLIENT_SECRET')) missing.push('UAT OAuth client and token URL');
  }
  if (encrypt) {
    if (!u.encKey) missing.push('32-byte UAT encryption key');
    if (!u.status.encryptionSourceConfirmed) missing.push('Verified UAT encryption key source');
  }
  return { ...u.status, missing, auth, encrypt, ready: !missing.length };
}
function version() {
  const u = credentials();
  return crypto.createHash('sha256').update(JSON.stringify([u.cert, u.key, u.encKey?.toString('base64'), u.expectedFingerprint, u.encryptionKeySource, u.revision, process.env.UAT_API_BASE, source('UAT_OAUTH_CLIENT_ID'), source('UAT_OAUTH_CLIENT_SECRET'), process.env.UAT_OAUTH_TOKEN_URL, process.env.UAT_OAUTH_USE_MTLS])).digest('hex');
}
let tokenCache;
async function oauthToken(u) {
  const key = version();
  if (tokenCache?.key === key && tokenCache.until > Date.now()) return tokenCache.token;
  const target = new URL(process.env.UAT_OAUTH_TOKEN_URL);
  if (target.origin !== BASE || target.username || target.password) throw new Error('Configure an OAuth token URL on the approved UAT host.');
  const text = 'grant_type=client_credentials';
  const basic = Buffer.from(`${source('UAT_OAUTH_CLIENT_ID')}:${source('UAT_OAUTH_CLIENT_SECRET')}`).toString('base64');
  const result = await new Promise((resolve, reject) => {
    const r = https.request({ hostname: target.hostname, port: 443, path: target.pathname + target.search, method: 'POST', timeout: 30000,
      ...(process.env.UAT_OAUTH_USE_MTLS === 'true' ? { cert: u.cert, key: u.key } : {}),
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(text) } }, response => {
      let data = ''; response.on('data', c => { data += c; if (data.length > 100000) response.destroy(new Error('OAuth response too large.')); }); response.on('error', reject); response.on('end', () => resolve({ status: response.statusCode, data }));
    });
    r.on('error', reject); r.on('timeout', () => r.destroy(new Error('OAuth request timed out.'))); r.end(text);
  });
  let parsed; try { parsed = JSON.parse(result.data); } catch { throw new Error('UAT OAuth returned an unreadable token response.'); }
  if (result.status !== 200 || typeof parsed.access_token !== 'string') throw new Error('UAT OAuth did not return an access token.');
  tokenCache = { key, token: parsed.access_token, until: Date.now() + Math.max(0, Math.min(Number(parsed.expires_in) || 300, 3600) - 30) * 1000 };
  return tokenCache.token;
}
async function send({ method, url, headers = {}, body = '', encrypt = false, auth = 'uat-mtls', contentType = 'application/json' }) {
  const target = new URL(url);
  if (target.origin !== BASE || target.username || target.password) throw new Error('Only the SWDA UAT host is allowed.');
  const u = credentials();
  const state = readiness({ auth, encrypt });
  if (!state.ready) throw new Error('The selected UAT credential profile is not ready.');
  const payload = method !== 'GET' && body ? (encrypt ? aes('enc', u.encKey, body) : body) : null;
  const outgoing = { Accept: 'application/json', ...headers };
  if (auth === 'uat-oauth') outgoing.Authorization = `Bearer ${await oauthToken(u)}`;
  if (payload !== null) { outgoing['Content-Type'] = encrypt ? 'application/json' : contentType; outgoing['Content-Length'] = Buffer.byteLength(payload); }
  const start = Date.now();
  const result = await new Promise((resolve, reject) => {
    const request = https.request({ hostname: target.hostname, port: 443, path: target.pathname + target.search, method, ...(auth === 'uat-mtls' || process.env.UAT_OAUTH_USE_MTLS === 'true' ? { cert: u.cert, key: u.key } : {}), headers: outgoing, timeout: 45000 }, response => {
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
module.exports = { BASE, credentials, readiness, version, aes, send };
