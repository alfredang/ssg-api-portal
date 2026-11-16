// Admin-only API (the one admin is fixed in users.js):
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

router.get('/users', (_req, res) => res.json({ admin: users.ADMIN_EMAIL, users: users.list() }));
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

module.exports = router;
