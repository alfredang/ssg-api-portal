import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../auth';
import { ALL_APIS, CATALOG } from '../catalog';
import { TPG_STEPS } from '../tpgSteps';
import { TopBar, Footer } from './Shell';

// Home page: animated hero, then the three ways into the site
// (Get Started, API Reference, TPG Processes). Everything is drawn here;
// there are no images.

type Lang = 'curl' | 'python' | 'javascript';
const LANGS: { id: Lang; label: string }[] = [{ id: 'curl', label: 'curl' }, { id: 'python', label: 'Python' }, { id: 'javascript', label: 'JavaScript' }];

// One real call (Course Lookup by Reference Number, OAuth) in three languages.
// k = keyword, s = string, c = comment, plain text otherwise.
type Tok = [kind: 'k' | 's' | 'c' | 't', text: string];
const SAMPLE: Record<Lang, Tok[][]> = {
  curl: [
    [['c', '# Look up a course by its reference number']],
    [['k', 'curl '], ['s', 'https://public-api.ssg-wsg.sg/courses/directory/TGS-2020513213'], ['t', ' \\']],
    [['t', '  -H '], ['s', '"Authorization: Bearer $TOKEN"'], ['t', ' \\']],
    [['t', '  -H '], ['s', '"x-api-version: v1.2"']],
  ],
  python: [
    [['k', 'import '], ['t', 'requests']],
    [['t', 'r = requests.get(']],
    [['t', '    '], ['s', '"https://public-api.ssg-wsg.sg/courses/directory/TGS-2020513213"'], ['t', ',']],
    [['t', '    headers={'], ['s', '"Authorization"'], ['t', ': '], ['s', 'f"Bearer {token}"'], ['t', ', '], ['s', '"x-api-version"'], ['t', ': '], ['s', '"v1.2"'], ['t', '})']],
  ],
  javascript: [
    [['k', 'const '], ['t', 'res = '], ['k', 'await '], ['t', 'fetch(']],
    [['t', '  '], ['s', "'https://public-api.ssg-wsg.sg/courses/directory/TGS-2020513213'"], ['t', ',']],
    [['t', '  { headers: { Authorization: '], ['s', '`Bearer ${token}`'], ['t', ', '], ['s', "'x-api-version'"], ['t', ': '], ['s', "'v1.2'"], ['t', ' } },']],
    [['t', ');']],
  ],
};

