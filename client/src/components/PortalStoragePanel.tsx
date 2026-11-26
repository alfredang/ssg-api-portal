import { useCallback, useEffect, useState } from 'react';
import './PortalStoragePanel.css';
interface StorageStatus {
  directory: string; writable: boolean; deploymentVerifiedAt?: string | null; restartVerifiedAt?: string | null;
  lossDetectedAt?: string | null; error?: string; buckets?: { label: string; files: number; bytes: number }[];
}
const endpoint = '/api/admin/storage';
const date = (value: string) => new Date(value).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' });
async function request<T>(path = '', method = 'GET'): Promise<T> {
  const response = await fetch(endpoint + path, { method, credentials: 'include' }); const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The storage operation failed.'); return result;
}
export default function PortalStoragePanel() {
  const [status, setStatus] = useState<StorageStatus | null>(null); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { setStatus(await request<StorageStatus>()); }, []);
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, [refresh]);
  const action = async (work: () => Promise<void>) => { setBusy(true); setError(''); setMessage(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'The storage operation failed.'); } finally { setBusy(false); } };
  const verified = status?.writable && status.deploymentVerifiedAt && !status.lossDetectedAt;
  return <section className="portal-storage-card" id="portal-storage" aria-labelledby="portal-storage-heading">
    <header><div><p className="portal-storage-eyebrow">SHARED PORTAL DATA</p><h2 id="portal-storage-heading">Server data storage</h2><p>Users, defaults, saved settings and test evidence use the same server folder.</p></div><span className={`portal-storage-badge ${verified ? 'verified' : ''}`}>{verified ? 'Retained after app update' : status ? status.writable ? 'Retention not verified' : 'Storage unavailable' : 'Checking storage'}</span></header>
    {error && <p role="alert" className="error-alert">{error}</p>}{message && <p role="status">{message}</p>}
    {status && <>
      {status.error && <p role="alert" className="error-alert">{status.error}</p>}
      {status.lossDetectedAt && <p role="alert">A storage marker is missing. Check the attachment and recover missing data before preparing a new verification.</p>}
      <dl className="portal-storage-facts"><div><dt>Shared folder</dt><dd><code>{status.directory}</code></dd></div><div><dt>Writes</dt><dd>{status.writable ? 'Available' : 'Unavailable'}</dd></div><div><dt>Retention across an app update</dt><dd>{verified ? date(status.deploymentVerifiedAt!) : 'Not yet verified'}</dd></div><div><dt>Retention across a restart</dt><dd>{status.restartVerifiedAt ? date(status.restartVerifiedAt) : 'Not yet verified'}</dd></div></dl>
      {!verified && <p>A writable folder can save files now. Its verification markers must survive a later application update before retention is marked verified.</p>}
      {!!status.buckets?.length && <div className="portal-storage-table"><table><thead><tr><th>Saved data</th><th>Files</th><th>Size</th></tr></thead><tbody>{status.buckets.map(bucket => <tr key={bucket.label}><td>{bucket.label}</td><td>{bucket.files}</td><td>{(bucket.bytes / 1024).toFixed(1)} KB</td></tr>)}</tbody></table></div>}
      <div className="portal-storage-actions"><button className="admin-btn ghost" disabled={busy} onClick={() => { void action(refresh); }}>Refresh storage check</button><button className="admin-btn" disabled={busy || !status.writable} onClick={() => { void action(async () => {
        const archive = await request<unknown>('/backup', 'POST'); const url = URL.createObjectURL(new Blob([JSON.stringify(archive)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'portal-data-encrypted-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('Encrypted backup prepared for download. Keep it private. Restore requires the original server encryption secret and an empty staging folder.');
      }); }}>Download encrypted portal backup</button></div>
      <details><summary>Prepare a deployment verification</summary><p>Back up the existing folder first. This places a marker in the shared folder and both test-history folders. It does not deploy the app or call SWDA.</p><button className="admin-btn ghost" disabled={busy || !status.writable} onClick={() => { void action(async () => { setStatus(await request<StorageStatus>('/verification', 'POST')); setMessage('Verification prepared. The markers must survive the next application update.'); }); }}>Prepare verification markers</button></details>
      <p className="portal-storage-footnote">The backup includes saved portal files and encrypted settings. Hosting credentials are managed separately. Restore is an operator action; this screen never replaces current users or settings.</p>
    </>}
  </section>;
}
