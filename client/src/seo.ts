// SEO metadata for every public page. One source used three ways:
//   - in the browser (useSeo sets title / description / canonical as you navigate),
//   - at build time (scripts/gen-seo.mts writes dist/seo.json, sitemap.xml, robots.txt),
//   - on the server (server/index.js injects the tags into index.html per URL).
// Target phrases: SSG API, SWDA API, TPG process, TPG claim process,
// SWDA enrolment (enrollment) process, SkillsFuture API.
import { CATALOG, ALL_APIS, AUTH_LABEL } from './catalog';
import { TPG_STEPS } from './tpgSteps';

export const SITE = 'https://ssgapi.tertiaryinfotech.com';
export const SITE_NAME = 'SSG API Portal';
const BRAND = 'SSG API Portal by Tertiary Infotech Academy';

export interface Seo { path: string; title: string; description: string; keywords: string; noindex?: boolean }

const clip = (s: string, n = 158) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const CORE = 'SSG API, SWDA API, SkillsFuture API, SSG-WSG API, Training Partners Gateway';

const STATIC: Seo[] = [
  { path: '/', title: 'SSG API & SWDA API: getting started, API reference and TPG process', keywords: `${CORE}, SSG API documentation, SSG API examples, TPG process, SSG API getting started`,
    description: 'SSG API and SWDA API for training providers: get started with certificates and OAuth, browse every API with curl, Python and JavaScript examples, and follow the TPG process step by step.' },
  { path: '/api-reference', title: 'SSG API & SWDA API Reference: curl, Python, JavaScript examples', keywords: `${CORE}, SSG API reference, SSG API documentation, SSG API examples, SSG API Python, SSG API curl`,
    description: 'SSG API and SWDA API reference for training providers: every endpoint with its spec and working curl, Python and JavaScript examples. Enrolment, grants, course runs, assessments.' },
  { path: '/start', title: 'Getting started with the SSG API (SWDA API): certificate, OAuth, AES', keywords: `${CORE}, SSG API authentication, SSG API mTLS certificate, SSG API OAuth token, SSG API AES encryption`,
    description: 'How to call the SSG API / SWDA API: Developer Portal app, base URLs, mTLS certificate calls, OAuth token, AES-256 payload encryption and status codes, with code in curl, Python and JavaScript.' },
  { path: '/guides/create-keys', title: 'Create SSG API certificate and encryption keys on Mac and Windows', keywords: `${CORE}, SSG API certificate, SSG API encryption key, SSG API PEM, openssl self-signed certificate Windows, SSG API private key`,
    description: 'Step by step: create the SSG API / SWDA API certificate, private key, AES-256 encryption key and signature key pair with OpenSSL on macOS and Windows, then add them to the Developer Portal.' },
  { path: '/guides/api-subscription', title: 'SSG API subscription process: from Developer Portal app to production', keywords: `${CORE}, SSG API subscription process, SWDA API subscription, SSG API access, SSG API conformance test, SSG Developer Portal ticket`,
    description: 'The SSG API / SWDA API subscription process in eight stages: Developer Portal app, certificate, subscription form, ticket, clarifications, UAT conformance tests, production approval and go-live.' },
  { path: '/tpg-process', title: 'TPG Process: Training Partners Gateway steps for training providers', keywords: 'TPG process, TPGateway, Training Partners Gateway, TPG claim process, SWDA enrolment process, SWDA enrollment process, TPG course run, TPG attendance, SSG API',
    description: 'The TPG process step by step: course applications and runs, the SWDA enrolment process, attendance, assessments, grants, the TPG claim process, refunds and e-certificates, with the SSG APIs for each.' },
  { path: '/subscription-form', title: 'SWDA / SSG API Subscription Form (v1.12): fill in and download as Word', keywords: `${CORE}, SSG API subscription form, SSG API access request, SSG Developer Portal ticket`,
    description: 'Fill in the API Subscription Form for SWDA / SSG APIs (v1.12) online and download it as a Word document, ready to attach to your Developer Portal ticket.' },
  { path: '/ssg-api-services', title: 'AI-Powered TMS with SSG API Integration, Singapore', keywords: `${CORE}, AI TMS Singapore, AI-powered training management system, TMS with SSG API integration, LMS TMS Singapore, SSG API integration services`,
    description: 'An AI-powered TMS and LMS for Singapore training providers with SSG API integration built in: course runs, enrolment, attendance, assessments, grants and claims. Book a free demo.' },
  { path: '/contact', title: 'Contact us: SSG API and SWDA API integration help', keywords: `${CORE}, contact Tertiary Infotech Academy, SSG API consultant Singapore`,
    description: 'Talk to Tertiary Infotech Academy about SSG API / SWDA API integration, TMS and LMS development and TPGateway automation. Singapore-based; we reply within one business day.' },
];

