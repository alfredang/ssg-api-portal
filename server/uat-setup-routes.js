const express = require('express');
const { requireAdmin, getCurrentUser } = require('./auth');
const settings = require('./uat-settings');
const uat = require('./uat');
const runner = require('./api-test-runner');
const router = express.Router();
router.use(requireAdmin);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
function status() {
  let saved; let error;
  try { saved = settings.read(); } catch (e) { error = e.message; }
  return { canSave: settings.canSave(), hasSaved: !!saved, savedAt: saved?.savedAt || null, savedBy: saved?.savedBy || null, error,
    expectedFingerprint: settings.fingerprint(process.env.UAT_EXPECTED_CERT_SHA256) || saved?.expectedFingerprint || settings.DEFAULT_FINGERPRINT,
    keyReplyDate: saved?.keyReplyDate || '2026-11-24', source: error ? 'Saved settings unavailable' : saved ? 'Saved UAT settings' : 'Hosting UAT configuration',
    readiness: uat.readiness({ auth: 'uat-mtls', encrypt: true }) };
}
router.get('/', (_req, res, next) => { try { res.json(status()); } catch (e) { next(e); } });
router.use((req, res, next) => { if (!req.is('application/json')) return res.status(415).json({ error: 'Send UAT setup as JSON from the portal form.' }); next(); });
router.post('/validate', (req, res) => res.json(settings.validate(req.body)));
router.post('/', (req, res, next) => {
  runner.serial(() => { const saved = settings.save(req.body, getCurrentUser(req)?.email || 'Local operator'); res.json({ saved: true, ...status(), validation: saved.validation }); }).catch(next);
});
router.use((err, _req, res, _next) => res.status(400).json({ error: err.code ? 'Encrypted UAT settings could not be saved. Check the data-folder permissions.' : err.message,
  ...(err.validation ? { validation: err.validation } : {}) }));
module.exports = router;
