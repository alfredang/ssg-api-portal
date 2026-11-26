// Admin settings, kept on the server and edited in the console (Settings page),
// the way ai-cms keeps its credentials in Settings rather than in env files.
// Currently: the enquiry-email configuration (recipients and the mail account).
//
// Stored in DATA_DIR/settings.enc, encrypted with AES-256-GCM using a key
// derived from SESSION_SECRET. Secret fields are never sent back to the
// browser: the API returns only whether each one is set.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = require('./data-directory').dataDirectory();
const FILE = path.join(DATA_DIR, 'settings.enc');
const KEY = crypto.scryptSync(process.env.SESSION_SECRET || 'dev-insecure-secret-change-me', 'ssg-api-portal-settings', 32);

// name -> secret?  (names match the env variables, which remain the fallback)
const MAIL_FIELDS = {
  LEAD_EMAIL_TO: false, LEAD_REPLY_TO: false, LEAD_AUTOREPLY: false, EMAIL_FROM_LEADS: false,
  GMAIL_USER: false, GMAIL_CLIENT_ID: false, GMAIL_CLIENT_SECRET: true, GMAIL_REFRESH_TOKEN: true,
  RESEND_API_KEY: true,
  SMTP_HOST: false, SMTP_PORT: false, SMTP_SECURE: false, SMTP_USER: false, SMTP_PASS: true,
};

let cache = null;
function load() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(FILE);
    const iv = raw.subarray(0, 12); const tag = raw.subarray(12, 28); const data = raw.subarray(28);
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv); d.setAuthTag(tag);
    cache = JSON.parse(Buffer.concat([d.update(data), d.final()]).toString('utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error('Saved settings cannot be decrypted. Keep the original data folder and server session secret; settings will not be overwritten.');
    cache = { mail: {} };
  }
  return cache;
}
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([c.update(JSON.stringify(cache), 'utf8'), c.final()]);
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, Buffer.concat([iv, c.getAuthTag(), data]), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

/** Effective mail configuration: saved settings first, then environment variables. */
function mailConfig() {
  const saved = load().mail || {};
  const out = {};
  for (const k of Object.keys(MAIL_FIELDS)) out[k] = saved[k] || process.env[k] || '';
  return out;
}

/** What the admin page shows: plain values, and for secrets only whether one is set. */
function mailForAdmin() {
  const saved = load().mail || {};
  const fields = {};
  for (const [k, secret] of Object.entries(MAIL_FIELDS)) {
    const fromSaved = !!saved[k]; const fromEnv = !fromSaved && !!process.env[k];
    fields[k] = secret
      ? { secret: true, set: fromSaved || fromEnv, source: fromSaved ? 'settings' : fromEnv ? 'environment' : null }
      : { secret: false, value: saved[k] || '', envValue: fromEnv ? process.env[k] : '', source: fromSaved ? 'settings' : fromEnv ? 'environment' : null };
  }
  return fields;
}

/** Save changes. A secret left blank is unchanged; send null to clear any field. */
function updateMail(patch) {
  const s = load(); s.mail = s.mail || {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (!(k in MAIL_FIELDS)) continue;
    if (v === null) { delete s.mail[k]; continue; }
    const val = String(v).replace(/[\r\n]/g, '').trim().slice(0, 4000);
    if (val === '' && MAIL_FIELDS[k]) continue;        // blank secret = keep
    if (val === '') delete s.mail[k]; else s.mail[k] = val;
  }
  save();
}

module.exports = { mailConfig, mailForAdmin, updateMail, MAIL_FIELDS };