export function allSeo(): Seo[] {
  const groups = CATALOG.flatMap((p) => p.groups.map((g) => ({
    path: `/category/${g.id}`,
    title: `${g.name} API: SSG API / SWDA API endpoints and examples`,
    description: clip(`${g.name} SSG API / SWDA API: ${g.desc} ${g.apis.length} endpoints with request specs and curl, Python and JavaScript examples.`),
    keywords: `SSG ${g.name} API, SWDA ${g.name} API, ${CORE}`,
  })));
  const apis = ALL_APIS.map((a) => ({
    path: `/docs/${a.slug}`,
    title: a.auth === 'local' ? `${a.name} for SSG API apps: openssl, Python, JavaScript` : `${a.name} API: SSG / SWDA API ${a.method} ${a.path}`,
    description: clip(a.auth === 'local'
      ? `${a.desc} How to do it with openssl, Python or JavaScript when setting up an SSG API / SWDA API app.`
      : `${a.name}: SSG API / SWDA API ${a.method} ${a.path}${/^v/.test(a.version) ? ` (${a.version})` : ''}, ${AUTH_LABEL[a.auth]}. ${a.desc} Request spec and curl, Python and JavaScript examples.`),
    keywords: `${a.name} API, SSG ${a.group} API, SWDA ${a.group} API, ${CORE}`,
  }));
  const steps = TPG_STEPS.map((s) => ({
    path: `/tpg-process/${s.slug}`,
    title: `${s.seoTitle} | TPG process step ${s.id}`,
    description: clip(`${s.seoTitle.split(':')[0]} on the Training Partners Gateway (TPGateway): ${s.desc} Step-by-step guide for training providers, with the SSG / SWDA APIs that automate it.`),
    keywords: `${s.seoTitle.split(':')[0]}, TPG ${s.title}, SWDA ${s.title}, TPG process, TPGateway, Training Partners Gateway, SSG API, SWDA API${s.slug === 'trainee-enrolment' ? ', SWDA enrollment process, SSG enrolment API' : ''}${s.slug === 'claims' ? ', SkillsFuture claim, SSG claim process' : ''}`,
  }));
  return [...STATIC, ...groups, ...apis, ...steps].map((s) => ({ ...s, title: `${s.title} | ${s.path === '/' ? BRAND : SITE_NAME}` }));
}

const BY_PATH = new Map(allSeo().map((s) => [s.path, s]));

export function seoFor(pathname: string): Seo {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path.startsWith('/console')) return { path, title: `API Console | ${SITE_NAME}`, description: 'Sign in to test SSG APIs live.', keywords: '', noindex: true };
  // numeric TPG step URLs share the slug page's metadata
  const m = path.match(/^\/tpg-process\/(\d+)$/);
  if (m) { const s = TPG_STEPS.find((x) => x.id === Number(m[1])); if (s) return BY_PATH.get(`/tpg-process/${s.slug}`)!; }
  return BY_PATH.get(path) ?? { ...BY_PATH.get('/')!, path, noindex: true };
}

/** Browser side: keep <head> in step with the current page. */
export function applySeo(pathname: string) {
  const seo = seoFor(pathname);
  document.title = seo.title;
  const set = (sel: string, attr: string, val: string, make: () => HTMLElement) => {
    let el = document.head.querySelector<HTMLElement>(sel);
    if (!el) { el = make(); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };
  const meta = (name: string, content: string, prop = false) => set(`meta[${prop ? 'property' : 'name'}="${name}"]`, 'content', content, () => {
    const m = document.createElement('meta'); m.setAttribute(prop ? 'property' : 'name', name); return m;
  });
  const url = SITE + (seo.path === '/' ? '/' : seo.path);
  meta('description', seo.description);
  meta('keywords', seo.keywords);
  meta('robots', seo.noindex ? 'noindex, nofollow' : 'index, follow');
  meta('og:title', seo.title, true); meta('og:description', seo.description, true); meta('og:url', url, true);
  meta('twitter:title', seo.title); meta('twitter:description', seo.description);
  set('link[rel="canonical"]', 'href', url, () => { const l = document.createElement('link'); l.rel = 'canonical'; return l; });
}
