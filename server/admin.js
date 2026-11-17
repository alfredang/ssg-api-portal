// Admin-only API (the admins are fixed in users.js):
//   /api/admin/users           list, add, remove backend users
//   /api/admin/settings/mail   the enquiry / sign-in-code mail account and recipients
//   /api/admin/settings/mail/test   send a sample enquiry email to the admin
const express = require('express');
const { requireAdmin, getCurrentUser } = require('./auth');
const users = require('./users');
const settings = require('./settings');
const mailer = require('./mailer');

const router = express.Router();
router.use(requireAdmin);

router.get('/users', (_req, res) => res.json({ admins: users.ADMIN_EMAILS, users: users.list() }));
router.post('/users', (req, res) => {
  try { users.add(req.body?.email, getCurrentUser(req)?.email || 'admin'); res.json({ users: users.list() }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
router.delete('/users/:email', (req, res) => {
  try { users.remove(req.params.email); res.json({ users: users.list() }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/settings/mail', (_req, res) => res.json({ fields: settings.mailForAdmin(), transport: mailer.transportName() }));
router.put('/settings/mail', (req, res) => {
  settings.updateMail(req.body || {});
  res.json({ fields: settings.mailForAdmin(), transport: mailer.transportName() });
});
router.post('/settings/mail/test', async (req, res) => {
  const me = getCurrentUser(req);
  const r = await mailer.sendLeadEmail({
    at: new Date().toISOString(), source: 'contact', name: 'Test Enquiry', email: me?.email && me.email.includes('@') && !me.email.endsWith('@localhost') ? me.email : users.ADMIN_EMAIL,
    company: 'SSG API Portal (settings test)', phone: '+65 6100 0613', preferredDemo: '',
    message: 'This is a test sent from the console Settings page.\nIf you can read this, enquiry emails are working.',
  });
  res.status(r.sent ? 200 : 502).json(r);
});


// ── Certificates and keys ───────────────────────────────────────
// Details (subject, fingerprint, expiry) are listed for the admin. The values
// themselves are returned only by /certs/reveal, one at a time, and every
// reveal is written to DATA_DIR/audit.jsonl.
const fs = require('fs');
const path = require('path');
const proxy = require('./proxy');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.jsonl');
const NOTES_FILE = path.join(DATA_DIR, 'cert-notes.json');
const REVEALABLE = { certificate: 'Certificate (public)', privateKey: 'Private key', encryptionKey: 'Encryption key', signatureKey: 'Signature private key', clientId: 'Client ID', clientSecret: 'Client secret' };

const readNotes = () => { try { return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')); } catch { return {}; } };
function audit(req, action, detail) {
  const me = getCurrentUser(req);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(AUDIT_FILE, JSON.stringify({ at: new Date().toISOString(), user: me?.email || 'unknown', ip: req.ip, action, ...detail }) + '\n');
}
function readAudit(limit = 50) {
  try { return fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').slice(-limit).reverse().map((l) => JSON.parse(l)); } catch { return []; }
}

router.get('/certs', (_req, res) => {
  const notes = readNotes();
  res.json({ apps: proxy.certificateInfo().map((a) => ({ ...a, portalExpiry: notes[a.id]?.portalExpiry || '' })), audit: readAudit() });
});
router.post('/certs/reveal', (req, res) => {
  const { app, what } = req.body || {};
  if (!REVEALABLE[what]) return res.status(400).json({ error: 'Unknown item' });
  const value = proxy.revealCredential(app, what);
  if (!value) return res.status(404).json({ error: `${REVEALABLE[what]} is not set for ${app}` });
  audit(req, 'reveal', { app, what });
  res.set('Cache-Control', 'no-store').json({ app, what, label: REVEALABLE[what], value, audit: readAudit() });
});
// The expiry date the Developer Portal shows for an app (it can differ from the certificate's own date).
router.put('/certs/:app/portal-expiry', (req, res) => {
  const app = String(req.params.app);
  const date = String(req.body?.date || '');
  if (!/^app[1-4]$/.test(app) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) return res.status(400).json({ error: 'Use a date like 2027-03-31' });
  const notes = readNotes();
  notes[app] = { ...(notes[app] || {}), portalExpiry: date };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
  res.json({ ok: true });
});

module.exports = router;
