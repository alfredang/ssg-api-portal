// Isolated loopback preview: serves the real UI/history, no production SSG proxy.
const express = require('express');
const path = require('node:path');
process.env.AUTH_DISABLED = 'true';
process.env.NODE_ENV = 'development';
const { configureAuth, requireAuth } = require('../server/auth');
const app = express();
app.use(express.json({ limit: '10mb' }));
configureAuth(app);
app.use('/api/admin/uat', require('../server/uat-setup-routes'));
app.use('/api/conformance/workbench', requireAuth, require('../server/api-test-workbench'));
app.use('/api/conformance/tickets/DP-15411', requireAuth, require('../server/conformance-ticket'));
app.use('/api/conformance', requireAuth, require('../server/conformance'));
app.get('/api/certs', (_req, res) => res.json({ certs: [] }));
app.get('/api/our-courses', (_req, res) => res.json({ courses: [] }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'This isolated preview exposes conformance only.' }));
app.use(express.static(path.join(__dirname, '../client/dist')));
// This explicit generated file may live under an ignored .codex-tmp release.
// Allow its parent dot-directory without exposing arbitrary dotfiles.
app.get('/{*path}', (_req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html'), { dotfiles: 'allow' }));
const port = Number(process.env.PREVIEW_PORT || 3016);
app.listen(port, '127.0.0.1', () => console.log(`Isolated conformance preview: http://127.0.0.1:${port}/console/conformance`));
