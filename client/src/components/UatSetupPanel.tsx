import { useEffect, useRef, useState } from 'react';
import './UatSetupPanel.css';

interface Validation { valid: boolean; checks: { name: string; pass: boolean }[]; certificate: { fingerprint: string; validFrom: string; expiresAt: string } | null }
interface SetupStatus {
  canSave: boolean; hasSaved: boolean; source: string; savedAt: string | null; savedBy: string | null; expectedFingerprint: string; keyReplyDate: string; error?: string;
  readiness: { ready: boolean; missing: string[]; fingerprint: string | null; certificateExpires: string | null }; validation?: Validation;
}
const API = '/api/admin/uat';
const date = (value: string) => new Date(value).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' });
async function api<T>(path = '', body?: unknown): Promise<T> {
  const response = await fetch(API + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || 'UAT setup could not be completed.'), { validation: result.validation });
  return result;
}
export default function UatSetupPanel({ onSaved }: { onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<SetupStatus | null>(null); const [certificate, setCertificate] = useState(''); const [privateKey, setPrivateKey] = useState(''); const [encryptionKey, setEncryptionKey] = useState('');
  const [expected, setExpected] = useState(''); const [replyDate, setReplyDate] = useState(''); const [confirmed, setConfirmed] = useState(false); const [validation, setValidation] = useState<Validation | null>(null);
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [inputVersion, setInputVersion] = useState(0); const fileSequence = useRef({ certificate: 0, key: 0 });
  useEffect(() => { void api<SetupStatus>().then(value => { setStatus(value); setExpected(value.expectedFingerprint); setReplyDate(value.keyReplyDate); }).catch(e => setError(e.message)); const sequence = fileSequence.current; return () => { sequence.certificate++; sequence.key++; }; }, []);
  const changed = () => { setValidation(null); setMessage(''); setError(''); };
  const loadFile = async (kind: 'certificate' | 'key', file?: File) => {
    const sequence = ++fileSequence.current[kind];
    changed(); if (kind === 'certificate') setCertificate(''); else setPrivateKey(''); if (!file) return;
    try {
      if (file.size > 128 * 1024) throw new Error('Select a PEM file smaller than 128 KB.');
      const value = await file.text(); if (sequence !== fileSequence.current[kind]) return;
      if (kind === 'certificate') setCertificate(value); else setPrivateKey(value);
    } catch (e) { setError(e instanceof Error ? e.message : 'The PEM file could not be read.'); }
  };
  const payload = () => ({ certificate, privateKey, encryptionKey, expectedFingerprint: expected, keyReplyDate: replyDate, sourceConfirmed: confirmed });
  const act = async (name: string, work: () => Promise<void>) => { setBusy(name); setError(''); setMessage(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'UAT setup failed.'); if (e instanceof Error && 'validation' in e && e.validation) setValidation(e.validation as Validation); } finally { setBusy(''); } };
  if (!status) return <section className="uat-setup"><h3>UAT Setup</h3>{error ? <p role="alert" className="error-alert">{error}</p> : <p role="status">Checking UAT configuration…</p>}</section>;
  const complete = !!certificate.trim() && !!privateKey.trim() && !!encryptionKey.trim() && !!expected.trim() && !!replyDate && confirmed;
  return <section className="uat-setup" aria-labelledby="uat-setup-heading">
    <header className="uat-setup-heading"><div><p className="ticket-eyebrow">ADMIN / UAT CREDENTIALS</p><h3 id="uat-setup-heading">UAT Setup</h3><p>Select the files and encryption key supplied for your UAT application.</p></div><span className={`uat-setup-state ${status.readiness.ready ? 'ready' : ''}`}>{status.readiness.ready ? 'UAT credentials ready' : 'Setup needed'}</span></header>
    <div className="uat-setup-status"><b>Active source: {status.source}</b>{status.savedAt && <p>Saved {date(status.savedAt)} by {status.savedBy}</p>}{status.readiness.fingerprint && <p>Certificate SHA-256: <code>{status.readiness.fingerprint}</code></p>}{status.readiness.certificateExpires && <p>Certificate expires {date(status.readiness.certificateExpires)}</p>}
      {!status.readiness.ready && <ul>{status.readiness.missing.map(item => <li key={item}>{item}</li>)}</ul>}
      {status.error && <p role="alert">{status.error}</p>}
    </div>
    <p>Destination: <code>https://uat-api.ssg-wsg.sg</code>. This form configures UAT credentials only. Validation and saving do not run an API test.</p>
    {error && <p role="alert" className="error-alert">{error}</p>}{message && <p role="status" className="admin-status ok">{message}</p>}
    {!status.canSave && <p role="alert" className="error-alert">Encrypted settings are unavailable until the server session secret is configured. Uploaded credentials will not be saved.</p>}
    <fieldset disabled={!!busy} className="uat-setup-fields"><legend>{status.hasSaved ? 'Replace the saved UAT profile' : 'Load your UAT profile'}</legend>
      <div className="uat-setup-files"><label>1. UAT certificate (.pem)<input key={`certificate-${inputVersion}`} type="file" accept=".pem" onChange={e => { void loadFile('certificate', e.target.files?.[0]); }} /><small>Select the confirmed certificate dated 18 November 2026 for the current trainer test.</small></label>
        <label>2. Matching private key (.pem)<input key={`key-${inputVersion}`} type="file" accept=".pem,.key" onChange={e => { void loadFile('key', e.target.files?.[0]); }} /><small>Select the private key paired with that certificate.</small></label></div>
      <label>3. SWDA UAT encryption key<input type="password" value={encryptionKey} onChange={e => { setEncryptionKey(e.target.value); changed(); }} autoComplete="off" spellCheck={false} /><small>Paste the base64 key from SWDA’s UAT reply. It must decode to 32 bytes.</small></label>
      <label>Expected certificate SHA-256 fingerprint<input type="text" value={expected} onChange={e => { setExpected(e.target.value); changed(); }} autoComplete="off" spellCheck={false} /><small>Prefilled with the confirmed UAT fingerprint. Change it only for a provider-confirmed replacement certificate.</small></label>
      <label>SWDA encryption-key reply date<input type="date" value={replyDate} onChange={e => { setReplyDate(e.target.value); changed(); }} /></label>
      <label className="uat-setup-confirm"><input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); changed(); }} /><span>I confirm this is the UAT encryption key supplied by SWDA in the reply dated above.</span></label>
    </fieldset>
    <div className="uat-setup-actions"><button className="admin-btn ghost" disabled={!!busy || !complete} onClick={() => { void act('validate', async () => { setValidation(await api<Validation>('/validate', payload())); }); }}>{busy === 'validate' ? 'Validating…' : 'Validate credentials'}</button>
      <button className="admin-btn" disabled={!!busy || !complete || !status.canSave} onClick={() => { void act('save', async () => {
        const value = await api<SetupStatus>('', payload()); setStatus(value); setCertificate(''); setPrivateKey(''); setEncryptionKey(''); setConfirmed(false); setValidation(value.validation || null); fileSequence.current.certificate++; fileSequence.current.key++; setInputVersion(v => v + 1);
        setMessage('UAT credentials saved. Return to Run a test and load the data again before confirming a request. No API test was run.'); await onSaved();
      }); }}>{busy === 'save' ? 'Validating and saving…' : 'Validate and save UAT credentials'}</button></div>
    {validation && <section className="uat-setup-validation" aria-label="Credential validation"><h4>{validation.valid ? 'All validation checks passed' : 'Complete the failed checks'}</h4><ul>{validation.checks.map(check => <li key={check.name}><b className={check.pass ? 'pass' : 'fail'}>{check.pass ? 'Pass' : 'Fail'}</b> {check.name}</li>)}</ul>{validation.certificate && <p>Valid {date(validation.certificate.validFrom)} to {date(validation.certificate.expiresAt)}.</p>}</section>}
    <p className="ticket-caption">Private keys and encryption keys are encrypted in the portal’s server data folder and are never returned by this screen. They are not included in the workbench’s browser backup. If the server data folder resets after deployment, upload the credentials again or recover the full portal backup.</p>
  </section>;
}
