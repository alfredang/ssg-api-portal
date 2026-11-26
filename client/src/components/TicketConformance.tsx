import { useCallback, useEffect, useState } from 'react';
import './TicketConformance.css';

interface Run {
  id: string; title: string; caseId: string; kind: string; origin: string; at: string; finishedAt?: string;
  state: string; outcome: string; interpretation: string; executedBy: string; trainerId?: string;
  request: { method: string; url: string; version: string; encrypted: boolean; body: unknown; encryptedBody?: string };
  response: { status: number; apiStatus?: number; body: unknown; ms?: number } | null;
  source?: { filename: string; original: boolean; sha256: string; note?: string };
  review?: { note: string; by: string; at: string };
}
interface Ticket {
  ticket: string; name: string; application: string; uen: string; ready: boolean; canManage: boolean; blocker: string;
  credential: { ready: boolean; hasCertificate: boolean; hasPrivateKey: boolean; hasEncryptionKey: boolean; certificateValid: boolean; keyMatches: boolean; fingerprintMatches: boolean; hostAllowed: boolean; encryptionSourceConfirmed: boolean; certificateExpires: string | null };
  preparation: { idNumber: string; idType: string; sourceReference: string; revision: string } | null;
  preview: unknown; runs: Run[]; hasOriginalFixture: boolean;
}
const API = '/api/conformance/tickets/DP-15411';
const pretty = (v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2);
const time = (v: string) => new Date(v).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Singapore' });
async function request<T>(suffix = '', method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(API + suffix, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The ticket could not be loaded.');
  return result;
}
function RunDetail({ run, canManage, refresh }: { run: Run; canManage: boolean; refresh: () => Promise<void> }) {
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const hold = ['uncertain', 'running'].includes(run.state) && !run.review;
  const reconcile = async () => {
    setBusy(true); setError('');
    try { await request(`/runs/${run.id}/reconcile`, 'POST', { confirmed: true, note }); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the review.'); }
    finally { setBusy(false); }
  };
  return <div className="ticket-run-detail">
    <p className="ticket-interpretation">{run.interpretation}</p>
    <dl className="ticket-facts"><div><dt>Executed by</dt><dd>{run.executedBy}</dd></div><div><dt>Environment</dt><dd>SWDA UAT</dd></div><div><dt>Test type</dt><dd>{run.kind}</dd></div><div><dt>Trainer ID returned</dt><dd>{run.trainerId || 'None recorded'}</dd></div></dl>
    <div className="ticket-payloads">
      <section><h4>Request</h4><p><code>{run.request.method} {run.request.url}</code></p><p className="ticket-caption">x-api-version: {run.request.version} · {run.request.encrypted ? 'AES-256-CBC encrypted' : 'Validation probe'}</p><pre tabIndex={0}>{pretty(run.request.body)}</pre>
        {run.request.encryptedBody && <details><summary>Encrypted request</summary><pre tabIndex={0}>{run.request.encryptedBody}</pre></details>}</section>
      <section><h4>Response</h4><p className="ticket-caption">HTTP {run.response?.status || 'not recorded'} · API {run.response?.apiStatus ?? 'not recorded'}{run.response?.ms != null ? ` · ${run.response.ms} ms recorded` : ''}</p><pre tabIndex={0}>{run.response ? pretty(run.response.body) : 'No confirmed response. Preserve this attempt and reconcile before retrying.'}</pre></section>
    </div>
    {run.source && <p className="ticket-caption">Source: {run.source.filename} · {run.source.original ? 'Private archive copy' : 'Sanitized archive copy'}{run.source.note && <><br />{run.source.note}</>}</p>}
    <a className="admin-btn ghost ticket-download" href={`${API}/runs/${run.id}/evidence`}>Download {run.source?.original ? 'original evidence' : 'evidence JSON'}</a>
    {run.review && <p className="ticket-interpretation">Review by {run.review.by}, {time(run.review.at)}: {run.review.note}</p>}
    {hold && canManage && <div className="ticket-review"><label>SWDA-confirmed outcome and reply reference<textarea value={note} onChange={e => setNote(e.target.value)} rows={3} /></label><button className="admin-btn ghost" disabled={busy || note.trim().length < 20} onClick={reconcile}>{busy ? 'Saving…' : 'Record confirmed outcome and clear hold'}</button>{error && <p role="alert">{error}</p>}</div>}
  </div>;
}
export default function TicketConformance() {
  const [ticket, setTicket] = useState<Ticket | null>(null); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(''); const [filter, setFilter] = useState('all');
  const [identity, setIdentity] = useState(''); const [idType, setIdType] = useState(''); const [source, setSource] = useState('');
  const [confirmed, setConfirmed] = useState(false); const [runConfirmed, setRunConfirmed] = useState(false);
  const load = useCallback(async () => { const data = await request<Ticket>(); setTicket(data); }, []);
  useEffect(() => { load().catch(err => setError(err.message)); }, [load]);
  // Recover the durable result if the browser was closed or disconnected mid-run.
  useEffect(() => {
    if (!ticket?.runs.some(r => r.state === 'running' && !r.review)) return;
    const timer = setInterval(() => { load().catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [ticket, load]);
  const action = async (name: string, work: () => Promise<void>) => {
    setBusy(name); setError(''); setMessage('');
    try { await work(); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'The action failed.'); }
    finally { setBusy(''); }
  };
  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    await action('import', async () => { let count = 0; for (const file of Array.from(files)) { const result = await request<{ imported: number }>('/import', 'POST', { filename: file.name, report: JSON.parse(await file.text()) }); count += result.imported; } setMessage(`${count} historical attempt(s) imported. No API request was run.`); });
  };
  if (!ticket) return <section className="ticket-page"><h2>DP-15411 · Add TP Trainers</h2>{error ? <p className="error-alert" role="alert">{error}</p> : <p role="status">Loading the evidence archive…</p>}</section>;
  const latest = ticket.runs.find(r => r.kind === 'Functional test');
  const runs = ticket.runs.filter(r => filter === 'all' || (filter === 'functional' ? r.kind === 'Functional test' : r.kind === 'Diagnostic'));
  const checks = [
    ['UAT certificate present', ticket.credential.hasCertificate], ['Private key matches certificate', ticket.credential.keyMatches],
    ['Certificate is within its validity period', ticket.credential.certificateValid], ['Confirmed application fingerprint', ticket.credential.fingerprintMatches],
    ['SWDA UAT host only', ticket.credential.hostAllowed], ['32-byte encryption key loaded', ticket.credential.hasEncryptionKey],
    ['24 November SWDA key source confirmed', ticket.credential.encryptionSourceConfirmed],
    ['Original TS01 fixture available', ticket.hasOriginalFixture],
  ] as const;
  return <section className="ticket-page">
    <header className="ticket-heading"><div><p className="ticket-eyebrow">TRAINER CONFORMANCE / DP-15411</p><h2>Add TP Trainers <span>v2.0</span></h2><p>{ticket.application} · UAT UEN <code>{ticket.uen}</code></p></div><span className="ticket-environment">UAT ONLY</span></header>
    {error && <p className="error-alert" role="alert">{error}</p>}{message && <p className="admin-status ok" role="status">{message}</p>}
    <div className="ticket-current"><div><span className="ticket-eyebrow">LATEST FUNCTIONAL RESULT</span><strong>{latest?.outcome === 'pass' ? 'TS01 passed' : latest?.state === 'uncertain' || latest?.state === 'running' ? 'TS01 needs reconciliation' : 'TS01 incomplete'}</strong><p>{latest ? `${time(latest.at)} · HTTP ${latest.response?.status || 'not confirmed'}` : 'No functional attempt recorded.'}</p>{latest && <p>{latest.interpretation}</p>}</div><aside><span className="ticket-eyebrow">NEXT ACTION</span><p>{ticket.blocker}</p><a href="https://mail.google.com/mail/#search/DP-15411" target="_blank" rel="noopener noreferrer">Open DP-15411 email thread ↗</a></aside></div>
    <section className="ticket-history" aria-labelledby="ticket-history-title"><div className="ticket-section-head"><div><h3 id="ticket-history-title">Test history <span>{ticket.runs.length}</span></h3><p>Each attempt is preserved. Imported history never sends an API request.</p></div><button className="admin-btn ghost" disabled={!!busy} onClick={() => action('refresh', load)}>Refresh history</button></div>
      <div className="ticket-filters" role="group" aria-label="Filter test history">{[['all', 'All attempts'], ['functional', 'Functional TS01'], ['diagnostic', 'Diagnostics']].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <ol className="ticket-timeline">{runs.map((run, index) => <li key={run.id}><details className="ticket-attempt" open={index === 0}><summary><span className={`ticket-outcome ${run.outcome}`}>{run.state === 'uncertain' || run.state === 'running' ? 'Needs review' : run.outcome === 'pass' ? 'Pass' : run.outcome === 'diagnostic' ? 'Diagnostic' : 'Fail'}</span><span className="ticket-attempt-title"><b>{run.title}</b><small>{time(run.at)} · {run.origin}</small></span><span className="ticket-http">HTTP {run.response?.status || '—'}</span></summary><RunDetail run={run} canManage={ticket.canManage} refresh={load} /></details></li>)}</ol>
      {!runs.length && <p>No attempts match this filter.</p>}
      {ticket.canManage && <label className="ticket-import">Import original JSON evidence<input type="file" accept=".json,application/json" multiple disabled={!!busy} onChange={e => { void importFiles(e.target.files); e.target.value = ''; }} /><small>Private staff archive. Existing attempts are matched by evidence, so importing twice does not duplicate a run.</small></label>}
    </section>
    <details className="ticket-setup"><summary>UAT readiness <span>{checks.filter(([, ok]) => ok).length}/{checks.length} checks ready</span></summary><ul className="ticket-checks">{checks.map(([label, ok]) => <li key={label}><span className={ok ? 'ready' : 'missing'}>{ok ? 'Ready' : 'Needed'}</span>{label}</li>)}</ul><p>Credentials are configured on the server. This page shows their status and never reveals their values.</p></details>
    <details className="ticket-setup"><summary>Prepare the next TS01 <span>{ticket.preparation ? 'Request prepared' : 'Waiting for SWDA identity'}</span></summary>
      <p>Use the unused synthetic identity and ID type supplied by SWDA for UEN {ticket.uen}. The workbook identity has already been attempted.</p>
      {ticket.canManage ? <form className="ticket-prepare" onSubmit={e => { e.preventDefault(); void action('prepare', async () => { await request('/preparation', 'PUT', { idNumber: identity, idType, sourceReference: source, syntheticConfirmed: confirmed, scope: 'add-only-retain' }); setRunConfirmed(false); setMessage('TS01 request prepared. Review the preview before running.'); }); }}>
        <label>Synthetic ID number<input value={identity} onChange={e => setIdentity(e.target.value)} required autoComplete="off" /></label><label>ID type code<input value={idType} onChange={e => setIdType(e.target.value)} required autoComplete="off" /></label><label className="ticket-wide">SWDA reply reference<input value={source} onChange={e => setSource(e.target.value)} required minLength={8} /></label>
        <label className="ticket-wide ticket-check-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm SWDA supplied this unused synthetic identity. Run Add only and retain the returned trainer for the next reviewed ticket.</label>
        <button className="admin-btn" disabled={!!busy || !confirmed}>{busy === 'prepare' ? 'Saving…' : 'Save request preparation'}</button>
      </form> : <p>An admin can prepare and run the next test.</p>}
      {ticket.preparation && <div className="ticket-preview"><h4>Prepared request</h4><p>POST · SWDA UAT · x-api-version v2.0 · AES-256-CBC</p><p>SWDA reference: {ticket.preparation.sourceReference}</p><pre tabIndex={0}>{pretty(ticket.preview)}</pre>
        {ticket.canManage && <><label className="ticket-check-label"><input type="checkbox" checked={runConfirmed} onChange={e => setRunConfirmed(e.target.checked)} />I reviewed this request. Create one synthetic trainer on UAT and retain its returned ID.</label><button className="admin-btn" disabled={!!busy || !ticket.ready || !runConfirmed} onClick={() => action('run', async () => { await request('/run', 'POST', { revision: ticket.preparation?.revision, confirmation: 'RUN TS01 ON UAT' }); setRunConfirmed(false); setMessage('Attempt recorded. Review its response in test history.'); })}>{busy === 'run' ? 'Running TS01…' : 'Run TS01 once on UAT'}</button></>}
      </div>}
      <p className="ticket-caption">Success requires HTTP/API 200 and a new trainer ID. An uncertain response holds further Add attempts for review. Cleanup is a separate action.</p>
    </details>
  </section>;
}
