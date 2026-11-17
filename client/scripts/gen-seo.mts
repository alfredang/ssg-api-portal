// Runs after `vite build`: writes dist/seo.json (per-URL tags the server injects
// into index.html), dist/sitemap.xml and dist/robots.txt from src/seo.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allSeo, SITE } from '../src/seo.ts';
import { ALL_APIS } from '../src/catalog.ts';
import { SPECS, NO_VERSION } from '../src/apiSpecs.ts';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const pages = allSeo();
const today = new Date().toISOString().slice(0, 10);

fs.writeFileSync(path.join(dist, 'seo.json'), JSON.stringify(Object.fromEntries(pages.map((p) => [p.path, p]))));
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map((p) => `  <url><loc>${SITE}${p.path === '/' ? '/' : p.path}</loc><lastmod>${today}</lastmod><priority>${p.path === '/' ? '1.0' : p.path.split('/').length === 2 ? '0.8' : '0.6'}</priority></url>`).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /console\nDisallow: /api/\nDisallow: /auth/\n\nSitemap: ${SITE}/sitemap.xml\n`);
// The catalogue the server's request runner (POST /api/run) checks every call against.
fs.writeFileSync(path.join(dist, 'api-catalog.json'), JSON.stringify(ALL_APIS.filter((a) => a.auth !== 'local').map((a) => ({
  slug: a.slug, page: a.page, method: a.method, path: a.path, version: a.version, auth: a.auth, writes: !!a.writes,
  noVersion: NO_VERSION.has(a.page), aesRequest: a.auth === 'cert+aes', aesResponse: !!SPECS[a.page]?.encryptedResponse,
  headers: (SPECS[a.page]?.headers ?? []).map((h) => h.name),
}))));
console.log(`seo: ${pages.length} pages -> seo.json, sitemap.xml, robots.txt`);
