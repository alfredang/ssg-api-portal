import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../auth';
import { ALL_APIS } from '../catalog';
import { TopBar, Footer } from './Shell';

// Contact page and the SSG API services (lead magnet) page. Both post to
// POST /lead on our server, which stores the enquiry for the team.

export const COMPANY = {
  name: 'Tertiary Infotech Academy Pte Ltd',
  site: 'https://www.tertiaryinfotech.com/',
  address: '12 Woodlands Square #07-85/86/87 Woods Square Tower 1, Singapore 737715',
  phone: '+65 6100 0613', tel: '+6561000613',
  whatsapp: '+65 8866 6375', wa: 'https://wa.me/6588666375',
  email: 'enquiry@tertiaryinfotech.com',
  hours: 'Mon – Fri · 9:00 am – 6:00 pm',
  uen: '201200696W',
  map: 'https://www.google.com/maps/search/?api=1&query=Tertiary+Infotech+Academy+Woods+Square+Tower+1+Singapore+737715',
};

type Status = 'idle' | 'sending' | 'done' | 'error';

/** Enquiry form. `source` says which page it came from; `compact` drops the optional fields. */
export function LeadForm({ source, compact, cta = 'Send enquiry →', children }: { source: string; compact?: boolean; cta?: string; children?: (done: boolean) => ReactNode }) {
  const [f, setF] = useState({ name: '', email: '', company: '', phone: '', preferredDemo: '', message: '', website: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending'); setError('');
    try {
      const res = await fetch('/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, source }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Could not send (${res.status})`);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not send');
    }
  };

  if (status === 'done') {
    return (
      <div className="lead-done" role="status">
        <b>Thank you, {f.name.split(' ')[0] || 'we have it'}.</b>
        <p>Your enquiry is with our team. A consultant replies within one business day.</p>
        {children?.(true)}
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="lead-row">
        <label>Your name<input required value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} /></label>
        <label>Email<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={160} /></label>
      </div>
      <div className="lead-row">
        <label>Company<input value={f.company} onChange={set('company')} autoComplete="organization" maxLength={160} /></label>
        <label>Phone<input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" maxLength={40} /></label>
      </div>
      {!compact && <label>Preferred date &amp; time for a demo (optional)<input value={f.preferredDemo} onChange={set('preferredDemo')} placeholder="e.g. Tue 24 Nov, 3 pm" maxLength={120} /></label>}
      <label>{compact ? 'What do you need? (optional)' : 'Your message'}
        <textarea required={!compact} rows={compact ? 3 : 5} value={f.message} onChange={set('message')} maxLength={4000}
          placeholder="e.g. We need our TMS to submit enrolments and pull grant status through the SSG API." />
      </label>
      {/* honeypot: people never see or fill this */}
      <input className="lead-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" />
      {status === 'error' && <p className="lead-error" role="alert">{error}. You can also email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>}
      <div className="lead-actions">
        <button className="pub-btn" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : cta}</button>
        <span>We reply within 1 business day</span>
      </div>
    </form>
  );
}

