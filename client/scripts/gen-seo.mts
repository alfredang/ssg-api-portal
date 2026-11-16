// Runs after `vite build`: writes dist/seo.json (per-URL tags the server injects
// into index.html), dist/sitemap.xml and dist/robots.txt from src/seo.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allSeo, SITE } from '../src/seo.ts';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const pages = allSeo();
const today = new Date().toISOString().slice(0, 10);

fs.writeFileSync(path.join(dist, 'seo.json'), JSON.stringify(Object.fromEntries(pages.map((p) => [p.path, p]))));
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map((p) => `  <url><loc>${SITE}${p.path === '/' ? '/' : p.path}</loc><lastmod>${today}</lastmod><priority>${p.path === '/' ? '1.0' : p.path.split('/').length === 2 ? '0.8' : '0.6'}</priority></url>`).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /console\nDisallow: /api/\nDisallow: /auth/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`seo: ${pages.length} pages -> seo.json, sitemap.xml, robots.txt`);