function HeroCode() {
  const [lang, setLang] = useState<Lang>('curl');
  const [paused, setPaused] = useState(false);

  // Cycle the three languages unless the reader is using the card or prefers no motion.
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setLang((l) => LANGS[(LANGS.findIndex((x) => x.id === l) + 1) % LANGS.length].id), 5200);
    return () => window.clearTimeout(t);
  }, [lang, paused]);

  return (
    <div className="lp-code" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="lp-code-bar">
        <span className="lp-dots" aria-hidden="true"><i /><i /><i /></span>
        <div className="lp-code-tabs" role="tablist" aria-label="Example language">
          {LANGS.map((l) => (
            <button key={l.id} role="tab" aria-selected={l.id === lang} className={l.id === lang ? 'on' : ''} onClick={() => setLang(l.id)}>{l.label}</button>
          ))}
        </div>
      </div>
      <pre className="lp-code-body" key={lang} aria-label={`Course lookup request in ${lang}`}>
        {SAMPLE[lang].map((line, i) => (
          <span key={i} className="lp-line" style={{ animationDelay: `${i * 0.22}s` }}>
            {line.map(([kind, text], j) => <span key={j} className={`tk-${kind}`}>{text}</span>)}{'\n'}
          </span>
        ))}
      </pre>
      <div className="lp-code-res" key={`r-${lang}`}>
        <span className="lp-status"><i aria-hidden="true" />200 OK</span>
        <code>{'{ "data": { "courses": [ { "referenceNumber": "TGS-2020513213", … } ] } }'}</code>
      </div>
    </div>
  );
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default function Landing({ user }: { user: AuthUser | null }) {
  const apiCount = ALL_APIS.filter((a) => a.auth !== 'local').length;
  const groupCount = CATALOG.reduce((n, p) => n + p.groups.length, 0);

  const blocks = [
    {
      id: 'start', title: 'Get Started', href: '/start', cta: 'Start in five minutes',
      text: 'From nothing to your first successful call: Developer Portal app, certificate, OAuth token and AES encryption.',
      links: [['Getting started', '/start'], ['Create certificate and keys (Mac, Windows)', '/guides/create-keys'], ['API subscription process', '/guides/api-subscription']],
      icon: <Icon><path d="M24 6c7 4 10 11 10 19l-4 5H18l-4-5c0-8 3-15 10-19z" /><circle cx="24" cy="20" r="3.5" /><path d="M18 30l-5 4 1 6 6-4M30 30l5 4-1 6-6-4M21 38l3 4 3-4" /></Icon>,
    },
    {
      id: 'ref', title: 'API Reference', href: '/api-reference', cta: `Browse ${apiCount} APIs`,
      text: `Every SSG / SWDA API in ${groupCount} categories, each with its request spec and a working curl, Python and JavaScript example.`,
      links: [['Enrolment APIs', '/category/enrolments'], ['Course run APIs', '/category/training-providers'], ['Grant APIs', '/category/grant-calculator']],
      icon: <Icon><rect x="6" y="9" width="36" height="30" rx="5" /><path d="M6 17h36M18 24l-5 5 5 5M30 24l5 5-5 5M26 23l-4 12" /></Icon>,
    },
    {
      id: 'tpg', title: 'TPG Processes', href: '/tpg-process', cta: `See all ${TPG_STEPS.length} steps`,
      text: 'The Training Partners Gateway step by step, from course runs to claims and e-certificates, with the API that automates each one.',
      links: [['SWDA enrolment process', '/tpg-process/trainee-enrolment'], ['TPG claim process', '/tpg-process/claims'], ['Course runs', '/tpg-process/course-runs']],
      icon: <Icon><rect x="5" y="8" width="13" height="10" rx="3" /><rect x="30" y="8" width="13" height="10" rx="3" /><rect x="17.5" y="30" width="13" height="10" rx="3" /><path d="M18 13h12M36.5 18v6a4 4 0 0 1-4 4H30.5M11.5 18v6a4 4 0 0 0 4 4h2" /></Icon>,
    },
  ];

  return (
    <div className="pub">
      <TopBar user={user} active="home" />
      <main className="lp">
        <section className="lp-hero">
          <div className="lp-bg" aria-hidden="true"><i className="o1" /><i className="o2" /><i className="o3" /><i className="grid" /></div>
          <div className="lp-hero-in">
            <div className="lp-copy">
              <span className="lp-kicker"><i aria-hidden="true" />For Singapore training providers and TMS developers</span>
              <h1>The <em>SSG API</em> and <em>SWDA API</em>, with code that works.</h1>
              <p>Specs, working examples and the TPG process in one place, written by a team that runs these APIs in production every day.</p>
              <div className="lp-cta">
                <a className="pub-btn lp-btn" href="/start">Get started →</a>
                <a className="pub-btn ghost lp-btn" href="/api-reference">Browse the API reference</a>
              </div>
              <ul className="lp-stats">
                <li><b>{apiCount}</b><span>APIs documented</span></li>
                <li><b>3</b><span>languages per API</span></li>
                <li><b>{TPG_STEPS.length}</b><span>TPG steps mapped</span></li>
              </ul>
            </div>
            <HeroCode />
          </div>
        </section>

        <section className="lp-blocks" aria-label="Where to go">
          {blocks.map((b, i) => (
            <article key={b.id} className={`lp-block b-${b.id}`} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
              <a className="lp-block-head" href={b.href}>
                <span className="lp-icon">{b.icon}</span>
                <h2>{b.title}</h2>
              </a>
              <p>{b.text}</p>
              <ul>{b.links.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
              <a className="lp-block-cta" href={b.href}>{b.cta} <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </section>

        <section className="lp-band">
          <div>
            <h2>Want it built for you?</h2>
            <p>We build AI-powered and custom TMS with the SSG API integrated, and connect the API to Excel, Google Sheets, n8n, Python or React.</p>
          </div>
          <div className="lp-band-cta">
            <a className="pub-btn lp-btn" href="/ssg-api-services">See our services</a>
            <a className="pub-btn ghost lp-btn" href="/contact">Contact us</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
