import { useState } from 'react';
import { ALL_APIS } from '../catalog';
import type { AuthUser } from '../auth';
import { TopBar, Footer } from './Shell';

// Online version of SWDA's "API Subscription Form for SWDA APIs" (v1.12,
// Sections 1-3), the version SWDA asks for on subscription tickets. The answers
// are written into SWDA's own Word form in the browser (subscriptionDocx.ts) and
// downloaded as a .docx. Nothing typed here is sent to our server.

interface ApiRow { name: string; use: string }
const BLANK_FORM = '/SWDA-API-Subscription-Form-v1.12.docx';

export default function SubscriptionForm({ user }: { user: AuthUser | null }) {
  const [f, setF] = useState({
    company: '', uen: '', contactName: '', contactNumber: '', contactEmail: '',
    ownerName: '', ownerEmail: '', appName: '',
    systemType: 'TP' as 'TP' | 'TMS',
    tmsName: '', tmsUen: '', tmsAbbrev: '', gateway: '',
  });
  const [rows, setRows] = useState<ApiRow[]>([{ name: '', use: '' }]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const setRow = (i: number, patch: Partial<ApiRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const downloadWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingUse = rows.find((r) => r.name.trim() && !r.use.trim());
    if (!rows.some((r) => r.name.trim())) { setMsg({ ok: false, text: 'Add at least one API you are requesting.' }); return; }
    if (missingUse) { setMsg({ ok: false, text: `Describe how “${missingUse.name}” will be used. SWDA asks for a business use case for every API.` }); return; }
    setBusy(true); setMsg(null);
    try {
      const [{ fillSubscriptionForm }, res] = await Promise.all([import('../subscriptionDocx'), fetch('/subscription-form-template.docx')]);
      if (!res.ok) throw new Error(`Could not load the form (${res.status})`);
      const docx = fillSubscriptionForm(new Uint8Array(await res.arrayBuffer()), { ...f, apis: rows });
      const blob = new Blob([docx as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `SWDA_API Platform - API Subs Req Form (v1.12)${f.appName.trim() ? ' - ' + f.appName.trim().replace(/[^\w -]/g, '') : ''}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setMsg({ ok: true, text: 'Downloaded. Open it in Word to check it, then attach it to your ticket.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not create the Word file' });
    }
    setBusy(false);
  };

  return (
    <div className="pub">
      <TopBar user={user} active="form" />
      <div className="pub-form-wrap">
        <a className="pub-link" href="/api-reference">← API Reference</a>
        <h1>API Subscription Form for SWDA APIs</h1>
        <p className="pub-product-desc">
          Fill in the form below and download it as a Word document: it is SWDA’s own form (v1.12, Sections 1 to 3) with your answers typed in,
          ready to attach to your ticket. Nothing you type here is sent to our server.
        </p>

        <ol className="sub-steps" aria-label="How to submit the form">
          <li><b>Create the app</b><span>On the Developer Portal, name it <em>TMS provider abbreviation + company abbreviation</em>, for example “TMSV2 TIA”. One form per app.</span></li>
          <li><b>Subscribe in the portal</b><span>Subscribe the app to each API. They show as Pending until SWDA approves.</span></li>
          <li><b>Fill in and download</b><span>Give a business use case for every API: what it is, how your system calls it, and the outcome.</span></li>
          <li><b>Raise a ticket</b><span>Attach the Word file at <a href="https://go.gov.sg/ssg-api-ticket" target="_blank" rel="noopener noreferrer">go.gov.sg/ssg-api-ticket</a>. Say whether you are a TMS provider, a TP with your own TMS, or a TP on a third-party TMS: SWDA asks every time.</span></li>
          <li><b>Reply and test</b><span>Answer clarifications before the ticket’s auto-resolve date, then run the UAT conformance tests. Production access is given to the training provider, not the TMS provider.</span></li>
        </ol>
        <p className="sub-more">The full walk-through is in <a href="/guides/api-subscription">SSG API subscription process</a>.</p>

        <form onSubmit={downloadWord}>

        <fieldset className="pub-fs">
          <legend>(1) Developer Portal Application Information</legend>
          <label>Company’s Name<input required value={f.company} onChange={set('company')} autoComplete="organization" /></label>
          <label>Company’s UEN No.<input required value={f.uen} onChange={set('uen')} /></label>
          <div className="pub-fs-hint">Contact person who will represent the company for queries and clarifications.</div>
          <div className="pub-grid3">
            <label>Name<input value={f.contactName} onChange={set('contactName')} autoComplete="name" /></label>
            <label>Contact Number<input value={f.contactNumber} onChange={set('contactNumber')} type="tel" autoComplete="tel" /></label>
            <label>Company Email Address<input value={f.contactEmail} onChange={set('contactEmail')} type="email" autoComplete="email" /></label>
          </div>
          <div className="pub-grid3">
            <label>Developer Portal’s App Owner Name<input value={f.ownerName} onChange={set('ownerName')} /></label>
            <label>App Owner Company Email Address<input value={f.ownerEmail} onChange={set('ownerEmail')} type="email" /></label>
            <label>Developer Portal’s App Name<input required value={f.appName} onChange={set('appName')} placeholder="e.g. TMSV2 TIA" /></label>
          </div>
        </fieldset>

        <fieldset className="pub-fs">
          <legend>(2) Requester System Information</legend>
          <div className="pub-radio">
            <label><input type="radio" name="st" checked={f.systemType === 'TP'} onChange={() => setF({ ...f, systemType: 'TP' })} /> External – Training Provider (TP)</label>
            <label><input type="radio" name="st" checked={f.systemType === 'TMS'} onChange={() => setF({ ...f, systemType: 'TMS' })} /> External – Training Management System (TMS) Provider / 3rd Party Vendor</label>
          </div>
          <div className="pub-grid3">
            <label>TMS Provider Company Name<input value={f.tmsName} onChange={set('tmsName')} /></label>
            <label>TMS Provider Company UEN No.<input value={f.tmsUen} onChange={set('tmsUen')} /></label>
            <label>TMS Provider Naming Convention (Abbreviation)<input value={f.tmsAbbrev} onChange={set('tmsAbbrev')} /></label>
          </div>
          <label>(2a) Requester System Gateway <small>(optional)</small><input value={f.gateway} onChange={set('gateway')} /></label>
        </fieldset>

        <fieldset className="pub-fs">
          <legend>(3) Requested API Information &amp; Background</legend>
          <div className="pub-fs-hint">For each API, give the business use case relevant to your organisation. Mock-up screens, wireframes or a process flow can support it.</div>
          <datalist id="api-names">
            {[...new Set(ALL_APIS.filter((a) => a.auth !== 'local').map((a) => a.name))].map((n) => <option key={n} value={n} />)}
          </datalist>
          {rows.map((r, i) => (
            <div key={i} className="pub-api-req">
              <label>API Name
                <input list="api-names" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Start typing to pick from the catalogue" />
              </label>
              <label>How the API will be used
                <textarea rows={4} value={r.use} onChange={(e) => setRow(i, { use: e.target.value })} />
              </label>
              {rows.length > 1 && <button type="button" className="pub-link" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>}
            </div>
          ))}
          <button type="button" className="pub-btn ghost" onClick={() => setRows([...rows, { name: '', use: '' }])}>+ Add another API</button>
        </fieldset>

        <div className="pub-form-actions">
          <button type="submit" className="pub-btn" disabled={busy}>{busy ? 'Preparing…' : 'Download the filled form (Word .docx)'}</button>
          <a className="pub-btn ghost" href={BLANK_FORM} download>Download the blank form</a>
        </div>
        {msg && <p className={msg.ok ? 'sub-msg ok' : 'sub-msg err'} role="status">{msg.text}</p>}
        </form>
      </div>
      <Footer />
    </div>
  );
}
