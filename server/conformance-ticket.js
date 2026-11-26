const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { requireAdmin, getCurrentUser } = require('./auth');
const archive = require('./conformance-records');
const uat = require('./uat');
const router = express.Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const who = req => getCurrentUser(req)?.email || 'Local tester';
const publicRecord = ({ evidence, identityHash, ...record }) => record;
const unresolved = records => records.find(r => r.origin === 'Portal UAT run' && ['running', 'uncertain'].includes(r.state) && !r.review);
let queue = Promise.resolve();
function serial(work) { const next = queue.then(work, work); queue = next.catch(() => {}); return next; }
const route = work => (req, res, next) => Promise.resolve(work(req, res)).catch(next);
async function payloadFor(prep) {
  if (!prep) return null;
  const records = await archive.list();
  const fixture = records.find(r => r.caseId === 'TS01' && r.request.body?.trainer && r.source?.original);
  if (!fixture) throw new Error('Import the original TS01 evidence before preparing a live request. Sanitized history is view-only.');
  const payload = structuredClone(fixture.request.body);
  payload.trainer.idNumber = prep.idNumber;
  payload.trainer.idType = { code: prep.idType };
  payload.trainer.name = `trainer DP15411-${prep.revision.slice(0, 8)}`;
  payload.trainer.domainAreaOfPractice = `EduTrust DP15411-${prep.revision.slice(0, 8)}`;
  return payload;
}
router.get('/', route(async (req, res) => {
  const records = await archive.list(); const prep = await archive.preparation(); const blocked = unresolved(records);
  const credential = uat.credentials().status;
  const hasOriginalFixture = records.some(r => r.caseId === 'TS01' && r.request.body?.trainer && r.source?.original);
  const ready = credential.ready && credential.hasEncryptionKey && credential.encryptionSourceConfirmed && hasOriginalFixture && !!prep && !blocked && !records.some(r => r.preparationRevision === prep.revision);
  const context = records.find(r => r.kind === 'Functional test');
  res.json({ ticket: 'DP-15411', name: 'Add TP Trainers v2.0', application: context?.application || 'Import the recorded test evidence to begin', applicationId: context?.applicationId || null, uen: context?.testUen || '', credential,
    canManage: getCurrentUser(req)?.role === 'admin', preparation: prep, preview: hasOriginalFixture ? await payloadFor(prep) : null, hasOriginalFixture, ready,
    blocker: blocked ? 'A previous attempt needs reconciliation before another Add.' : !prep ? 'Waiting for SWDA: unused synthetic trainer identity and ID type.' : !credential.ready || !credential.hasEncryptionKey || !credential.encryptionSourceConfirmed ? 'Configure the confirmed UAT certificate and the SWDA 24 November encryption key.' : 'Ready for one reviewed TS01 UAT request.',
    runs: records.map(publicRecord) });
}));
router.get('/runs/:id/evidence', route(async (req, res) => {
  const record = (await archive.list()).find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Evidence not found.' });
  const filename = `${record.ticket}-${record.id}${record.source?.original ? '' : '-sanitized'}.json`;
  res.attachment(filename).type('json').send(JSON.stringify(record.evidence || publicRecord(record)));
}));
router.post('/import', requireAdmin, route(async (req, res) => {
  const { report, filename } = req.body || {};
  if (!report || typeof report !== 'object' || !/\.json$/i.test(filename || '')) return res.status(400).json({ error: 'Select a JSON evidence report.' });
  const reports = report.format === 'DP15411-evidence-bundle-v1' && Array.isArray(report.reports) ? report.reports : [{ report, filename }];
  if (reports.length > 30) return res.status(400).json({ error: 'Import at most 30 reports at a time.' });
  for (const item of reports) archive.normalize(item.report, item.filename, who(req));
  const imported = await serial(async () => { let count = 0; for (const item of reports) count += await archive.importReport(item.report, item.filename, who(req)); return count; });
  res.json({ imported });
}));
router.put('/preparation', requireAdmin, route(async (req, res) => {
  const { idNumber, idType, sourceReference, syntheticConfirmed, scope } = req.body || {};
  if (typeof idNumber !== 'string' || !/^[A-Za-z0-9-]{5,30}$/.test(idNumber) || typeof idType !== 'string' || !/^[A-Za-z0-9]{1,12}$/.test(idType)
      || typeof sourceReference !== 'string' || sourceReference.trim().length < 8 || sourceReference.length > 500 || syntheticConfirmed !== true || scope !== 'add-only-retain') return res.status(400).json({ error: 'Enter SWDA’s synthetic identity, ID type and reply reference, and confirm the Add-only scope.' });
  await serial(async () => {
    const records = await archive.list();
    if (unresolved(records)) throw new Error('Reconcile the existing attempt before preparing another Add.');
    if (!records.some(r => r.caseId === 'TS01' && r.source?.original && r.request.body?.trainer)) throw new Error('Import the original TS01 evidence before preparing a live request.');
    if (records.some(r => r.identityHash === archive.sha(idNumber.toUpperCase()) || r.request.body?.trainer?.idNumber?.toUpperCase() === idNumber.toUpperCase())) throw new Error('This identity already appears in an Add attempt. Obtain a fresh unused identity from SWDA.');
    await archive.savePreparation({ idNumber, idType, sourceReference: sourceReference.trim(), syntheticConfirmed, scope, revision: crypto.randomUUID(), preparedAt: new Date().toISOString(), preparedBy: who(req) });
  });
  res.json({ saved: true });
}));
router.post('/run', requireAdmin, route(async (req, res) => {
  const { revision, confirmation } = req.body || {};
  const run = await serial(async () => {
    const records = await archive.list();
    const prior = records.find(r => r.preparationRevision === revision);
    if (prior) return prior; // Repeated clicks never replay an outbound request.
    if (unresolved(records)) throw new Error('Reconcile the previous Add attempt before running another.');
    const prep = await archive.preparation();
    if (!prep || revision !== prep.revision || confirmation !== 'RUN TS01 ON UAT') throw new Error('Review the current request and confirm the TS01 UAT run.');
    const status = uat.credentials().status;
    if (!status.ready || !status.hasEncryptionKey || !status.encryptionSourceConfirmed) throw new Error('The confirmed UAT certificate and SWDA 24 November encryption key must be configured first.');
    const body = await payloadFor(prep);
    const context = records.find(r => r.caseId === 'TS01' && r.source?.original && r.request.body?.trainer);
    const target = archive.targetOf(context?.request || {});
    if (!target) throw new Error('Import the original TS01 request URL before running.');
    const id = `run-${crypto.randomUUID()}`;
    const record = { id, ticket: 'DP-15411', caseId: 'TS01', kind: 'Functional test', origin: 'Portal UAT run', at: new Date().toISOString(), title: 'Add trainer — TS01', state: 'running', outcome: 'pending', executedBy: who(req), preparationRevision: prep.revision,
      application: context.application, applicationId: context.applicationId, testUen: context.testUen,
      interpretation: 'Request started. Do not retry until its outcome is known.', request: { method: 'POST', url: target.href, version: 'v2.0', encrypted: true, body }, response: null, scope: prep.scope, sourceReference: prep.sourceReference };
    // A durable lock also protects a second server process and survives restarts.
    const lockPath = path.join(archive.DIR(), 'live-run.lock');
    const lock = await fs.open(lockPath, 'wx').catch(() => { throw new Error('A UAT run is in progress or needs reconciliation.'); });
    try { await lock.writeFile(id); await lock.close(); await archive.save(record, true); }
    catch (err) { await lock.close().catch(() => {}); await fs.unlink(lockPath).catch(() => {}); throw err; }
    try {
      const response = await uat.send({ method: 'POST', url: target.href, headers: { 'x-api-version': 'v2.0' }, body: JSON.stringify(body), encrypt: true });
      record.response = { status: response.status, apiStatus: response.body?.status ?? null, body: response.body, rawBody: response.rawBody, ms: response.ms };
      record.request.encryptedBody = response.encryptedRequest;
      const trainerId = response.body?.data?.trainer?.id;
      const statusOK = response.status === 200 && Number(response.body?.status) === 200;
      record.trainerId = typeof trainerId === 'string' || typeof trainerId === 'number' ? String(trainerId) : null;
      record.outcome = statusOK && record.trainerId ? 'pass' : 'fail';
      // Any 2xx without an ID, server failure or unreadable response may hide a create.
      const certainFailure = response.status >= 400 && response.status < 500 && response.body && typeof response.body === 'object' && !record.trainerId;
      record.state = record.outcome === 'pass' || certainFailure ? 'completed' : 'uncertain';
      record.interpretation = record.outcome === 'pass' ? 'TS01 passed. Retain the new synthetic trainer for the next reviewed ticket; no cleanup was run.' : record.state === 'uncertain' ? 'The create outcome is uncertain. Preserve this evidence and reconcile with SWDA before another Add.' : 'SWDA rejected this Add. Review the response; this request will not be retried automatically.';
    } catch {
      record.state = 'uncertain'; record.outcome = 'pending'; record.interpretation = 'The request did not produce a confirmed response. Reconcile with SWDA before another Add.';
    }
    record.finishedAt = new Date().toISOString();
    await archive.save(record);
    if (record.state === 'completed') await fs.unlink(lockPath);
    return record;
  });
  res.json({ run: publicRecord(run) });
}));
router.post('/runs/:id/reconcile', requireAdmin, route(async (req, res) => {
  const { note, confirmed } = req.body || {};
  if (confirmed !== true || typeof note !== 'string' || note.trim().length < 20 || note.length > 2000) return res.status(400).json({ error: 'Record SWDA’s confirmed outcome and reference before clearing the hold.' });
  await serial(async () => {
    const records = await archive.list(); const record = records.find(r => r.id === req.params.id);
    if (!record || !['uncertain', 'running'].includes(record.state)) throw new Error('No unresolved attempt was found.');
    if (record.state === 'running' && Date.now() - Date.parse(record.at) < 120000) throw new Error('This request may still be in flight. Wait for its response before recording a reconciliation.');
    // A running request in this process holds the serial queue until it has finished.
    record.review = { at: new Date().toISOString(), by: who(req), note: note.trim() };
    await archive.save(record);
    await fs.unlink(path.join(archive.DIR(), 'live-run.lock')).catch(err => { if (err.code !== 'ENOENT') throw err; });
  });
  res.json({ saved: true });
}));
router.use((err, _req, res, _next) => { res.status(400).json({ error: err.code ? 'The evidence store is unavailable. Check persistent storage before continuing.' : err.message }); });
module.exports = router;
