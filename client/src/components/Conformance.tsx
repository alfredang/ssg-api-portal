import { useEffect, useMemo, useState } from 'react';
import { ALL_APIS, CONFORMANCE } from '../catalog';

// Conformance test runner (console). SSG sends a UAT test workbook for some
// APIs; this page reads it, lets the tester complete and run each step against
// SSG's UAT environment, and writes the results back into the same workbook.
// The workbook and results stay in this browser tab; the server stores nothing.

interface Step {
  row: number; id: string; title: string; description: string; expected: string;
  method: string; url: string; version: string; body: string; expectedStatus: number; todo: string[]; encrypt: boolean; existing: string;
}
interface Sheet {
  name: string; scenario: string; cols: { actual: string; status: string | null; comment: string | null };
  yesNo: boolean; executedByCell: string | null; executionDateCell: string | null; steps: Step[];
}
interface Edit { method: string; url: string; version: string; headers: string; body: string; encrypt: boolean }
interface Result { status: number; ms: number; at: string; body: unknown; error?: string; decrypted?: boolean; pass: boolean; comment: string }
interface Status { ready: boolean; hasEncryptionKey: boolean; certificateExpires: string | null; base: string }

const keyOf = (sheet: string, row: number) => `${sheet}|${row}`;
const placeholders = (e: Edit) => [...new Set([...(e.url + '\n' + e.body).matchAll(/<[^<>\n"]{3,90}>|\{[A-Za-z][\w ]*\}/g)].map((m) => m[0]))];
const pretty = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const sgTime = (iso: string) => new Date(iso).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Singapore' });
const innerStatus = (body: unknown) => (body && typeof body === 'object' ? Number((body as Record<string, unknown>).status) || null : null);
const save = (name: string, blob: Blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export default function ConformancePage({ tester: defaultTester }: { tester: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [file, setFile] = useState<{ name: string; b64: string } | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [active, setActive] = useState(0);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tester, setTester] = useState(defaultTester);
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }));

  useEffect(() => { fetch('/api/conformance/status', { credentials: 'include' }).then((r) => r.json()).then(setStatus).catch(() => setStatus(null)); }, []);

  const required = useMemo(() => ALL_APIS.filter((a) => CONFORMANCE[a.page] === 'required'), []);
  const done = Object.keys(results).length;
  const total = sheets.reduce((n, s) => n + s.steps.length, 0);

  const open = async (f: File) => {
    setError(''); setBusy('parse');
    try {
      const b64 = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = () => reject(new Error('Could not read the file')); r.readAsDataURL(f); });
      const d = await post<{ sheets: Sheet[] }>('/api/conformance/parse', { file: b64 });
      const start: Record<string, Edit> = {};
      for (const s of d.sheets) for (const st of s.steps) start[keyOf(s.name, st.row)] = { method: st.method, url: st.url, version: st.version, headers: '', body: st.body, encrypt: st.encrypt };
      setFile({ name: f.name, b64 }); setSheets(d.sheets); setEdits(start); setResults({}); setActive(0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not read the workbook'); }
    setBusy('');
  };

  const run = async (sheet: Sheet, st: Step): Promise<void> => {
    const k = keyOf(sheet.name, st.row); const e = edits[k];
    let extra: Record<string, string> = {};
    if (e.headers.trim()) { try { extra = JSON.parse(e.headers); } catch { setError(`${st.id}: the extra headers must be JSON, for example {"uen": "201200696W"}`); return; } }
    setBusy(k); setError('');
    try {
      const r = await post<Omit<Result, 'pass' | 'comment'>>('/api/conformance/run', { method: e.method, url: e.url, headers: { ...(e.version ? { 'x-api-version': e.version } : {}), ...extra }, body: e.body, encrypt: e.encrypt });
      const got = innerStatus(r.body) ?? r.status;
      setResults((prev) => ({ ...prev, [k]: { ...r, pass: r.status !== 0 && (r.status === st.expectedStatus || got === st.expectedStatus), comment: prev[k]?.comment ?? '' } }));
    } catch (err) { setError(`${st.id}: ${err instanceof Error ? err.message : 'failed'}`); }
    setBusy('');
  };
  const runSheet = async (sheet: Sheet) => { for (const st of sheet.steps) if (!placeholders(edits[keyOf(sheet.name, st.row)]).length) await run(sheet, st); };

  const fills = () => {
    const out: { sheet: string; cell: string; value: string }[] = [];
    for (const s of sheets) {
      let any = false;
      for (const st of s.steps) {
        const r = results[keyOf(s.name, st.row)];
        if (!r) continue;
        any = true;
        out.push({ sheet: s.name, cell: `${s.cols.actual}${st.row}`, value: `HTTP ${r.status || 'no response'} at ${sgTime(r.at)} (Singapore time)\n${r.error ? r.error : pretty(r.body)}` });
        if (s.cols.status) out.push({ sheet: s.name, cell: `${s.cols.status}${st.row}`, value: s.yesNo ? (r.pass ? 'Yes' : 'No') : (r.pass ? 'Pass' : 'Fail') });
        if (s.cols.comment && r.comment.trim()) out.push({ sheet: s.name, cell: `${s.cols.comment}${st.row}`, value: r.comment.trim() });
      }
      if (any && s.executedByCell && tester.trim()) out.push({ sheet: s.name, cell: s.executedByCell, value: tester.trim() });
      if (any && s.executionDateCell && date.trim()) out.push({ sheet: s.name, cell: s.executionDateCell, value: date.trim() });
    }
    return out;
  };
  const download = async () => {
    if (!file) return;
    setBusy('export'); setError('');
    try {
      const res = await fetch('/api/conformance/export', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: file.b64, fills: fills() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Export failed (${res.status})`);
      save(file.name.replace(/\.(xlsx?|XLSX?)$/, '') + ' (completed).xlsx', await res.blob());
    } catch (err) { setError(err instanceof Error ? err.message : 'Export failed'); }
    setBusy('');
  };
  const evidence = () => {
    const log = sheets.flatMap((s) => s.steps.filter((st) => results[keyOf(s.name, st.row)]).map((st) => { const k = keyOf(s.name, st.row); const r = results[k]; const e = edits[k]; return { sheet: s.name, testCase: st.id, title: st.title, executedAt: r.at, executedBy: tester, request: { method: e.method, url: e.url, 'x-api-version': e.version, encrypted: e.encrypt, body: e.body }, response: { status: r.status, ms: r.ms, body: r.body, error: r.error }, expectedStatus: st.expectedStatus, result: r.pass ? 'Pass' : 'Fail', comment: r.comment }; }));
    save(`${file?.name.replace(/\.\w+$/, '') ?? 'conformance'} - evidence.json`, new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }));
  };

  const sheet = sheets[active];
  const setEdit = (k: string, patch: Partial<Edit>) => setEdits((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
  const setResult = (k: string, patch: Partial<Result>) => setResults((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  return (
    <>
      <h2 className="page-title">Conformance Tests</h2>
      <p className="admin-lead">Upload the test workbook SSG sent for an API. The page reads every test step, you complete the values SSG leaves to the tester, run each step on SSG’s UAT environment, and download the same workbook with the actual results filled in.</p>

      {status && (status.ready
        ? <div className="admin-status ok">UAT certificate loaded{status.certificateExpires ? ` (expires ${new Date(status.certificateExpires).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })})` : ''}. Tests run on <b>{status.base}</b> only, never on production.{!status.hasEncryptionKey && ' The UAT encryption key is not set, so encrypted steps cannot run.'}</div>
        : <div className="admin-status warn"><b>The UAT certificate is not set up on the server</b>, so steps cannot be run yet. You can still upload a workbook and prepare the steps. To enable running, set <code>UAT_CERT</code>, <code>UAT_KEY</code> and <code>UAT_ENCRYPTION_KEY</code> on the server.</div>)}
      {error && <div className="error-alert" role="alert">{error}</div>}

      <details className="admin-card cf-which">
        <summary>Which APIs need a conformance test? <span>{required.length} that SSG has issued us a workbook for</span></summary>
        <ul>{required.map((a) => <li key={a.slug}><a href={`/docs/${a.slug}`} target="_blank" rel="noopener">{a.name}</a><span>{a.group}</span></li>)}</ul>
        <p className="admin-muted">Other APIs have not come up on our tickets; SSG confirmed there is no test package for Get Skills Details.</p>
      </details>

      <div className="admin-card cf-setup">
        <label className="cf-file">
          <span>Test workbook (.xlsx)</span>
          <input type="file" accept=".xlsx,.xls,.XLS,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f); }} />
          {file && <small>{file.name}: {sheets.length} test sheet{sheets.length === 1 ? '' : 's'}, {total} step{total === 1 ? '' : 's'}</small>}
          {busy === 'parse' && <small>Reading…</small>}
        </label>
        <label><span>Executed by</span><input value={tester} onChange={(e) => setTester(e.target.value)} /></label>
        <label><span>Execution date</span><input value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>

      {sheet && (
        <>
          <div className="cf-bar">
            <div className="cf-sheets" role="tablist" aria-label="Test sheets">
              {sheets.map((s, i) => {
                const n = s.steps.filter((st) => results[keyOf(s.name, st.row)]).length;
                return <button key={s.name} role="tab" aria-selected={i === active} className={i === active ? 'on' : ''} onClick={() => setActive(i)}>{s.name.trim()}<span className={n === s.steps.length ? 'full' : ''}>{n}/{s.steps.length}</span></button>;
              })}
            </div>
            <div className="cf-actions">
              <button className="admin-btn ghost" disabled={!!busy || !status?.ready} onClick={() => runSheet(sheet)}>Run ready steps on this sheet</button>
              <button className="admin-btn ghost" disabled={!done} onClick={evidence}>Evidence log</button>
              <button className="admin-btn" disabled={!done || !!busy} onClick={download}>{busy === 'export' ? 'Preparing…' : `Download completed workbook (${done}/${total})`}</button>
            </div>
          </div>
          {sheet.scenario && <p className="cf-scenario">{sheet.scenario}</p>}

          {sheet.steps.map((st) => {
            const k = keyOf(sheet.name, st.row); const e = edits[k]; const r = results[k];
            const todo = placeholders(e);
            return (
              <section key={k} className={`admin-card cf-step ${r ? (r.pass ? 'pass' : 'fail') : ''}`}>
                <header>
                  <b>{st.id}</b>
                  <span className="cf-title">{st.title}</span>
                  <span className="admin-role member">Expects HTTP {st.expectedStatus}</span>
                  {r && <span className={`wb-status ${r.pass ? 'ok' : 'bad'}`}>{r.status ? `HTTP ${r.status}` : 'No response'} · {r.pass ? 'Pass' : 'Fail'}</span>}
                </header>
                <div className="cf-req">
                  <select value={e.method} onChange={(ev) => setEdit(k, { method: ev.target.value })} aria-label="Method">{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}</select>
                  <input className="cf-url" value={e.url} onChange={(ev) => setEdit(k, { url: ev.target.value })} spellCheck={false} aria-label="URL" />
                  <label className="cf-ver">x-api-version<input value={e.version} onChange={(ev) => setEdit(k, { version: ev.target.value })} /></label>
                </div>
                {e.method !== 'GET' && (
                  <>
                    <textarea className="cf-body" rows={Math.min(16, Math.max(4, e.body.split('\n').length))} value={e.body} onChange={(ev) => setEdit(k, { body: ev.target.value })} spellCheck={false} aria-label="Request payload" />
                    <label className="cf-check"><input type="checkbox" checked={e.encrypt} onChange={(ev) => setEdit(k, { encrypt: ev.target.checked })} /> Encrypt the payload with the UAT encryption key (AES-256) before sending</label>
                  </>
                )}
                <details className="cf-more"><summary>Extra headers, SSG’s step description and expected result</summary>
                  <label className="cf-ver">Extra headers (JSON)<input value={e.headers} onChange={(ev) => setEdit(k, { headers: ev.target.value })} placeholder='{"uen": "…"}' spellCheck={false} /></label>
                  <h4>Step description</h4><pre>{st.description}</pre>
                  <h4>Expected result</h4><pre>{st.expected || 'Not stated'}</pre>
                </details>
                {todo.length > 0 && <p className="cf-todo"><b>Fill in before running:</b> {todo.map((t) => <code key={t}>{t}</code>)}</p>}
                <div className="cf-run">
                  <button className="admin-btn" disabled={!!busy || !status?.ready || todo.length > 0} onClick={() => run(sheet, st)}>{busy === k ? 'Running…' : r ? 'Run again' : 'Run this step'}</button>
                  {r && (
                    <>
                      <span className="admin-muted">{r.ms} ms · {sgTime(r.at)}{r.decrypted ? ' · response decrypted' : ''}</span>
                      <label className="cf-pass">Result
                        <select value={r.pass ? 'pass' : 'fail'} onChange={(ev) => setResult(k, { pass: ev.target.value === 'pass' })}><option value="pass">{sheet.yesNo ? 'Yes (as expected)' : 'Pass'}</option><option value="fail">{sheet.yesNo ? 'No' : 'Fail'}</option></select>
                      </label>
                    </>
                  )}
                </div>
                {r && (
                  <>
                    <input className="cf-comment" placeholder="Comment for SSG (optional)" value={r.comment} onChange={(ev) => setResult(k, { comment: ev.target.value })} />
                    <details className="cf-more" open={!r.pass}><summary>Actual result</summary><pre>{r.error ? r.error : pretty(r.body)}</pre></details>
                  </>
                )}
              </section>
            );
          })}
        </>
      )}
      {!sheet && <p className="admin-muted">No workbook loaded. Keep this tab open while you test: the workbook and results are held here, not on the server.</p>}
      <p className="admin-muted cf-note">SSG’s instructions also ask for a screenshot of each result with its timestamp in a Word document. This page cannot take screenshots; the evidence log gives the request, response and time of every step for that document.</p>
    </>
  );
}
