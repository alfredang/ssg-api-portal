const express = require('express');
const crypto = require('node:crypto');
const { requireAdmin, getCurrentUser } = require('./auth');
const templates = require('./api-test-templates');
const store = require('./api-test-store');
const runner = require('./api-test-runner');
const legacy = require('./conformance-records');
const uat = require('./uat');
const backup = require('./api-test-backup');
const router = express.Router();
const user = req => getCurrentUser(req)?.email || 'Local tester';
const route = work => (req, res, next) => Promise.resolve(work(req, res)).catch(next);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const visibleDraft = ({ credentialVersion, ...draft }) => draft;
router.get('/', route(async (req, res) => {
  const history = await store.history(); const available = await templates.all();
  const context = history.find(r => r.testUen);
  res.json({ templates: available, runs: history.map(store.visible), canManage: getCurrentUser(req)?.role === 'admin',
    application: context?.application || '', testUen: context?.testUen || '', backupOwner: user(req),
    profiles: { 'uat-mtls': uat.readiness({ auth: 'uat-mtls' }), 'uat-oauth': uat.readiness({ auth: 'uat-oauth' }) },
    readiness: Object.fromEntries(available.map(t => [t.id, uat.readiness({ auth: t.auth, encrypt: t.encrypt })])),
    notes: (await store.list('notes')).map(({ file, ...note }) => note), environment: 'UAT', base: uat.BASE });
}));
router.post('/backup', requireAdmin, route(async (req, res) => res.json(await runner.serial(() => backup.create(user(req), req.body?.pending)))));
router.post('/backup/restore', requireAdmin, route(async (req, res) => res.json(await runner.serial(() => backup.restore(req.body?.archive, user(req))))));
router.get('/initial/:templateId', route(async (req, res) => res.json(await runner.initial(req.params.templateId, req.query.sourceRunId, req.query.dependencyRunId))));
router.post('/load', requireAdmin, route(async (req, res) => res.json({ draft: visibleDraft(await runner.load(req.body || {}, user(req))) })));
router.post('/run', requireAdmin, route(async (req, res) => res.json({ run: store.visible(await runner.run(req.body || {}, user(req))) })));
router.post('/runs/:id/reconcile', requireAdmin, route(async (req, res) => res.json({ run: store.visible(await runner.reconcile(req.params.id, req.body?.note, user(req))) })));
router.get('/runs/:id/evidence', route(async (req, res) => {
  const run = await store.findRun(req.params.id); if (!run) return res.status(404).json({ error: 'Evidence not found.' });
  res.attachment(`${run.id}-evidence.json`).json(run.evidence || store.visible(run));
}));
router.post('/templates', requireAdmin, route(async (req, res) => res.json({ template: await runner.serial(() => templates.save(req.body?.template, user(req))) })));
router.put('/notes/:id', requireAdmin, route(async (req, res) => {
  if (!store.valid(req.params.id) || typeof req.body?.text !== 'string' || req.body.text.length > 4000) throw new Error('Enter a note of at most 4000 characters.');
  await store.save('notes', req.params.id, { id: req.params.id, text: req.body.text, at: new Date().toISOString(), by: user(req) }); res.json({ saved: true });
}));
router.post('/workbooks', requireAdmin, route(async (req, res) => {
  const { file, filename } = req.body || {};
  if (typeof file !== 'string' || !/\.xlsx$/i.test(filename || '') || file.length > 12 * 1024 * 1024) throw new Error('Choose a supported .xlsx conformance workbook.');
  const workbook = require('./conformance'); const bytes = Buffer.from(file, 'base64');
  const sheets = workbook.parseWorkbook(workbook.openWorkbook(bytes)); const saved = [];
  for (const sheet of sheets) for (const step of sheet.steps) {
    const target = new URL(step.url);
    if (target.origin !== uat.BASE || target.username || target.password) throw new Error('Workbook requests must use the approved UAT host.');
    let endpoint = target.pathname;
    if (/^\/trainingProviders\/[^/]+\/trainers/.test(endpoint)) endpoint = endpoint.replace(/^\/trainingProviders\/[^/]+/, '/trainingProviders/{uen}');
    const names = [...new Set([...endpoint.matchAll(/\{([^}]+)\}/g)].map(m => m[1]))];
    const query = [...target.searchParams.keys()];
    let body = {}; try { body = JSON.parse(step.body || '{}'); } catch { /* requires review */ }
    const id = 'workbook-' + templates.digest({ filename, sheet: sheet.name, row: step.row }).slice(0, 24);
    const existing = (await templates.all()).find(t => t.id === id);
    const t = { id, revision: (existing?.revision || 0) + 1, name: `${step.id}: ${step.title || sheet.name}`, ticket: '', caseId: step.id, classification: 'conformance',
      operation: step.method === 'GET' ? 'read' : body?.trainer?.action === 'delete' ? 'delete' : body?.trainer?.action === 'update' ? 'update' : /^\/trainingProviders\/[^/]+\/trainers$/.test(target.pathname) ? 'create' : 'write', method: step.method,
      path: endpoint, version: step.version || '', auth: 'uat-mtls', encoding: step.method === 'GET' ? 'none' : 'json', encrypt: !!step.encrypt,
      fields: [...names.map(name => ({ name, label: name, required: true })), ...query.filter(name => !names.includes(name)).map(name => ({ name, label: name, default: target.searchParams.get(name) }))], query, body,
      expected: { httpStatus: step.expectedStatus || 200 }, reviewed: false,
      source: { kind: 'Imported SWDA workbook', reference: `${filename} / ${sheet.name} / ${step.id}`, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), sheet: sheet.name, row: step.row,
        description: step.description, expectedText: step.expected, cols: sheet.cols, yesNo: sheet.yesNo, executedByCell: sheet.executedByCell, executionDateCell: sheet.executionDateCell } };
    await templates.save(t, user(req)); saved.push(t);
  }
  // Workbook bytes remain private for the completed-workbook export.
  const id = 'workbook-' + crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 24);
  await store.save('notes', id, { id, filename, file, templateIds: saved.map(t => t.id), at: new Date().toISOString(), by: user(req) });
  res.json({ templates: saved, workbookId: id });
}));
router.get('/workbooks/:id/export', route(async (req, res) => {
  const item = await store.get('notes', req.params.id); if (!item?.file) throw new Error('Workbook not found.');
  const { unzipSync, zipSync, strFromU8, strToU8 } = require('fflate'); const parser = require('./conformance');
  const bytes = Buffer.from(item.file, 'base64'); const wb = parser.openWorkbook(bytes); const files = unzipSync(bytes); const history = await store.history();
  for (const id of item.templateIds) {
    const template = await templates.get(id); const source = template.source; const run = history.find(r => r.templateId === id && r.state === 'completed');
    if (!run) continue;
    const sheet = wb.sheets.find(s => s.name === source.sheet); if (!sheet) continue;
    let xml = strFromU8(files[sheet.path]);
    const sgTime = new Date(run.at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
    const fills = [[`${source.cols.actual}${source.row}`, `HTTP ${run.response?.status || 'no response'} at ${sgTime} SGT\n${JSON.stringify(run.response?.body ?? run.interpretation, null, 2)}`]];
    if (source.cols.status) fills.push([`${source.cols.status}${source.row}`, source.yesNo ? run.outcome === 'pass' ? 'Yes' : 'No' : run.outcome === 'pass' ? 'Pass' : 'Fail']);
    if (source.executedByCell) fills.push([source.executedByCell, run.executedBy]);
    if (source.executionDateCell) fills.push([source.executionDateCell, sgTime]);
    for (const [cell, value] of fills) xml = parser.writeCell(xml, cell, value);
    files[sheet.path] = strToU8(xml);
  }
  res.attachment(item.filename.replace(/\.xlsx$/i, ' (completed).xlsx')).type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(Buffer.from(zipSync(files)));
}));
router.post('/import', requireAdmin, route(async (req, res) => {
  const { report, filename } = req.body || {}; legacy.checkSecrets(report);
  if (!report || typeof filename !== 'string' || !/\.json$/i.test(filename)) throw new Error('Choose a JSON evidence file.');
  const items = report.format === 'DP15411-evidence-bundle-v1' || report.format === 'api-uat-evidence-bundle-v1' ? report.reports : [{ filename, report }];
  if (!Array.isArray(items) || items.length > 30) throw new Error('Import at most 30 reports.');
  const records = [];
  for (const item of items) {
    const raw = item.report; legacy.checkSecrets(raw);
    try { const found = legacy.normalize(raw, item.filename, user(req)); records.push(...found.map(record => ({ ...record, legacyImport: true }))); } catch (e) { if (!e.message.startsWith('No DP-15411')) throw e; }
    const candidates = raw.cases || raw.results || (raw.check ? [raw.check] : raw.result && typeof raw.result === 'object' ? [raw.result] : []);
    for (const c of candidates) {
      if ((c.method === 'POST' || c.id === 'TS01') && legacy.targetOf(c) && (!c.ticket || c.ticket === 'DP-15411')) continue;
      if (!c.httpStatus && !c.status) continue; // Dependencies/Not executed entries are not fabricated attempts.
      const url = new URL(c.url || c.requestPath || c.path, uat.BASE);
      if (url.origin !== uat.BASE || url.username || url.password) throw new Error('Only UAT evidence may be imported.');
      const at = c.startedAt || raw.startedAt; if (!Number.isFinite(Date.parse(at))) throw new Error('The evidence needs an execution timestamp.');
      const templateId = c.method === 'GET' && /\/trainers$/.test(url.pathname) ? 'trainer-retrieve' : c.decryptedRequest?.trainer?.action === 'delete' ? 'trainer-delete' : c.decryptedRequest?.trainer?.action === 'update' ? 'trainer-update' : null;
      const t = templateId && await templates.get(templateId);
      let responseBody = c.decryptedResponse || c.response || c.responseBody || c.rawResponse || { messages: c.serviceMessages }; try { if (typeof responseBody === 'string') responseBody = JSON.parse(responseBody); } catch { /* preserve */ }
      const id = 'import-' + templates.digest({ at, method: c.method, url: url.href, status: c.httpStatus || c.status, body: responseBody }).slice(0, 24);
      records.push({ id, ticket: c.ticket || raw.ticket || t?.ticket || '', templateId: templateId || 'imported-diagnostic', caseId: c.id || 'Diagnostic', title: c.description || c.testType || t?.name || 'Imported UAT diagnostic', kind: 'Diagnostic', classification: 'diagnostic', origin: 'Imported history', at,
        state: 'completed', outcome: 'diagnostic', interpretation: 'Recorded access/validation diagnostic; not a functional conformance pass.', application: raw.application || '', applicationId: raw.applicationId || '', testUen: raw.testUen || '', executedBy: 'Recorded local test',
        request: { method: c.method, url: url.href, version: c.headers?.['x-api-version'] || raw.apiVersion || '', encrypted: !!c.encryptedRequest, body: c.decryptedRequest ?? c.requestBody ?? null },
        response: { status: c.httpStatus || c.status, apiStatus: responseBody?.status, body: responseBody }, source: { filename: item.filename, original: true }, evidence: raw });
    }
  }
  if (!records.length) throw new Error('No executed UAT attempts were found.');
  const imported = await runner.serial(async () => {
    let count = 0; const existing = await store.history();
    for (const record of records) {
      if (existing.some(r => r.id === record.id)) continue;
      if (record.legacyImport) { const { legacyImport, ...old } = record; await legacy.save(old, true); }
      else await store.save('runs', record.id, record, true);
      count++;
    }
    return count;
  });
  res.json({ imported });
}));
router.use((err, _req, res, _next) => res.status(400).json({ error: err.code ? 'The private test store is unavailable. Check persistent storage.' : err.message }));
module.exports = router;
