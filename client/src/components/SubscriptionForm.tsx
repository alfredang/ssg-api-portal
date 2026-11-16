import { useState } from 'react';
import { ALL_APIS } from '../catalog';
import type { AuthUser } from '../auth';
import { TopBar, Footer } from './Shell';

// Online version of "API Subscription Form for SSG-WSG APIs" (SSGAPI form).
// The original Word file is served at /SSG-API-Subscription-Form.docx.

interface ApiRow { name: string; use: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

export default function SubscriptionForm({ user }: { user: AuthUser | null }) {
  const [f, setF] = useState({
    company: '', uen: '', contactName: '', contactNumber: '', contactEmail: '',
    ownerName: '', ownerEmail: '', appName: '',
    systemType: 'TP' as 'TP' | 'TMS',
    tmsName: '', tmsUen: '', tmsAbbrev: '', gateway: '',
  });
  const [rows, setRows] = useState<ApiRow[]>([{ name: '', use: '' }]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const setRow = (i: number, patch: Partial<ApiRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const downloadWord = () => {
    const tick = (on: boolean) => (on ? '[ X ]' : '[&nbsp;&nbsp;]');
    const row = (label: string, value: string) => `<tr><td width="38%"><b>${label}</b></td><td>${value || '&nbsp;'}</td></tr>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>API Subscription Form</title>
<style>body{font-family:Arial;font-size:11pt}table{border-collapse:collapse;width:100%;margin-bottom:14pt}td{border:1px solid #666;padding:6pt;vertical-align:top}h1{font-size:15pt}h2{font-size:12pt;background:#ddd;padding:4pt}</style></head><body>
<h1>API Subscription Form for SSG-WSG APIs</h1>
<h2>(1) Developer Portal Application Information (to be provided by Requester)</h2>
<table>
${row('Company’s Name', esc(f.company))}
${row('Company’s UEN No.', esc(f.uen))}
${row('Company’s Contact Person Details', `Name: ${esc(f.contactName)}<br/>Contact Number: ${esc(f.contactNumber)}<br/>Company Email Address: ${esc(f.contactEmail)}`)}
${row('Developer Portal’s App Owner Name', esc(f.ownerName))}
${row('Developer Portal’s App Owner Company Email Address', esc(f.ownerEmail))}
${row('Developer Portal’s App Name', esc(f.appName))}
</table>
<h2>(2) Requester System Information (to be provided by Requester)</h2>
<table>
${row('Requester System Type', `${tick(f.systemType === 'TP')} External - Training Provider (TP)<br/>${tick(f.systemType === 'TMS')} External - Training Management System (TMS) Provider / 3rd Party Vendor`)}
${row('Training Management System (TMS) Provider Details', `TMS Provider Company Name: ${esc(f.tmsName)}<br/>TMS Provider Company UEN No.: ${esc(f.tmsUen)}<br/>TMS Provider Naming Convention (Abbreviation): ${esc(f.tmsAbbrev)}`)}
${row('(2a) Requester System Gateway', esc(f.gateway))}
</table>
<h2>(3) Requested API Information &amp; Background (to be provided by Requester)</h2>
<table>
${row('Requested SSG-WSG Data, Service(s), API(s)', rows.filter((r) => r.name).map((r) => esc(r.name)).join('<br/>'))}
${row('Reason for requesting for the SSG-WSG Data / Service / API', rows.filter((r) => r.name).map((r) => `<b>API Name:</b> ${esc(r.name)}<br/><b>How the API will be used:</b><br/>${esc(r.use)}`).join('<br/><br/>'))}
</table></body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SSG-API-Subscription-Form${f.appName ? ' - ' + f.appName.replace(/[^\w -]/g, '') : ''}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="pub">
      <TopBar user={user} active="form" />
      <div className="pub-form-wrap">
        <a className="pub-link" href="/">← API Reference</a>
        <h1>API Subscription Form for SSG-WSG APIs</h1>
        <p className="pub-product-desc">
          Fill this in to request access to an SSG API, download it as a Word document, and attach it to a ticket at{' '}
          <a href="https://go.gov.sg/ssg-api-ticket" target="_blank" rel="noopener noreferrer">go.gov.sg/ssg-api-ticket</a>.
          Use one form per Developer Portal app. Nothing you type here is sent to our server.
        </p>

        <fieldset className="pub-fs">
          <legend>(1) Developer Portal Application Information</legend>
          <label>Company’s Name<input value={f.company} onChange={set('company')} autoComplete="organization" /></label>
          <label>Company’s UEN No.<input value={f.uen} onChange={set('uen')} /></label>
          <div className="pub-fs-hint">Contact person who will represent the company for queries and clarifications.</div>
          <div className="pub-grid3">
            <label>Name<input value={f.contactName} onChange={set('contactName')} autoComplete="name" /></label>
            <label>Contact Number<input value={f.contactNumber} onChange={set('contactNumber')} type="tel" autoComplete="tel" /></label>
            <label>Company Email Address<input value={f.contactEmail} onChange={set('contactEmail')} type="email" autoComplete="email" /></label>
          </div>
          <div className="pub-grid3">
            <label>Developer Portal’s App Owner Name<input value={f.ownerName} onChange={set('ownerName')} /></label>
            <label>App Owner Company Email Address<input value={f.ownerEmail} onChange={set('ownerEmail')} type="email" /></label>
            <label>Developer Portal’s App Name<input value={f.appName} onChange={set('appName')} placeholder="TMS provider naming convention" /></label>
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
          <label>(2a) Requester System Gateway<input value={f.gateway} onChange={set('gateway')} /></label>
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
              {rows.length > 1 && <button className="pub-link" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>}
            </div>
          ))}
          <button className="pub-btn ghost" onClick={() => setRows([...rows, { name: '', use: '' }])}>+ Add another API</button>
        </fieldset>

        <div className="pub-form-actions">
          <button className="pub-btn" onClick={downloadWord}>Download filled form (.doc)</button>
          <a className="pub-btn ghost" href="/SSG-API-Subscription-Form.docx" download>Download blank form (.docx)</a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
