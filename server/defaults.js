// ─────────────────────────────────────────────────────────────────
// Per-user form defaults — file-backed (replaces Firestore
// `userDefaults/{uid}`). Keyed by the authenticated user's id, or the
// fixed "local" user when login is disabled (localhost).
// ─────────────────────────────────────────────────────────────────
const express = require('express');
const { requireAuth, getCurrentUser } = require('./auth');
const { getDefaults, saveDefaults } = require('./store');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const data = await getDefaults(user.id);
    res.json(data);
  } catch (err) {
    console.error('[defaults] read failed', err);
    res.status(500).json({ error: 'Failed to load defaults' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    await saveDefaults(user.id, data);
    res.json(data);
  } catch (err) {
    console.error('[defaults] save failed', err);
    res.status(500).json({ error: 'Failed to save defaults' });
  }
});

module.exports = router;
