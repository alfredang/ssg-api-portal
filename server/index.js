require('dotenv').config();
const express = require('express');
const path = require('path');
const proxyRoutes = require('./proxy');
const { configureAuth, requireAuth } = require('./auth');
const defaultsRoutes = require('./defaults');

const app = express();

// Behind Coolify's reverse proxy — required for secure cookies / correct protocol.
app.set('trust proxy', 1);

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Sessions + Google OAuth (no-op login on localhost). Mounts /auth/* and /api/me.
configureAuth(app);

// Per-user defaults (file-backed). Mounted BEFORE the SSG proxy so it isn't
// swallowed by the catch-all proxy routes.
app.use('/api/defaults', defaultsRoutes);

// SSG API proxy routes (certificate/mTLS + OAuth fallback).
// These call SSG with our App 1-4 credentials, so they require a signed-in
// user. The public API catalogue is static and needs no API access.
app.use('/api', requireAuth, proxyRoutes);

// In production, serve the built React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

module.exports = app;

// Start server only when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
