// Encrypted, authenticated recovery copies. The existing session secret stays
// on the server; neither credentials nor plaintext evidence enter browser storage.
const crypto = require('node:crypto');
const store = require('./api-test-store');
const legacy = require('./conformance-records');
const templates = require('./api-test-templates');
const FORMAT = 'api-uat-backup-v1';
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'dev-insecure-secret-change-me') throw new Error('Browser backup needs a stable SESSION_SECRET configured on the server.');
  return crypto.hkdfSync('sha256', secret, 'api-uat-backup', FORMAT, 32);
}
async function create(owner, pending) {
  const groups = Object.fromEntries(await Promise.all(['runs', 'templates', 'notes'].map(async group => [group, await store.list(group)])));
  const old = await legacy.list();
  if (pending) {
    const draft = await store.get('drafts', pending.draftId);
    if (!draft || draft.createdBy !== owner || draft.digest !== pending.digest || draft.blockers.length || !draft.credential.ready || Date.now() - Date.parse(draft.createdAt) > 30 * 60 * 1000) throw new Error('Load a ready request before preparing its recovery copy.');
    const id = draft.id.replace(/^draft-/, 'run-');
    if (!groups.runs.some(r => r.id === id)) {
      const t = draft.template;
      groups.runs.push({ id, draftId: draft.id, templateId: t.id, templateRevision: t.revision, templateSnapshot: t, ticket: t.ticket || '', caseId: t.caseId || t.id, title: t.name,
        classification: t.classification, kind: 'Recovery record', origin: 'Browser recovery', state: draft.request.method === 'GET' ? 'completed' : 'uncertain', outcome: 'unknown', at: new Date().toISOString(), executedBy: owner,
        request: draft.request, inputs: draft.inputs, resource: draft.resource, application: draft.application, applicationId: draft.applicationId, testUen: draft.testUen,
        sourceRunId: draft.sourceRunId, dependencyRunId: draft.dependencyRunId, workflowId: draft.workflowId, response: null,
        interpretation: 'Confirmation was prepared, but its final result was not captured in this backup. The request may or may not have reached UAT. Confirm the provider outcome before another write.' });
    }
  }
  const at = new Date().toISOString();
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv); cipher.setAAD(Buffer.from(FORMAT));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ owner, at, groups, legacy: old })), cipher.final()]);
  if (encrypted.length > 6 * 1024 * 1024) throw new Error('This recovery copy exceeds the browser backup limit. Keep original evidence files and configure shared durable storage for larger workbooks.');
  return { format: FORMAT, owner, at, runIds: [...old, ...groups.runs].map(r => r.id), resultIds: groups.runs.filter(r => r.response).map(r => r.id), templateKeys: groups.templates.map(t => `${t.id}:${t.revision}`), noteKeys: groups.notes.map(n => `${n.id}:${templates.digest(n)}`),
    iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), encrypted: encrypted.toString('base64') };
}
function open(archive, owner) {
  try {
    if (archive?.format !== FORMAT || typeof archive.encrypted !== 'string' || archive.encrypted.length > 12 * 1024 * 1024) throw new Error();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(archive.iv, 'base64')); decipher.setAAD(Buffer.from(FORMAT)); decipher.setAuthTag(Buffer.from(archive.tag, 'base64'));
    const data = JSON.parse(Buffer.concat([decipher.update(Buffer.from(archive.encrypted, 'base64')), decipher.final()]).toString());
    if (data.owner !== owner || !Array.isArray(data.legacy) || !data.groups) throw new Error();
    for (const group of ['runs', 'templates', 'notes']) if (!Array.isArray(data.groups[group]) || data.groups[group].some(r => !store.valid(r.id))) throw new Error();
    if (data.legacy.some(r => !/^(?:import|run)-[a-f0-9-]+$/.test(r.id))) throw new Error();
    return data;
  } catch { throw new Error('This backup cannot be verified for this account and server. Use the original private evidence files if the server session secret changed.'); }
}
async function restore(archive, owner) {
  const data = open(archive, owner); let restored = 0;
  const existing = new Set((await store.history()).map(r => r.id));
  // Existing server results/reconciliations win. A verified actual response may
  // replace its conservative recovery marker. Never restore executable drafts.
  for (const record of data.legacy) if (!existing.has(record.id)) { await legacy.save(record, true); existing.add(record.id); restored++; }
  for (const record of data.groups.runs) {
    if (!existing.has(record.id)) { await store.save('runs', record.id, record, true); existing.add(record.id); restored++; }
    else {
      const current = await store.get('runs', record.id);
      if (current?.origin === 'Browser recovery' && !current.review && record.origin === 'Portal UAT run' && record.response && templates.digest(current.request) === templates.digest({ ...record.request, encryptedBody: undefined })) { await store.save('runs', record.id, record); restored++; }
    }
  }
  for (const group of ['templates', 'notes']) for (const record of data.groups[group]) {
    const current = await store.get(group, record.id);
    if (!current) await store.save(group, record.id, record, true);
    else if (group === 'templates' && record.revision > current.revision) await store.save(group, record.id, record);
  }
  // Pending restored records themselves block later writes. Drafts and stale
  // filesystem locks are deliberately not restored.
  return { restored };
}
module.exports = { create, restore, open };