export function ContactPage({ user }: { user: AuthUser | null }) {
  return (
    <div className="pub">
      <TopBar user={user} active="contact" />
      <main className="mk">
        <section className="mk-hero">
          <span className="mk-kicker">Contact</span>
          <h1>Let’s get your SSG API integration working.</h1>
          <p>Reach out for a demo, a quote, or a quick conversation about the SSG API / SWDA API, your TMS or TPGateway automation. We reply within one business day.</p>
        </section>

        <div className="mk-cols">
          <section className="mk-card" aria-label="Contact details">
            <h2>{COMPANY.name}</h2>
            <address className="mk-contact">
              <div><span>Address</span><p>{COMPANY.address}<br /><a href={COMPANY.map} target="_blank" rel="noopener noreferrer">Open in Maps ↗</a></p></div>
              <div><span>Phone</span><p><a href={`tel:${COMPANY.tel}`}>{COMPANY.phone}</a></p></div>
              <div><span>WhatsApp</span><p><a href={COMPANY.wa} target="_blank" rel="noopener noreferrer">{COMPANY.whatsapp}</a></p></div>
              <div><span>Email</span><p><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p></div>
              <div><span>Hours</span><p>{COMPANY.hours}<br />Closed on weekends &amp; public holidays</p></div>
              <div><span>UEN</span><p>{COMPANY.uen}</p></div>
            </address>
            <div className="mk-quick">
              <a className="pub-btn ghost" href={`tel:${COMPANY.tel}`}>Call us</a>
              <a className="pub-btn ghost" href={COMPANY.wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a className="pub-btn ghost" href={COMPANY.site} target="_blank" rel="noopener">tertiaryinfotech.com ↗</a>
            </div>
          </section>

          <section className="mk-card" aria-label="Enquiry form">
            <span className="mk-kicker">Get in touch</span>
            <h2>Talk to us.</h2>
            <p className="mk-sub">Tell us about your training operation or integration project.</p>
            <ol className="mk-steps">
              <li>You tell us what you need, in your own words</li>
              <li>A consultant replies within one business day</li>
              <li>We arrange a free 30-minute consultation and tell you what’s realistic</li>
            </ol>
            <LeadForm source="contact" />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const CHECKLIST: { title: string; items: string[] }[] = [
  { title: '1. Developer Portal app', items: [
    'CorpPass access to the SWDA Developer Portal for your UEN',
    'One app per system, named to the TMS provider naming convention',
    'Decide the auth method per API: certificate (mTLS) or OAuth client ID and secret',
  ] },
  { title: '2. Certificates and keys', items: [
    'Self-signed X.509 certificate and private key generated and uploaded',
    'AES-256 encryption key recorded for the app (needed by enrolment, assessment and attendance APIs)',
    'Keys stored outside source control; expiry date in the calendar',
  ] },
  { title: '3. API subscription', items: [
    'API Subscription Form filled in with a business use case for each API',
    'Ticket raised at go.gov.sg/ssg-api-ticket and the DP ticket number recorded',
    'Mock-ups or process flow attached for each use case',
  ] },
  { title: '4. Build', items: [
    'Correct base URL per auth method (api.ssg-wsg.sg for certificate, public-api.ssg-wsg.sg for OAuth)',
    'Correct x-api-version per endpoint; none for enrolment and grant search',
    'Request body AES-256-CBC encrypted with IV "SSGAPIInitVector" where required; responses decrypted',
    'Both the HTTP status and the status inside the JSON are checked',
  ] },
  { title: '5. Conformance test (UAT)', items: [
    'Conformance workbook for each API received from SSG',
    'Every test scenario run in UAT with request, response and timestamp recorded',
    'Completed workbooks returned on the same ticket',
  ] },
  { title: '6. Go live', items: [
    'Production access confirmed per API (a 403 "Access to this API has been disallowed" means not yet subscribed)',
    'Course run, enrolment, attendance, assessment and grant flows tested end to end with one real class',
    'Monitoring for expired API versions and certificate expiry',
  ] },
];

function downloadChecklist() {
  const html = `<html><head><meta charset="utf-8"><title>SSG API Integration Checklist</title>
<style>body{font-family:Arial;font-size:11pt;line-height:1.5}h1{font-size:18pt;color:#0F1C45}h2{font-size:12.5pt;color:#2F5BE6;margin-top:16pt}li{margin:4pt 0}p.f{color:#555;font-size:9.5pt;margin-top:24pt}</style></head><body>
<h1>SSG API Integration Checklist</h1>
<p>For training providers and TMS vendors connecting to the SSG / SWDA APIs. Tick each item before you go live.</p>
${CHECKLIST.map((s) => `<h2>${s.title}</h2><ul>${s.items.map((i) => `<li>&#9744; ${i}</li>`).join('')}</ul>`).join('')}
<p class="f">${COMPANY.name} · ${COMPANY.site} · ${COMPANY.email} · ${COMPANY.phone}<br/>API reference and examples: https://ssgapi.tertiaryinfotech.com/</p></body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿', html], { type: 'application/msword' }));
  a.download = 'SSG-API-Integration-Checklist.doc';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ServicesPage({ user }: { user: AuthUser | null }) {
  const liveApis = ALL_APIS.filter((a) => a.auth !== 'local').length;
  const services = [
    { t: 'SSG API integration for your TMS or LMS', d: 'Course runs, enrolment, attendance, assessments, grants and claims wired into your own system, so staff stop keying the same record into TPGateway twice.' },
    { t: 'API subscription and Developer Portal tickets', d: 'We prepare the subscription form and business use cases, raise the ticket, and follow it through to approval.' },
    { t: 'Conformance testing', d: 'We run SSG’s UAT test scenarios for each API, record the evidence, and return the completed workbooks.' },
    { t: 'Certificates, keys and encryption', d: 'mTLS certificates, AES-256 payload encryption and key rotation set up correctly and kept out of your source code.' },
    { t: 'Rescue and upgrades', d: 'Calls suddenly returning 403 or “Api Version has expired”? We find the cause and move you to the working version.' },
    { t: 'A ready-made AI LMS/TMS', d: 'Prefer not to build? Our AI-LMS-TMS already talks to the SSG APIs end to end.' },
  ];
  return (
    <div className="pub">
      <TopBar user={user} active="services" />
      <main className="mk">
        <section className="mk-hero mk-hero-split">
          <div>
            <span className="mk-kicker">SSG API integration services · Singapore</span>
            <h1>Connect your TMS to the SSG API, without the trial and error.</h1>
            <p>We integrate the SSG / SWDA APIs for training providers and TMS vendors: subscription, certificates, conformance tests and the code itself. The same team runs these APIs in production every day.</p>
            <ul className="mk-proof">
              <li><b>{liveApis}</b> SSG / SWDA APIs documented with working examples</li>
              <li><b>13</b> TPGateway steps mapped to the APIs that automate them</li>
              <li><b>4</b> SSG apps run in production (certificate and OAuth)</li>
            </ul>
            <div className="mk-quick">
              <a className="pub-btn" href="#get-checklist" onClick={(e) => { e.preventDefault(); document.getElementById('get-checklist')?.scrollIntoView({ behavior: 'smooth' }); }}>Get the free checklist</a>
              <a className="pub-btn ghost" href={COMPANY.site} target="_blank" rel="noopener">About Tertiary Infotech ↗</a>
            </div>
          </div>
          <aside className="mk-card mk-magnet" id="get-checklist">
            <span className="mk-kicker">Free download</span>
            <h2>SSG API Integration Checklist</h2>
            <p className="mk-sub">The six stages from Developer Portal app to go-live, with the checks that catch the usual failures. Tell us where to reach you and download it straight away.</p>
            <LeadForm source="ssg-api-services-checklist" compact cta="Get the checklist →">
              {() => <button className="pub-btn" onClick={downloadChecklist}>Download the checklist (.doc)</button>}
            </LeadForm>
          </aside>
        </section>

        <section className="mk-section">
          <h2>What we do</h2>
          <div className="mk-grid">
            {services.map((s) => <div key={s.t} className="mk-tile"><h3>{s.t}</h3><p>{s.d}</p></div>)}
          </div>
        </section>

        <section className="mk-section">
          <h2>What is in the checklist</h2>
          <div className="mk-grid">
            {CHECKLIST.map((s) => <div key={s.title} className="mk-tile"><h3>{s.title}</h3><p>{s.items.length} checks, starting with: {s.items[0].toLowerCase()}.</p></div>)}
          </div>
        </section>

        <section className="mk-section">
          <h2>How an engagement runs</h2>
          <ol className="mk-steps wide">
            <li><b>Free 30-minute consultation.</b> You show us your system and what you need from SSG.</li>
            <li><b>Scope and quote.</b> Which APIs, which app, what has to be subscribed and tested.</li>
            <li><b>Subscription and conformance.</b> We handle the tickets and UAT evidence with SSG.</li>
            <li><b>Build and go live.</b> Integration delivered, tested with a real class, handed over with documentation.</li>
          </ol>
        </section>

        <section className="pub-cta">
          <div>
            <h3>Rather build it yourself?</h3>
            <p>Everything we know about calling the APIs is in the free reference, with examples in curl, Python and JavaScript.</p>
          </div>
          <div className="mk-quick">
            <a className="pub-btn ghost" href="/">Open the API reference</a>
            <a className="pub-btn" href="/contact">Talk to us</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
