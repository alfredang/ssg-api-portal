import { useEffect, useState } from 'react';

// Admin-only console pages: Users, and Settings (the mail account used for
// enquiry emails and sign-in codes). The server enforces admin access; these
// pages are only shown in the menu to the admin.

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.reason || `Request failed (${res.status})`);
  return data as T;
}

interface User { email: string; role: 'admin' | 'member'; addedAt: string; addedBy: string; lastLogin: string | null }
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');

export function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ users: User[] }>('/api/admin/users').then((d) => setUsers(d.users)).catch((e) => setError(e.message)); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { const d = await api<{ users: User[] }>('/api/admin/users', { method: 'POST', body: JSON.stringify({ email }) }); setUsers(d.users); setEmail(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not add'); }
    setBusy(false);
  };
  const remove = async (u: User) => {
    if (!window.confirm(`Remove ${u.email}? They will no longer be able to sign in.`)) return;
    setError('');
    try { const d = await api<{ users: User[] }>(`/api/admin/users/${encodeURIComponent(u.email)}`, { method: 'DELETE' }); setUsers(d.users); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove'); }
  };

  return (
    <>
      <h2 className="page-title">Users</h2>
      <p className="admin-lead">Only the people listed here can sign in, with Google or an emailed code. There is one admin; everyone else is a member who can use the console but cannot manage users or settings.</p>
      {error && <div className="error-alert">{error}</div>}

      <form className="admin-card admin-add" onSubmit={add}>
        <label htmlFor="new-user">Add a user</label>
        <div>
          <input id="new-user" type="email" required placeholder="name@tertiaryinfotech.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="admin-btn" disabled={busy}>{busy ? 'Adding…' : 'Add user'}</button>
        </div>
      </form>

      {users && (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Role</th><th>Last sign-in</th><th>Added</th><th>Added by</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email}>
                  <td><b>{u.email}</b></td>
                  <td><span className={`admin-role ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Member'}</span></td>
                  <td>{when(u.lastLogin)}</td>
                  <td>{when(u.addedAt)}</td>
                  <td>{u.addedBy}</td>
                  <td>{u.role === 'admin' ? <span className="admin-muted">Cannot be removed</span> : <button className="admin-link danger" onClick={() => remove(u)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

type Field = { secret: true; set: boolean; source: string | null } | { secret: false; value: string; envValue: string; source: string | null };
interface MailState { fields: Record<string, Field>; transport: string | null }
const TRANSPORT_LABEL: Record<string, string> = { gmail: 'Gmail API', resend: 'Resend', smtp: 'SMTP' };

export function SettingsPage() {
  const [state, setState] = useState<MailState | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');

  const apply = (d: MailState) => { setState(d); setDraft({}); };
  useEffect(() => { api<MailState>('/api/admin/settings/mail').then(apply).catch((e) => setMsg({ ok: false, text: e.message })); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy('save'); setMsg(null);
    try { apply(await api<MailState>('/api/admin/settings/mail', { method: 'PUT', body: JSON.stringify(draft) })); setMsg({ ok: true, text: 'Saved.' }); }
    catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save' }); }
    setBusy('');
  };
  const test = async () => {
    setBusy('test'); setMsg(null);
    try { const r = await api<{ via: string }>('/api/admin/settings/mail/test', { method: 'POST' }); setMsg({ ok: true, text: `Test email sent via ${TRANSPORT_LABEL[r.via] || r.via}. Check the enquiry recipients' inbox.` }); }
    catch (err) { setMsg({ ok: false, text: `Test failed: ${err instanceof Error ? err.message : 'error'}` }); }
    setBusy('');
  };

  if (!state) return <><h2 className="page-title">Settings</h2>{msg && <div className="error-alert">{msg.text}</div>}</>;

  const input = (name: string, label: string, opts: { placeholder?: string; hint?: string } = {}) => {
    const f = state.fields[name];
    const value = draft[name] ?? (f.secret ? '' : f.value);
    const placeholder = f.secret ? (f.set ? `Saved (${f.source}). Type to replace.` : opts.placeholder || '') : (f.envValue ? `${f.envValue} (from environment)` : opts.placeholder || '');
    return (
      <label key={name}>
        <span>{label}{f.secret && f.set && <em className="admin-set">set</em>}</span>
        <input type={f.secret ? 'password' : 'text'} autoComplete="off" spellCheck={false} value={value} placeholder={placeholder} onChange={(e) => setDraft({ ...draft, [name]: e.target.value })} />
        {opts.hint && <small>{opts.hint}</small>}
      </label>
    );
  };

  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="admin-lead">The mail account used to send enquiry emails and sign-in codes. Values saved here are encrypted on the server; passwords and tokens are never shown again.</p>
      <div className={`admin-status ${state.transport ? 'ok' : 'warn'}`}>
        {state.transport ? <>Email is sent with <b>{TRANSPORT_LABEL[state.transport]}</b>.</> : <>No mail account is set up. Enquiries are stored but <b>not emailed</b>, and sign-in codes cannot be sent.</>}
      </div>
      {msg && <div className={msg.ok ? 'admin-status ok' : 'error-alert'} role="status">{msg.text}</div>}

      <form onSubmit={save}>
        <fieldset className="admin-card admin-fields">
          <legend>Enquiry emails</legend>
          {input('LEAD_EMAIL_TO', 'Send enquiries to', { placeholder: 'angch@tertiaryinfotech.com', hint: 'Separate several addresses with commas.' })}
          {input('LEAD_REPLY_TO', 'Reply-to on the acknowledgement', { placeholder: 'enquiry@tertiaryinfotech.com' })}
          {input('LEAD_AUTOREPLY', 'Send an acknowledgement to the enquirer', { placeholder: 'true', hint: 'true or false.' })}
          {input('EMAIL_FROM_LEADS', 'Sender (Resend and SMTP only)', { placeholder: 'SSG API Portal <enquiry@tertiaryinfotech.com>' })}
        </fieldset>

        <fieldset className="admin-card admin-fields">
          <legend>Option 1: Gmail API <span>(as tertiaryinfotech.com)</span></legend>
          {input('GMAIL_USER', 'Gmail address', { placeholder: 'enquiry@tertiaryinfotech.com' })}
          {input('GMAIL_CLIENT_ID', 'OAuth client ID')}
          {input('GMAIL_CLIENT_SECRET', 'OAuth client secret')}
          {input('GMAIL_REFRESH_TOKEN', 'Refresh token')}
        </fieldset>

        <fieldset className="admin-card admin-fields">
          <legend>Option 2: SMTP <span>(for Gmail: smtp.gmail.com, port 587, an app password)</span></legend>
          {input('SMTP_HOST', 'Host', { placeholder: 'smtp.gmail.com' })}
          {input('SMTP_PORT', 'Port', { placeholder: '587' })}
          {input('SMTP_SECURE', 'Secure (port 465)', { placeholder: 'false' })}
          {input('SMTP_USER', 'Username')}
          {input('SMTP_PASS', 'Password or app password')}
        </fieldset>

        <fieldset className="admin-card admin-fields">
          <legend>Option 3: Resend <span>(the sender’s domain must be verified at Resend)</span></legend>
          {input('RESEND_API_KEY', 'API key', { placeholder: 're_…' })}
        </fieldset>
        <p className="admin-muted">If more than one option is filled in, the first complete one is used: Gmail API, then Resend, then SMTP.</p>

        <div className="admin-actions">
          <button type="submit" className="admin-btn" disabled={busy !== '' || Object.keys(draft).length === 0}>{busy === 'save' ? 'Saving…' : 'Save settings'}</button>
          <button type="button" className="admin-btn ghost" disabled={busy !== '' || !state.transport} onClick={test}>{busy === 'test' ? 'Sending…' : 'Send a test email'}</button>
        </div>
      </form>
    </>
  );
}

// ── Certificates & Keys (admin only) ────────────────────────────
interface CertApp {
  id: string; name: string; type: 'certificate' | 'oauth'; loaded: boolean; portalExpiry: string;
  subject?: string; issuer?: string; validFrom?: string; validTo?: string; fingerprint256?: string; serialNumber?: string; certError?: string;
  hasPrivateKey?: boolean; hasEncryptionKey?: boolean; hasSignatureKey?: boolean; hasClientId?: boolean; hasClientSecret?: boolean;
}
interface AuditRow { at: string; user: string; action: string; app?: string; what?: string }
const ITEM_LABEL: Record<string, string> = { certificate: 'Certificate (public PEM)', privateKey: 'Private key (PEM)', encryptionKey: 'Encryption key (AES-256, base64)', signatureKey: 'Signature private key (PEM)', clientId: 'Client ID', clientSecret: 'Client secret' };
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const daysLeft = (iso?: string) => (iso ? Math.floor((new Date(iso).getTime() - Date.now()) / 864e5) : null);

function Expiry({ label, iso }: { label: string; iso?: string }) {
  const left = daysLeft(iso);
  const cls = left === null ? 'none' : left < 0 ? 'expired' : left <= 90 ? 'soon' : 'funded';
  return (
    <div className="ck-expiry">
      <span>{label}</span>
      <b>{day(iso)}</b>
      {left !== null && <i className={`fund ${cls}`}>{left < 0 ? `Expired ${-left} days ago` : left > 3650 ? `${Math.round(left / 365)} years left` : `${left} days left`}</i>}
    </div>
  );
}

export function CertificatesPage() {
  const [apps, setApps] = useState<CertApp[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');
  const [shown, setShown] = useState<{ app: string; what: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => api<{ apps: CertApp[]; audit: AuditRow[] }>('/api/admin/certs').then((d) => { setApps(d.apps); setAuditLog(d.audit); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  // A revealed value is taken off the screen again after a minute.
  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setShown(null), 60000);
    return () => window.clearTimeout(t);
  }, [shown]);

  const reveal = async (app: CertApp, what: string) => {
    if (!window.confirm(`Show the ${ITEM_LABEL[what]} for ${app.name}?\n\nThis is recorded in the access log with your name and the time.`)) return;
    setError(''); setCopied(false);
    try {
      const d = await api<{ value: string; audit: AuditRow[] }>('/api/admin/certs/reveal', { method: 'POST', body: JSON.stringify({ app: app.id, what }) });
      setShown({ app: app.id, what, value: d.value }); setAuditLog(d.audit);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not show it'); }
  };
  const savePortalDate = async (app: CertApp, date: string) => {
    setError('');
    try { await api(`/api/admin/certs/${app.id}/portal-expiry`, { method: 'PUT', body: JSON.stringify({ date }) }); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save'); }
  };
  const download = (name: string, value: string) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([value.endsWith('\n') ? value : value + '\n'], { type: 'text/plain' })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  };
  const fileName = (app: string, what: string) => (what === 'certificate' ? `ssg-${app}-cert.pem` : what === 'privateKey' ? `ssg-${app}-key.pem` : what === 'signatureKey' ? `ssg-${app}-signature-key.pem` : `ssg-${app}-${what}.txt`);

  const item = (app: CertApp, what: string, present: boolean | undefined) => (
    <li key={what}>
      <span className={`ck-dot ${present ? 'on' : ''}`} aria-hidden="true" />
      <span className="ck-item">{ITEM_LABEL[what]}<small>{present ? 'Loaded on the server' : 'Not set'}</small></span>
      {present && (shown?.app === app.id && shown.what === what
        ? <button className="admin-link" onClick={() => setShown(null)}>Hide</button>
        : <button className="admin-link" onClick={() => reveal(app, what)}>Reveal</button>)}
    </li>
  );

  return (
    <>
      <h2 className="page-title">Certificates &amp; Keys</h2>
      <p className="admin-lead">The credentials the server uses for App 1 to App 4. Details and expiry dates are shown here; the values themselves stay hidden until you press Reveal, and every reveal is logged. Only the admin can open this page.</p>
      {error && <div className="error-alert">{error}</div>}
      {!apps && !error && <p className="admin-muted">Loading…</p>}
      <div className="ck-grid">
        {apps?.map((a) => (
          <section key={a.id} className="admin-card ck-card">
            <header>
              <h3>{a.name}</h3>
              <span className={`fund ${a.loaded ? 'funded' : 'expired'}`}>{a.loaded ? 'Loaded' : 'Not configured'}</span>
              <span className="admin-role member">{a.type === 'oauth' ? 'OAuth client' : 'mTLS certificate'}</span>
            </header>
            {a.type === 'certificate' && a.loaded && (
              <>
                <div className="ck-dates">
                  <Expiry label="Certificate expires" iso={a.validTo} />
                  <div className="ck-expiry">
                    <span>Developer Portal expiry</span>
                    <input type="date" defaultValue={a.portalExpiry} onBlur={(e) => { if (e.target.value !== a.portalExpiry) savePortalDate(a, e.target.value); }} aria-label={`Developer Portal expiry date for ${a.name}`} />
                    {a.portalExpiry ? <i className={`fund ${(daysLeft(a.portalExpiry) ?? 0) < 0 ? 'expired' : (daysLeft(a.portalExpiry) ?? 999) <= 90 ? 'soon' : 'funded'}`}>{daysLeft(a.portalExpiry)} days left</i> : <small>Enter the date the portal shows</small>}
                  </div>
                </div>
                <dl className="ck-meta">
                  <div><dt>Subject</dt><dd>{a.subject}</dd></div>
                  <div><dt>Valid from</dt><dd>{day(a.validFrom)}</dd></div>
                  <div><dt>SHA-256 fingerprint</dt><dd><code>{a.fingerprint256}</code></dd></div>
                </dl>
                {a.certError && <div className="error-alert">Could not read the certificate: {a.certError}</div>}
              </>
            )}
            {a.type === 'oauth' && <p className="admin-muted">App 4 signs in with a client ID and secret and has no certificate, so there is no PEM or certificate expiry. Access tokens last about 30 minutes and are fetched automatically.</p>}
            <ul className="ck-items">
              {a.type === 'certificate'
                ? [item(a, 'certificate', a.loaded), item(a, 'privateKey', a.hasPrivateKey), item(a, 'encryptionKey', a.hasEncryptionKey), item(a, 'signatureKey', a.hasSignatureKey)]
                : [item(a, 'clientId', a.hasClientId), item(a, 'clientSecret', a.hasClientSecret)]}
            </ul>
            {shown?.app === a.id && (
              <div className="ck-shown">
                <div><b>{ITEM_LABEL[shown.what]}</b><span>Hidden again after one minute</span></div>
                <textarea readOnly rows={shown.value.includes('\n') ? 8 : 2} value={shown.value} spellCheck={false} onFocus={(e) => e.target.select()} />
                <div className="admin-actions">
                  <button className="admin-btn ghost" onClick={() => navigator.clipboard?.writeText(shown.value).then(() => setCopied(true))}>{copied ? 'Copied' : 'Copy'}</button>
                  <button className="admin-btn ghost" onClick={() => download(fileName(a.id, shown.what), shown.value)}>Download</button>
                  <button className="admin-btn ghost" onClick={() => setShown(null)}>Hide now</button>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      <h3 className="ck-h">Access log</h3>
      <div className="admin-card admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>When</th><th>Who</th><th>App</th><th>What was shown</th></tr></thead>
          <tbody>
            {auditLog.map((r, i) => <tr key={i}><td>{when(r.at)}</td><td>{r.user}</td><td>{r.app?.replace('app', 'App ')}</td><td>{ITEM_LABEL[r.what || ''] || r.what}</td></tr>)}
            {auditLog.length === 0 && <tr><td colSpan={4} className="admin-muted">Nothing has been revealed yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
