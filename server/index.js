require('dotenv').config();
const express = require('express');
const path = require('path');
const proxyRoutes = require('./proxy');
const { configureAuth, requireAuth } = require('./auth');
const defaultsRoutes = require('./defaults');
const leads = require('./leads');
const fs = require('fs');

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

// Enquiries: public POST /lead, staff-only GET /api/leads.
app.use(leads.publicRouter);
app.use('/api/leads', leads.adminRouter);

// Admin-only: backend users and settings.
app.use('/api/admin', require('./admin'));

// SSG API proxy routes (certificate/mTLS + OAuth fallback).
// These call SSG with our App 1-4 credentials, so they require a signed-in
// user. The public API catalogue is static and needs no API access.
app.use('/api', requireAuth, proxyRoutes);

// In production, serve the built React app
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../client/dist');
  app.use(express.static(dist, { index: false }));

  // Per-URL SEO: dist/seo.json (built from client/src/seo.ts) holds the title,
  // description and keywords of every public page. They are written into the
  // HTML shell here, so crawlers and link previews get the right tags without
  // running JavaScript.
  const SITE = 'https://ssgapi.tertiaryinfotech.com';
  const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  let seo = {};
  try { seo = JSON.parse(fs.readFileSync(path.join(dist, 'seo.json'), 'utf8')); } catch { console.warn('[seo] dist/seo.json missing; pages use the default tags'); }
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const OLD_TPG = /^\/tpg-process\/(\d+)$/;

  function render(pathname) {
    const p = pathname.replace(/\/+$/, '') || '/';
    const meta = seo[p];
    const isConsole = p.startsWith('/console');
    const m = meta || seo['/'] || { title: 'SSG API Portal', description: '', keywords: '' };
    const url = SITE + (meta ? (p === '/' ? '/' : p) : '/');
    const tags = [
      `<title>${esc(isConsole ? 'API Console | SSG API Portal' : m.title)}</title>`,
      `<meta name="description" content="${esc(m.description)}" />`,
      m.keywords ? `<meta name="keywords" content="${esc(m.keywords)}" />` : '',
      `<meta name="robots" content="${meta && !isConsole ? 'index, follow' : 'noindex, nofollow'}" />`,
      `<link rel="canonical" href="${esc(url)}" />`,
      `<meta property="og:title" content="${esc(m.title)}" />`,
      `<meta property="og:description" content="${esc(m.description)}" />`,
      `<meta property="og:url" content="${esc(url)}" />`,
      `<meta name="twitter:title" content="${esc(m.title)}" />`,
      `<meta name="twitter:description" content="${esc(m.description)}" />`,
    ].filter(Boolean).join('\n    ');
    return { html: shell.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, tags), known: !!meta || isConsole };
  }

  app.get('/{*path}', (req, res) => {
    // A missing file (script, image, PDF) must be a 404, not the app shell:
    // returning HTML for it breaks the page silently, e.g. during a rolling deploy.
    if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found');
    // Old numbered TPG step URLs redirect to their keyword URL.
    const old = req.path.match(OLD_TPG);
    if (old) {
      const hit = Object.keys(seo).filter((k) => k.startsWith('/tpg-process/'))[Number(old[1]) - 1];
      if (hit) return res.redirect(301, hit);
    }
    const page = render(req.path);
    // The shell must always be re-fetched so it never points at a removed bundle.
    res.set('Cache-Control', 'no-cache');
    res.status(page.known ? 200 : 404).type('html').send(page.html);
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
