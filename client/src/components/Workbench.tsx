import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ALL_APIS, AUTH_LABEL, BASE_URLS, findGroup, conformanceOf } from '../catalog';
import type { FlatApi } from '../catalog';
import { SPECS, NO_VERSION, FILE_EXT, applyVars, authChoices, codeSample, requestPlan } from '../apiSpecs';
import type { AuthChoice, Vars } from '../apiSpecs';
import { useLang } from '../prefs';
import { useLastCall } from '../consoleStore';
import type { CallRecord } from '../consoleStore';
import { runCatalogApi } from '../api/courseApi';
import type { OurCourse, OurCourses, RunResult } from '../api/courseApi';
import { RequestSpec, CodeBlock } from './ApiSpec';
import { LangSwitch, MethodTag } from './Shell';

// The console workbench: every API test page gets the same four tabs.
//   Try it    the page's own form and formatted result
//   Spec      headers, parameters, request and response fields, links to SWDA
//   Code      curl / Python / JavaScript for the selected app and course, and a run button
//   Response  status, timing and JSON of the last call (formatted or raw)

const SWDA_DISCOVERY = 'https://developer.swda.gov.sg/webapp/api-discovery';
const APP_IDS = ['app1', 'app2', 'app3', 'app4'];
const appLabel = (id: string) => `App ${id.replace('app', '')}`;
const today = () => new Date().toISOString().slice(0, 10);

// ── JSON helpers ────────────────────────────────────────────────
interface SchemaRow { path: string; type: string; example: string }
/** Field list of a JSON value: one row per key, arrays described by their first item. */
export function schemaRows(value: unknown, prefix = '', out: SchemaRow[] = []): SchemaRow[] {
  if (out.length >= 120) return out;
  if (Array.isArray(value)) {
    out.push({ path: prefix || '(root)', type: `array (${value.length})`, example: '' });
    if (value.length) schemaRows(value[0], `${prefix}[]`, out);
  } else if (value && typeof value === 'object') {
    if (prefix) out.push({ path: prefix, type: 'object', example: '' });
    for (const [k, v] of Object.entries(value)) schemaRows(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.push({ path: prefix || '(root)', type: value === null ? 'null' : typeof value, example: String(value ?? '').slice(0, 60) });
  }
  return out;
}

/** The first array of objects in a response: the list the reader came for. */
function findList(value: unknown, depth = 0): { path: string; rows: Record<string, unknown>[] } | null {
  if (!value || typeof value !== 'object' || depth > 4) return null;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) return { path: k, rows: v as Record<string, unknown>[] };
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const hit = findList(v, depth + 1);
    if (hit) return { path: `${k}.${hit.path}`, rows: hit.rows };
  }
  return null;
}
const cell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return String(v);
  const o = v as Record<string, unknown>;
  if (typeof o.description === 'string') return o.description;
  if (typeof o.name === 'string') return o.name;
  return Array.isArray(v) ? `${v.length} item${v.length === 1 ? '' : 's'}` : '{…}';
};

function StatusPill({ status }: { status: number }) {
  const cls = status >= 200 && status < 300 ? 'ok' : status === 0 ? 'none' : status < 500 ? 'warn' : 'bad';
  return <span className={`wb-status ${cls}`}>{status === 0 ? 'No response' : `HTTP ${status}`}</span>;
}

