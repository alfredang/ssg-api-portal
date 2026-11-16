import { useEffect, useState } from 'react';

interface Lead { at: string; source: string; name: string; email: string; company: string; phone: string; preferredDemo: string; message: string }

/** Console page (signed-in staff): enquiries from the Contact and Services pages. */
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/leads', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Could not load enquiries (${r.status})`))))
      .then((d) => setLeads(d.leads))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h2 className="page-title">Enquiries</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px' }}>Sent from the Contact and SSG API Services pages. Newest first.</p>
      {error && <div className="error-alert">{error}</div>}
      {leads && leads.length === 0 && <p>No enquiries yet.</p>}
      {leads && leads.length > 0 && (
        <div className="course-result" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="sessions-table">
            <thead><tr><th>Received</th><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>From</th><th>Message</th></tr></thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.at).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{l.name}</td><td>{l.company}</td>
                  <td><a href={`mailto:${l.email}`}>{l.email}</a></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.phone}</td>
                  <td>{l.source}</td>
                  <td style={{ minWidth: 260, whiteSpace: 'pre-wrap' }}>{l.message}{l.preferredDemo ? `\nPreferred demo: ${l.preferredDemo}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
