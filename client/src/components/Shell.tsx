import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CATALOG, ALL_APIS, AUTH_LABEL } from '../catalog';
import type { FlatApi } from '../catalog';
import type { AuthUser } from '../auth';
import { logout } from '../auth';
import { useLang, LANGS } from '../prefs';
import { navigate, usePath } from '../router';

// Shell shared by every public page: top bar (nav, language switch, search),
// command palette, and the docs layout with its persistent API sidebar.
// Navigation is plain hash links, so every page has a shareable URL.

export type Section = 'home' | 'docs' | 'start' | 'tpg' | 'form' | 'services' | 'contact';

const go = (path: string) => navigate(path);

export function matchApi(a: FlatApi, terms: string[]) {
  const hay = `${a.name} ${a.path} ${a.method} ${a.version} ${a.desc} ${a.group} ${a.product} ${AUTH_LABEL[a.auth]}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export function MethodTag({ method }: { method: string }) {
  return <span className={`pub-method ${method.toLowerCase()}`}>{method}</span>;
}

/** curl / Python / JavaScript switch. One choice applies to every example on the site. */
export function LangSwitch({ compact }: { compact?: boolean }) {
  const [lang, setLang] = useLang();
  return (
    <div className={`spec-tabset ${compact ? 'compact' : ''}`} role="group" aria-label="Example language">
      {LANGS.map((l) => (
        <button key={l.id} aria-pressed={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>{l.label}</button>
      ))}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const pages = [
    { label: 'Getting started', hint: 'Base URLs, authentication, AES', hash: '/start' },
    { label: 'Create certificate and encryption keys', hint: 'Mac and Windows', hash: '/guides/create-keys' },
    { label: 'SSG API subscription process', hint: 'App to production access', hash: '/guides/api-subscription' },
    { label: 'How certificates and encryption work', hint: 'Animated walk-through', hash: '/guides/how-it-works' },
    { label: 'SSG API status and error codes', hint: '200, 3xx, 4xx, 5xx', hash: '/guides/error-codes' },
    { label: 'SSG API integration services', hint: 'We do it for you', hash: '/ssg-api-services' },
    { label: 'Contact us', hint: 'Demo, quote, questions', hash: '/contact' },
    { label: 'TPG Process', hint: '13 TPGateway steps', hash: '/tpg-process' },
    { label: 'Subscription Form', hint: 'Request access to an API', hash: '/subscription-form' },
    { label: 'API Console', hint: 'Test live (sign-in)', hash: '/console/course-lookup' },
  ].filter((p) => terms.every((t) => `${p.label} ${p.hint}`.toLowerCase().includes(t)));
  const apis = ALL_APIS.filter((a) => matchApi(a, terms)).slice(0, 30);
  type Item = { key: string; hash: string; api?: FlatApi; page?: { label: string; hint: string } };
  const items: Item[] = [...apis.map((a) => ({ key: a.slug, hash: `/docs/${a.slug}`, api: a })), ...pages.map((p) => ({ key: p.hash, hash: p.hash, page: p }))];

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  const open = (hash: string) => { go(hash); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && items[sel]) open(items[sel].hash);
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="pal-back" onMouseDown={onClose}>
      <div className="pal" role="dialog" aria-label="Search APIs" onMouseDown={(e) => e.stopPropagation()}>
        <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Search APIs by name, path, version or method…" aria-label="Search" />
        <ul ref={listRef}>
          {items.length === 0 && <li className="pal-empty">Nothing matches “{q}”.</li>}
          {items.map((it, i) => (
            <li key={it.key}>
              <button className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={() => open(it.hash)}>
                {it.api ? (
                  <><MethodTag method={it.api.method} /><span className="pal-name">{it.api.name}</span><code>{it.api.path}</code><small>{it.api.group}</small></>
                ) : (
                  <><span className="pal-page">Page</span><span className="pal-name">{it.page!.label}</span><small>{it.page!.hint}</small></>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="pal-foot"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Enter</kbd> open <kbd>Esc</kbd> close</div>
      </div>
    </div>
  );
}

export function TopBar({ user, active, onMenu }: { user: AuthUser | null; active: Section; onMenu?: () => void }) {
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);

  // Close the mobile menu after navigating.
  const path = usePath();
  useEffect(() => { setMenu(false); }, [path]);

  // "/" or Ctrl/Cmd-K opens search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const link = (section: Section, hash: string, label: string) => (
    <a href={hash} className={active === section ? 'on' : ''} aria-current={active === section ? 'page' : undefined}>{label}</a>
  );

  return (
    <header className="pub-top">
      <a className="pub-brand" href="/">
        <img src="/tertiary-logo.png" alt="Tertiary Infotech" />
        <span>SSG API Portal</span>
      </a>
      <nav className={`pub-nav ${menu ? 'open' : ''}`} aria-label="Main">
        {link('start', '/start', 'Getting Started')}
        {link('docs', '/api-reference', 'API Reference')}
        {link('tpg', '/tpg-process', 'TPG Processes')}
        {link('form', '/subscription-form', 'API Subscription Form')}
        {link('services', '/ssg-api-services', 'Services')}
        {link('contact', '/contact', 'Contact')}
      </nav>
      <button className="pub-searchbtn" onClick={() => setPalette(true)} aria-label="Search APIs">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>Search APIs…</span><kbd>/</kbd>
      </button>
      <div className="pub-user">
        {user ? (
          <>
            <a className="pub-btn" href="/console/course-lookup">API Console</a>
            <button className="pub-btn ghost" onClick={() => logout()}>Sign out</button>
          </>
        ) : (
          <a className="pub-btn" href="/console/course-lookup">API Console</a>
        )}
      </div>
      <button className="pub-menu" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>{menu ? '✕' : '☰'}</button>
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      {onMenu && (
        <button className="pub-apis-btn" onClick={onMenu}>
          <span aria-hidden="true">☰</span> Browse all APIs
        </button>
      )}
    </header>
  );
}

/** Left navigation listing every API by category, with a filter. */
function DocsSidebar({ currentSlug, currentGroup, currentGuide, onNavigate }: { currentSlug?: string; currentGroup?: string; currentGuide?: string; onNavigate: () => void }) {
  const [q, setQ] = useState('');
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const activeGroup = currentGroup ?? ALL_APIS.find((a) => a.slug === currentSlug)?.groupId;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(activeGroup ? [activeGroup] : []));

  useEffect(() => { if (activeGroup) setOpenGroups((s) => (s.has(activeGroup) ? s : new Set(s).add(activeGroup))); }, [activeGroup]);

  const tree = useMemo(() => CATALOG.map((p) => ({
    ...p,
    groups: p.groups.map((g) => ({ ...g, apis: ALL_APIS.filter((a) => a.groupId === g.id && matchApi(a, terms)) })).filter((g) => g.apis.length > 0),
  })).filter((p) => p.groups.length > 0), [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setOpenGroups((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <nav className="docs-side" aria-label="APIs">
      <input type="search" className="docs-filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter APIs…" aria-label="Filter APIs" />
      <a className={`docs-top ${!currentSlug && !currentGroup && !currentGuide ? 'on' : ''}`} href="/api-reference" onClick={onNavigate}>All APIs</a>
      {terms.length === 0 && (
        <div className="docs-product">
          <div className="docs-product-name">Guides</div>
          <ul className="docs-guides">
            <li><a href="/start" className={currentGuide === 'start' ? 'on' : ''} onClick={onNavigate}>Getting started</a></li>
            <li><a href="/guides/how-it-works" className={currentGuide === 'how-it-works' ? 'on' : ''} onClick={onNavigate}>How certificates and encryption work</a></li>
            <li><a href="/guides/create-keys" className={currentGuide === 'create-keys' ? 'on' : ''} onClick={onNavigate}>Create certificate and keys</a></li>
            <li><a href="/guides/api-subscription" className={currentGuide === 'api-subscription' ? 'on' : ''} onClick={onNavigate}>API subscription process</a></li>
            <li><a href="/guides/error-codes" className={currentGuide === 'error-codes' ? 'on' : ''} onClick={onNavigate}>Status and error codes</a></li>
          </ul>
        </div>
      )}
      {tree.length === 0 && <div className="docs-none">No API matches “{q}”.</div>}
      {tree.map((p) => (
        <div key={p.id} className="docs-product">
          <div className="docs-product-name">{p.name}</div>
          {p.groups.map((g) => {
            const isOpen = terms.length > 0 || openGroups.has(g.id);
            return (
              <div key={g.id}>
                <button className={`docs-group ${g.id === activeGroup ? 'cur' : ''}`} onClick={() => toggle(g.id)} aria-expanded={isOpen}>
                  <span>{g.name}</span><span className="docs-count">{g.apis.length}</span>
                </button>
                {isOpen && (
                  <ul>
                    {g.apis.map((a) => (
                      <li key={a.slug}>
                        <a href={`/docs/${a.slug}`} className={a.slug === currentSlug ? 'on' : ''} aria-current={a.slug === currentSlug ? 'page' : undefined} onClick={onNavigate}>
                          <span className={`docs-dot ${a.method.toLowerCase()}`}>{a.method === 'GET' ? 'GET' : 'POST'}</span>
                          <span>{a.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Top bar + API sidebar + content. Used by the reference pages. */
export function DocsLayout({ user, section = 'docs', currentSlug, currentGroup, currentGuide, children }: {
  user: AuthUser | null; section?: Section; currentSlug?: string; currentGroup?: string; currentGuide?: string; children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="pub">
      <TopBar user={user} active={section} onMenu={() => setDrawer(true)} />
      <div className="docs">
        <div className={`docs-side-wrap ${drawer ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}>
          <DocsSidebar currentSlug={currentSlug} currentGroup={currentGroup} currentGuide={currentGuide} onNavigate={() => setDrawer(false)} />
        </div>
        <main className="docs-main">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="site-foot-in">
        <div className="site-foot-brand">
          <a href="/" className="pub-brand"><img src="/tertiary-logo.png" alt="" /><span>SSG API Portal</span></a>
          <p>SSG API and SWDA API reference, TPG process guides and integration help for Singapore training providers.</p>
        </div>
        <nav aria-label="Reference">
          <b>Reference</b>
          <a href="/api-reference">SSG API reference</a>
          <a href="/start">Getting started</a>
          <a href="/guides/create-keys">Create SSG API keys</a>
          <a href="/guides/api-subscription">API subscription process</a>
          <a href="/guides/how-it-works">How certificates and encryption work</a>
          <a href="/guides/error-codes">SSG API error codes</a>
          <a href="/category/enrolments">Enrolment API</a>
          <a href="/category/grant-calculator">Grant API</a>
          <a href="/category/training-providers">Course run API</a>
        </nav>
        <nav aria-label="TPG process">
          <b>TPG process</b>
          <a href="/tpg-process">All 13 steps</a>
          <a href="/tpg-process/trainee-enrolment">SWDA enrolment process</a>
          <a href="/tpg-process/claims">TPG claim process</a>
          <a href="/tpg-process/course-runs">TPG course runs</a>
          <a href="/subscription-form">API subscription form</a>
        </nav>
        <nav aria-label="Company">
          <b>Company</b>
          <a href="/ssg-api-services">SSG API integration services</a>
          <a href="/contact">Contact us</a>
          <a href="https://www.tertiaryinfotech.com/" target="_blank" rel="noopener">Tertiary Infotech Academy ↗</a>
          <a href="https://developer.swda.gov.sg/webapp/api-discovery" target="_blank" rel="noopener noreferrer">SWDA Developer Portal ↗</a>
          <a href="https://status.api.ssg-wsg.sg/" target="_blank" rel="noopener noreferrer">SSG API status ↗</a>
        </nav>
      </div>
      <div className="site-foot-bar">
        <p className="powered-by">Powered by <a href="https://www.tertiaryinfotech.com/" target="_blank" rel="noopener">Tertiary Infotech Academy Pte Ltd</a></p>
        <p>© {new Date().getFullYear()} Tertiary Infotech Academy Pte Ltd · UEN 201200696W · Not an official SSG / SWDA website</p>
      </div>
    </footer>
  );
}
