const express = require('express');
const { requireAdmin, getCurrentUser } = require('./auth');
const storage = require('./portal-storage');
const backup = require('./portal-data-backup');
const router = express.Router();
router.use(requireAdmin);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/', async (_req, res, next) => { try { res.json(await storage.status()); } catch (e) { next(e); } });
router.post('/verification', async (_req, res, next) => { try { res.json(await storage.armVerification()); } catch (e) { next(e); } });
router.post('/backup', async (req, res, next) => {
  try { res.attachment('portal-data-encrypted-backup.json').json(await backup.create(getCurrentUser(req)?.email || 'Local operator')); }
  catch (e) { next(e); }
});
router.use((err, _req, res, _next) => res.status(400).json({ error: err.code ? 'The portal data folder is unavailable. Check its attachment and permissions.' : err.message }));
module.exports = router;