/** Formatted view of any JSON response: summary fields, then the main list as a table. */
function Formatted({ data }: { data: unknown }) {
  if (data === null || data === undefined || data === '') return <p className="wb-hint">The response was empty.</p>;
  if (typeof data !== 'object') return <pre className="wb-plain">{String(data)}</pre>;
  const flat = schemaRows(data).filter((r) => r.type !== 'object' && !r.type.startsWith('array') && !r.path.includes('[]'));
  const list = findList(data);
  const cols = list ? [...new Set(list.rows.slice(0, 20).flatMap((r) => Object.keys(r)))].slice(0, 8) : [];
  return (
    <>
      {flat.length > 0 && (
        <dl className="wb-kv">
          {flat.slice(0, 24).map((r) => <div key={r.path}><dt>{r.path}</dt><dd>{r.example || '—'}</dd></div>)}
        </dl>
      )}
      {list && (
        <>
          <h4 className="wb-h">{list.path} <span>{list.rows.length} row{list.rows.length === 1 ? '' : 's'}</span></h4>
          <div className="wb-scroll">
            <table className="wb-table">
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{list.rows.slice(0, 50).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{cell(r[c]).slice(0, 80)}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {list.rows.length > 50 && <p className="wb-hint">Showing the first 50 rows. The raw JSON has all {list.rows.length}.</p>}
        </>
      )}
      {!flat.length && !list && <p className="wb-hint">Nothing to tabulate. See the raw JSON.</p>}
    </>
  );
}

function ResponseView({ call, page }: { call?: CallRecord; page: string }) {
  const [raw, setRaw] = useState(false);
  if (!call) return <p className="wb-hint">No call yet on this page. Run the API from <b>Try it</b> or <b>Code</b> and the response appears here.</p>;
  const json = typeof call.data === 'string' ? call.data : JSON.stringify(call.data, null, 2);
  return (
    <div className="wb-response">
      <div className="wb-resbar">
        <StatusPill status={call.status} />
        <span>{call.ms} ms</span>
        {call.app && <span>{appLabel(call.app)}</span>}
        {call.auth && <span>{call.auth === 'oauth' ? 'OAuth' : 'Certificate'}</span>}
        <span>{new Date(call.at).toLocaleTimeString('en-SG')}</span>
        <div className="spec-tabset" role="group" aria-label="Response view">
          <button className={!raw ? 'on' : ''} aria-pressed={!raw} onClick={() => setRaw(false)}>Formatted</button>
          <button className={raw ? 'on' : ''} aria-pressed={raw} onClick={() => setRaw(true)}>Raw JSON</button>
        </div>
      </div>
      <code className="wb-url">{call.method} {call.url}</code>
      {raw ? <CodeBlock code={json ?? ''} download={`${page}-response.json`} /> : <Formatted data={call.data} />}
    </div>
  );
}

function SchemaTable({ rows }: { rows: SchemaRow[] }) {
  return (
    <div className="wb-scroll">
      <table className="wb-table">
        <thead><tr><th>Field</th><th>Type</th><th>Example</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td><code>{r.path}</code></td><td>{r.type}</td><td>{r.example}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function SpecView({ api, call }: { api: FlatApi; call?: CallRecord }) {
  const spec = SPECS[api.page] ?? {};
  const group = findGroup(api.groupId);
  const aes = api.auth === 'cert+aes';
  const headers: [string, string, string][] = [
    ...(NO_VERSION.has(api.page) ? [] : [['x-api-version', api.version, 'Required. The API version.'] as [string, string, string]]),
    ...(api.method === 'POST' ? [['Content-Type', aes ? 'application/json (body is base64 AES text)' : 'application/json', 'Required for POST.'] as [string, string, string]] : []),
    ['Accept', 'application/json', 'Optional.'],
    ...(api.auth === 'cert+oauth' ? [['Authorization', 'Bearer <access token>', 'OAuth only. Not sent with a certificate.'] as [string, string, string]] : []),
    ...(spec.headers ?? []).map((h) => [h.name, h.example, h.desc] as [string, string, string]),
  ];
  const okResponse = !!call && call.status >= 200 && call.status < 300 && !!call.data && typeof call.data === 'object';
  return (
    <div className="wb-spec">
      <div className="wb-links">
        <a className="chip" href={`/docs/${api.slug}`} target="_blank" rel="noopener">Reference page ↗</a>
        <a className="chip" href={group?.docs || SWDA_DISCOVERY} target="_blank" rel="noopener noreferrer">{group?.docs ? `${api.group} on SWDA Developer Portal ↗` : 'SWDA API discovery ↗'}</a>
        <a className="chip" href={SWDA_DISCOVERY} target="_blank" rel="noopener noreferrer">All SWDA APIs ↗</a>
      </div>
      <dl className="wb-kv">
        <div><dt>Certificate URL</dt><dd><code>{BASE_URLS.cert}{api.path}</code></dd></div>
        {api.auth === 'cert+oauth' && <div><dt>OAuth URL</dt><dd><code>{BASE_URLS.oauth}{api.path}</code></dd></div>}
        <div><dt>Authentication</dt><dd>{AUTH_LABEL[api.auth]}</dd></div>
        <div><dt>Version</dt><dd>{NO_VERSION.has(api.page) ? 'Send no x-api-version header' : api.version}</dd></div>
        <div><dt>Conformance test</dt><dd>{conformanceOf(api) === 'required' ? 'Required: SSG issues a UAT test workbook for this API before production access' : conformanceOf(api) === 'none' ? 'None: SSG confirmed there is no test package' : 'Not confirmed on our tickets'}</dd></div>
        <div><dt>Changes SSG data</dt><dd>{api.writes ? 'Yes: creates, updates or cancels a live record' : 'No: read only'}</dd></div>
      </dl>
      <h4 className="wb-h">Request headers</h4>
      <div className="wb-scroll">
        <table className="wb-table">
          <thead><tr><th>Header</th><th>Value</th><th>Notes</th></tr></thead>
          <tbody>{headers.map(([n, v, d]) => <tr key={n}><td><code>{n}</code></td><td>{v}</td><td>{d}</td></tr>)}</tbody>
        </table>
      </div>
      <RequestSpec api={api} />
      {spec.body !== undefined && spec.body !== null && (<><h4 className="wb-h">Request body fields <span>from the example body</span></h4><SchemaTable rows={schemaRows(spec.body)} /></>)}
      <h4 className="wb-h">Response fields {okResponse && <span>from the last live response on this page</span>}</h4>
      {okResponse ? <SchemaTable rows={schemaRows(call!.data)} /> : <p className="wb-hint">Run the API once and the fields of the real response are listed here.</p>}
    </div>
  );
}

function CodeView({ api, vars, appId, onRan }: { api: FlatApi; vars: Vars; appId: string; onRan: () => void }) {
  const [lang] = useLang();
  const choices = authChoices(api);
  const [auth, setAuth] = useState<AuthChoice>(appId === 'app4' && choices.includes('oauth') ? 'oauth' : choices[0]);
  useEffect(() => { setAuth(appId === 'app4' && choices.includes('oauth') ? 'oauth' : choices[0]); }, [appId, api.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState('');
  const [runs, setRuns] = useState<RunResult[]>([]);
  const code = applyVars(codeSample(api, lang, auth), vars);
  const request = () => ({ slug: api.slug, auth, ...requestPlan(api, vars) });

  const runOne = async () => { setBusy('one'); setRuns([await runCatalogApi(request())]); setBusy(''); onRan(); };
  const runAll = async () => {
    setBusy('all');
    const results: RunResult[] = [];
    for (const id of APP_IDS) { results.push(await runCatalogApi({ ...request(), auth: id === 'app4' ? 'oauth' : auth }, id)); setRuns([...results]); }
    setBusy('');
  };

  return (
    <div className="wb-code">
      <div className="wb-codebar">
        <LangSwitch />
        {choices.length > 1 && (
          <div className="spec-tabset" role="group" aria-label="Authentication">
            {choices.map((c) => <button key={c} className={auth === c ? 'on' : ''} aria-pressed={auth === c} onClick={() => setAuth(c)}>{c === 'cert' ? 'Certificate' : 'OAuth'}</button>)}
          </div>
        )}
      </div>
      <CodeBlock code={code} download={`${api.slug}.${FILE_EXT[lang]}`} />
      <p className="wb-hint">
        Written for <b>{appLabel(appId)}</b>, UEN <b>{vars.uen}</b> and course <b>{vars.refNo}</b>. The script reads the certificate from <code>{vars.cert}</code> and <code>{vars.key}</code>,
        and secrets from <code>SSG_ENCRYPTION_KEY</code>, <code>SSG_CLIENT_ID</code> and <code>SSG_CLIENT_SECRET</code>. The admin can view the real values under Certificates &amp; Keys.
      </p>
      {api.writes ? (
        <p className="wb-warn">This API changes live SSG data, so it is not run from here. Use the form on <b>Try it</b>.</p>
      ) : (
        <>
          <div className="wb-actions">
            <button className="admin-btn" disabled={!!busy} onClick={runOne}>{busy === 'one' ? 'Running…' : `Run this request on ${appLabel(appId)}`}</button>
            <button className="admin-btn ghost" disabled={!!busy} onClick={runAll}>{busy === 'all' ? 'Running…' : 'Run on App 1 to 4'}</button>
            <span className="wb-hint">Runs the same request on our server with the app’s real credentials.</span>
          </div>
          {runs.length > 0 && (
            <div className="wb-scroll">
              <table className="wb-table">
                <thead><tr><th>App</th><th>Auth</th><th>Result</th><th>Time</th><th>Note</th></tr></thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.app}>
                      <td><b>{appLabel(r.app)}</b></td>
                      <td>{r.auth === 'oauth' ? 'OAuth' : 'Certificate'}</td>
                      <td><StatusPill status={r.status} /></td>
                      <td>{r.ms} ms</td>
                      <td>{r.error || (r.status === 403 ? 'Not subscribed, or version not allowed, for this app' : r.status >= 200 && r.status < 300 ? (r.decrypted ? 'OK, response decrypted' : 'OK') : cell((r.data as Record<string, unknown> | undefined)?.error ?? '') || '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {runs.length === 1 && <p className="wb-hint">The JSON is on the <b>Response</b> tab.</p>}
        </>
      )}
    </div>
  );
}

/** For catalogue APIs that have no hand-built form: edit the documented request and run it. */
function GenericTry({ api, vars, appId, onRan }: { api: FlatApi; vars: Vars; appId: string; onRan: () => void }) {
  const plan = useMemo(() => requestPlan(api, vars), [api, vars]);
  const [path, setPath] = useState(plan.path);
  const [query, setQuery] = useState(JSON.stringify(plan.query, null, 2));
  const [body, setBody] = useState(plan.body === undefined ? '' : JSON.stringify(plan.body, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choices = authChoices(api);
  const run = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    let q: Record<string, string>; let b: unknown;
    try { q = query.trim() ? JSON.parse(query) : {}; b = body.trim() ? JSON.parse(body) : undefined; }
    catch { setError('The query and body must be valid JSON.'); return; }
    setBusy(true);
    const r = await runCatalogApi({ slug: api.slug, auth: appId === 'app4' && choices.includes('oauth') ? 'oauth' : choices[0], path, query: q, headers: plan.headers, body: b });
    setBusy(false);
    if (r.error && r.status === 0) setError(r.error); else onRan();
  };
  return (
    <form className="course-result wb-generic" onSubmit={run}>
      <h2 className="page-title">{api.name}</h2>
      <p className="wb-hint">{api.desc}</p>
      {api.writes ? <p className="wb-warn">This API changes live SSG data and has no test form yet.</p> : (
        <>
          <label>Path<input value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} /></label>
          {Object.keys(plan.query).length > 0 && <label>Query (JSON)<textarea rows={4} value={query} onChange={(e) => setQuery(e.target.value)} spellCheck={false} /></label>}
          {api.method === 'POST' && <label>Body (JSON)<textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} /></label>}
          {error && <div className="error-alert">{error}</div>}
          <div className="wb-actions"><button type="submit" className="admin-btn" disabled={busy}>{busy ? 'Running…' : `Run on ${appLabel(appId)}`}</button></div>
        </>
      )}
    </form>
  );
}

type Tab = 'try' | 'spec' | 'code' | 'response';

export default function Workbench({ page, vars, appId, children }: { page: string; vars: Vars; appId: string; children: ReactNode | null }) {
  const apis = useMemo(() => ALL_APIS.filter((a) => a.page === page && a.auth !== 'local'), [page]);
  const [tab, setTab] = useState<Tab>('try');
  const [pick, setPick] = useState(0);
  const call = useLastCall(page);
  const seen = useRef(0);
  useEffect(() => { setTab('try'); setPick(0); }, [page]);
  const fresh = !!call && call.at !== seen.current && tab !== 'response';

  if (apis.length === 0) return <>{children}</>;
  const api = apis[Math.min(pick, apis.length - 1)];
  const go = (t: Tab) => { if (t === 'response' && call) seen.current = call.at; setTab(t); };
  const tabs: [Tab, string][] = [['try', 'Try it'], ['spec', 'Spec'], ['code', 'Code'], ['response', 'Response']];

  return (
    <div className="wb">
      <div className="wb-head">
        <div className="wb-endpoint">
          <MethodTag method={api.method} />
          <code>{api.path}</code>
          <span className="console-spec-ver">{NO_VERSION.has(api.page) ? 'no version header' : api.version}</span>
          <span className="console-spec-ver">{AUTH_LABEL[api.auth]}</span>
          {api.writes && <span className="wb-write">Changes live SSG data</span>}
          {conformanceOf(api) === 'required' && <span className="wb-conf" title="SSG sends a UAT test workbook for this API and asks for the completed results before production access.">Conformance test required</span>}
        </div>
        {apis.length > 1 && (
          <label className="wb-pick">This page calls
            <select value={pick} onChange={(e) => setPick(Number(e.target.value))}>{apis.map((a, i) => <option key={a.slug} value={i}>{a.name}</option>)}</select>
          </label>
        )}
      </div>
      <div className="wb-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => go(id)}>
            {label}
            {id === 'response' && call && <i className={`wb-dot ${call.status >= 200 && call.status < 300 ? 'ok' : 'bad'} ${fresh ? 'new' : ''}`} aria-label={`last call returned ${call.status}`} />}
          </button>
        ))}
      </div>
      {/* The form stays mounted so its values and result survive a look at another tab. */}
      <div className="wb-panel" hidden={tab !== 'try'}>
        {children ?? <GenericTry api={api} vars={vars} appId={appId} onRan={() => go('response')} />}
        {call && (
          <button className="wb-last" onClick={() => go('response')}>
            <StatusPill status={call.status} /> Last call took {call.ms} ms on {appLabel(call.app || appId)}. <b>View the JSON →</b>
          </button>
        )}
      </div>
      {tab === 'spec' && <div className="wb-panel"><SpecView api={api} call={call} /></div>}
      {tab === 'code' && <div className="wb-panel"><CodeView api={api} vars={vars} appId={appId} onRan={() => go('response')} /></div>}
      {tab === 'response' && <div className="wb-panel"><ResponseView call={call} page={page} /></div>}
    </div>
  );
}

// ── Course picker and our-courses page ──────────────────────────
export const fundState = (c: OurCourse): 'funded' | 'soon' | 'expired' | 'none' => {
  if (!c.fundEnd) return 'none';
  if (c.fundEnd < today()) return 'expired';
  const soon = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  return c.fundEnd <= soon ? 'soon' : 'funded';
};
const FUND_LABEL = { funded: 'Funded', soon: 'Ends within 90 days', expired: 'Funding ended', none: 'No funding period' };
const fmt = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
/** Courses offered in pickers: active WSQ courses with funding still running, newest first. */
export const pickable = (list: OurCourse[]) => list.filter((c) => c.active && c.wsq && c.fundEnd && c.fundEnd >= today());

/** Bar above every test page: which app, which of our courses. */
export function ContextBar({ apps, appId, onApp, courses, courseRef, onCourse }: {
  apps: { id: string; name: string }[]; appId: string; onApp: (id: string) => void;
  courses: OurCourses | null; courseRef: string; onCourse: (ref: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const list = courses ? pickable(courses.courses) : [];
  const current = courses?.courses.find((c) => c.ref === courseRef);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = list.filter((c) => terms.every((t) => `${c.ref} ${c.title}`.toLowerCase().includes(t))).slice(0, 40);
  return (
    <div className="ctx">
      <div className="ctx-apps" role="group" aria-label="SSG app">
        <span className="ctx-label">App</span>
        {APP_IDS.map((id) => {
          const a = apps.find((x) => x.id === id);
          return <button key={id} className={appId === id ? 'on' : ''} aria-pressed={appId === id} disabled={!a} title={a ? a.name : `${appLabel(id)} is not configured`} onClick={() => onApp(id)}>{id.replace('app', '')}</button>;
        })}
        <span className="ctx-appname">{apps.find((x) => x.id === appId)?.name ?? ''}</span>
      </div>
      <div className="ctx-course" ref={box}>
        <span className="ctx-label">Course</span>
        <button className="ctx-coursebtn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
          <b>{courseRef || 'Choose a course'}</b>
          <span>{current ? current.title : courses && !courses.courses.length ? (courses.refreshing ? 'Loading our courses from SSG…' : 'Course list not loaded') : courseRef ? 'Not in our course list' : ''}</span>
          {current && <i className={`fund ${fundState(current)}`}>{current.fundEnd ? `Funded to ${fmt(current.fundEnd)}` : FUND_LABEL.none}</i>}
        </button>
        {open && (
          <div className="ctx-pop">
            <input autoFocus type="search" placeholder={`Search ${list.length} funded WSQ courses by title or code…`} value={q} onChange={(e) => setQ(e.target.value)} />
            <ul role="listbox">
              {hits.map((c) => (
                <li key={c.ref}><button role="option" aria-selected={c.ref === courseRef} onClick={() => { onCourse(c.ref); setOpen(false); setQ(''); }}><b>{c.title}</b><span>{c.ref} · funded to {fmt(c.fundEnd)}</span></button></li>
              ))}
              {hits.length === 0 && <li className="ctx-empty">{list.length ? 'No course matches.' : courses?.refreshing ? 'Loading our courses from SSG. This takes about a minute the first time.' : 'No funded WSQ course found.'}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function OurCoursesPage({ data, onRefresh, onUse }: { data: OurCourses | null; onRefresh: () => void; onUse: (ref: string, page: string) => void }) {
  const [q, setQ] = useState('');
  const [wsqOnly, setWsqOnly] = useState(true);
  const [fundedOnly, setFundedOnly] = useState(true);
  const all = data?.courses ?? [];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = all
    .filter((c) => (!wsqOnly || c.wsq) && (!fundedOnly || (c.active && !!c.fundEnd && c.fundEnd >= today())))
    .filter((c) => terms.every((t) => `${c.ref} ${c.title}`.toLowerCase().includes(t)))
    .sort((a, b) => (a.fundEnd || '9999').localeCompare(b.fundEnd || '9999') || a.title.localeCompare(b.title));
  const soon = all.filter((c) => c.wsq && c.active && fundState(c) === 'soon').length;
  const csv = () => {
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const text = ['Course Title,Course Ref Code,Funding Start,Funding End,WSQ,Active', ...rows.map((c) => [c.title, c.ref, c.fundStart, c.fundEnd, c.wsq ? 'Yes' : 'No', c.active ? 'Yes' : 'No'].map(esc).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = `our-wsq-courses-${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <h2 className="page-title">Our WSQ Funded Courses</h2>
      <p className="admin-lead">
        Our courses as SSG holds them, read from the course registry with UEN {data?.uen ?? ''}. The funding validity period is the course fee grant period on the registry record.
        {data?.fetchedAt && <> Last read {new Date(data.fetchedAt).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}.</>}
      </p>
      {data?.error && <div className="error-alert">Could not refresh from SSG: {data.error}</div>}
      {data?.refreshing && <div className="admin-status warn">Reading our courses from SSG. The first read takes about a minute; this page updates by itself.</div>}
      {soon > 0 && <div className="admin-status warn"><b>{soon}</b> funded WSQ course{soon === 1 ? '' : 's'} reach the end of the funding period within 90 days.</div>}
      <div className="oc-bar">
        <input type="search" placeholder="Search by title or reference code…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search our courses" />
        <label><input type="checkbox" checked={wsqOnly} onChange={(e) => setWsqOnly(e.target.checked)} /> WSQ only</label>
        <label><input type="checkbox" checked={fundedOnly} onChange={(e) => setFundedOnly(e.target.checked)} /> Currently funded</label>
        <span className="oc-count">{rows.length} of {all.length}</span>
        <button className="admin-btn ghost" onClick={csv} disabled={!rows.length}>Download CSV</button>
        <button className="admin-btn ghost" onClick={onRefresh} disabled={data?.refreshing}>{data?.refreshing ? 'Refreshing…' : 'Refresh from SSG'}</button>
      </div>
      <div className="admin-card admin-table-wrap">
        <table className="admin-table oc-table">
          <thead><tr><th>Course Title</th><th>Course Ref Code</th><th>Funding Validity Period</th><th>Status</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {rows.slice(0, 400).map((c) => (
              <tr key={c.ref}>
                <td className="oc-title">{c.title}{!c.wsq && <span className="admin-role member">Non-WSQ</span>}</td>
                <td><code>{c.ref}</code></td>
                <td>{c.fundStart || c.fundEnd ? <>{fmt(c.fundStart)} – {fmt(c.fundEnd)}</> : '—'}</td>
                <td><span className={`fund ${c.active ? fundState(c) : 'expired'}`}>{c.active ? FUND_LABEL[fundState(c)] : 'Inactive'}</span></td>
                <td className="oc-actions">
                  <button className="admin-link" onClick={() => onUse(c.ref, 'course-lookup')}>Test with this course</button>
                  <a href={`https://www.myskillsfuture.gov.sg/content/portal/en/training-exchange/course-directory/course-detail.html?courseReferenceNumber=${encodeURIComponent(c.ref)}`} target="_blank" rel="noopener noreferrer">MySkillsFuture ↗</a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="admin-muted">{all.length ? 'No course matches.' : data?.refreshing ? 'Loading…' : 'No courses loaded yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
