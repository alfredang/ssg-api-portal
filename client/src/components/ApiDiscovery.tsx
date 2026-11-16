import { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG, ALL_APIS, AUTH_LABEL, BASE_URLS } from '../catalog';
import type { ApiEntry, AuthMode } from '../catalog';
import type { AuthUser } from '../auth';
import { logout } from '../auth';

interface Props {
  user: AuthUser | null;
  onTry: (page: string) => void;
  onLogin: () => void;
  onOpenForm: () => void;
}

const SSG_APPS = [
  { id: 'App 1', name: 'Skilleto', auth: 'mTLS certificate + AES key' },
  { id: 'App 2', name: 'TMS_1', auth: 'mTLS certificate + AES key' },
  { id: 'App 3', name: 'TMS_3_NEW', auth: 'mTLS certificate + AES key' },
  { id: 'App 4', name: 'OAuth', auth: 'Client ID + secret (no certificate)' },
];

function matches(api: ApiEntry & { product: string; group: string }, terms: string[]) {
  const hay = `${api.name} ${api.path} ${api.method} ${api.version} ${api.desc} ${api.group} ${api.product} ${AUTH_LABEL[api.auth]}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export function TopBar({ user, onLogin, active, onHome, onOpenForm, onConsole }: {
  user: AuthUser | null; onLogin: () => void; active: 'discover' | 'form';
  onHome: () => void; onOpenForm: () => void; onConsole: () => void;
}) {
  return (
    <header className="pub-top">
      <button className="pub-brand" onClick={onHome}>
        <img src="/tertiary-logo.png" alt="Tertiary Infotech" />
        <span>SSG API Portal</span>
      </button>
      <nav className="pub-nav">
        <button className={active === 'discover' ? 'on' : ''} onClick={onHome}>Discover APIs</button>
        <button className={active === 'form' ? 'on' : ''} onClick={onOpenForm}>Subscription Form</button>
        <button onClick={onConsole}>API Console</button>
        <a href="https://developer.swda.gov.sg/webapp/api-discovery" target="_blank" rel="noopener noreferrer">SWDA Portal ↗</a>
      </nav>
      <div className="pub-user">
        {user ? (
          <>
            <span className="pub-user-name">{user.name || user.email}</span>
            <button className="pub-btn ghost" onClick={() => logout()}>Sign out</button>
          </>
        ) : (
          <button className="pub-btn" onClick={onLogin}>Log in</button>
        )}
      </div>
    </header>
  );
}

export default function ApiDiscovery({ user, onTry, onLogin, onOpenForm }: Props) {
  const [q, setQ] = useState('');
  const [method, setMethod] = useState<'ALL' | 'GET' | 'POST'>('ALL');
  const [auth, setAuth] = useState<'ALL' | AuthMode>('ALL');
  const [open, setOpen] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box, as on most API reference sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const terms = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);
  const filtering = terms.length > 0 || method !== 'ALL' || auth !== 'ALL';

  const visible = useMemo(() => {
    const keep = new Set(
      ALL_APIS.filter((a) => matches(a, terms) && (method === 'ALL' || a.method === method) && (auth === 'ALL' || a.auth === auth))
        .map((a) => `${a.groupId}|${a.name}`)
    );
    return CATALOG.map((p) => ({
      ...p,
      groups: p.groups
        .map((g) => ({ ...g, apis: g.apis.filter((a) => keep.has(`${g.id}|${a.name}`)) }))
        .filter((g) => g.apis.length > 0),
    })).filter((p) => p.groups.length > 0);
  }, [terms, method, auth]);

  const count = visible.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.apis.length, 0), 0);
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="pub">
      <TopBar user={user} onLogin={onLogin} active="discover" onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onOpenForm={onOpenForm} onConsole={() => onTry('course-lookup')} />

      <section className="pub-hero">
        <h1>Discover SSG APIs</h1>
        <p>Search every SSG-WSG / SWDA API we integrate with — endpoint, version and authentication — then sign in to test it live with our App 1 – App 4 credentials.</p>
        <div className="pub-search">
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search APIs — e.g. enrolment, grant, /tpg/courses, v3.0, POST"
            aria-label="Search APIs"
          />
          <kbd>/</kbd>
        </div>
        <div className="pub-filters">
          <div className="pub-chips" role="group" aria-label="HTTP method">
            {(['ALL', 'GET', 'POST'] as const).map((m) => (
              <button key={m} className={method === m ? 'on' : ''} onClick={() => setMethod(m)}>{m === 'ALL' ? 'All methods' : m}</button>
            ))}
          </div>
          <div className="pub-chips" role="group" aria-label="Authentication">
            <button className={auth === 'ALL' ? 'on' : ''} onClick={() => setAuth('ALL')}>Any auth</button>
            {(Object.keys(AUTH_LABEL) as AuthMode[]).map((a) => (
              <button key={a} className={auth === a ? 'on' : ''} onClick={() => setAuth(a)}>{AUTH_LABEL[a]}</button>
            ))}
          </div>
          <span className="pub-count">{count} of {ALL_APIS.length} APIs</span>
        </div>
      </section>

      <div className="pub-body">
        <aside className="pub-side">
          <div className="pub-side-title">Categories</div>
          {CATALOG.map((p) => {
            const vp = visible.find((v) => v.id === p.id);
            return (
              <div key={p.id} className={`pub-side-product ${vp ? '' : 'dim'}`}>
                <button className="pub-side-p" onClick={() => jump(`p-${p.id}`)}>{p.name}</button>
                {p.groups.map((g) => {
                  const n = vp?.groups.find((x) => x.id === g.id)?.apis.length ?? 0;
                  return (
                    <button key={g.id} className={`pub-side-g ${n ? '' : 'dim'}`} onClick={() => jump(`g-${g.id}`)}>
                      <span>{g.name}</span><span className="pub-side-n">{n}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div className="pub-side-title" style={{ marginTop: 20 }}>Base URLs</div>
          <div className="pub-side-note"><b>Certificate</b><code>{BASE_URLS.cert}</code></div>
          <div className="pub-side-note"><b>OAuth</b><code>{BASE_URLS.oauth}</code></div>
        </aside>

        <main className="pub-main">
          {count === 0 && (
            <div className="pub-empty">
              No API matches “{q}”. <button className="pub-link" onClick={() => { setQ(''); setMethod('ALL'); setAuth('ALL'); }}>Clear filters</button>
            </div>
          )}

          {visible.map((p) => (
            <section key={p.id} id={`p-${p.id}`} className="pub-product">
              <h2>{p.name}</h2>
              <p className="pub-product-desc">{p.desc}</p>
              {p.groups.map((g) => (
                <div key={g.id} id={`g-${g.id}`} className="pub-group">
                  <div className="pub-group-head">
                    <div>
                      <h3>{g.name}</h3>
                      <p>{g.desc}</p>
                    </div>
                    {g.docs && <a href={g.docs} target="_blank" rel="noopener noreferrer">Official docs ↗</a>}
                  </div>
                  <ul className="pub-apis">
                    {g.apis.map((a) => {
                      const key = `${g.id}|${a.name}`;
                      const isOpen = open === key;
                      return (
                        <li key={key} className={isOpen ? 'open' : ''}>
                          <button className="pub-api-row" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}>
                            <span className={`pub-method ${a.method.toLowerCase()}`}>{a.method}</span>
                            <span className="pub-api-name">{a.name}</span>
                            <code className="pub-api-path">{a.path}</code>
                            <span className="pub-api-ver">{a.version}</span>
                          </button>
                          {isOpen && (
                            <div className="pub-api-detail">
                              <p>{a.desc}</p>
                              <dl>
                                <dt>Endpoint</dt>
                                <dd><code>{a.auth === 'local' ? a.path : `${a.method} ${BASE_URLS.cert}${a.path}`}</code></dd>
                                {a.auth !== 'local' && (<><dt>Header</dt><dd><code>x-api-version: {a.version}</code></dd></>)}
                                <dt>Authentication</dt>
                                <dd>
                                  {AUTH_LABEL[a.auth]}
                                  {a.auth === 'cert+oauth' && ' — certificate (mTLS) first, OAuth on public-api as fallback'}
                                  {a.auth === 'cert+aes' && ' — mTLS, payload AES-256-CBC encrypted'}
                                </dd>
                                {a.writes && (<><dt>Note</dt><dd className="pub-warn">Writes to SSG production data. Test with care.</dd></>)}
                              </dl>
                              <button className="pub-btn" onClick={() => onTry(a.page)}>
                                {user ? 'Try it in the console →' : 'Log in to try it →'}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ))}

          {!filtering && (
            <section className="pub-product" id="p-apps">
              <h2>Our SSG apps</h2>
              <p className="pub-product-desc">The console sends each request with the SSG app you pick. Credentials stay on the server and are never shown.</p>
              <div className="pub-apps">
                {SSG_APPS.map((a) => (
                  <div key={a.id} className="pub-app">
                    <b>{a.id}</b><span>{a.name}</span><small>{a.auth}</small>
                  </div>
                ))}
              </div>
              <div className="pub-cta">
                <div>
                  <h3>Need access to another API?</h3>
                  <p>Fill in the SSG API Subscription Form with the business use case and raise a ticket on the Developer Portal.</p>
                </div>
                <button className="pub-btn" onClick={onOpenForm}>Open subscription form</button>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="pub-foot">
        <span className="powered-by">Powered by <a href="https://www.tertiaryinfotech.com/" target="_blank" rel="noopener">Tertiary Infotech Academy Pte Ltd</a></span> ·{' '}
        <a href="https://status.api.ssg-wsg.sg/" target="_blank" rel="noopener noreferrer">SSG API status</a> ·{' '}
        <a href="https://go.gov.sg/ssg-api-ticket" target="_blank" rel="noopener noreferrer">Raise an SSG ticket</a>
      </footer>
    </div>
  );
}
