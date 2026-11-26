const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const store = require('../server/api-test-store');
const templates = require('../server/api-test-templates');
const runner = require('../server/api-test-runner');
const legacy = require('../server/conformance-records');
const uat = require('../server/uat');
const { configureAuth, requireAuth } = require('../server/auth');
const router = require('../server/api-test-workbench');
const URL = uat.BASE + '/trainingProviders/SYNTHETICUEN/trainers';
const { zipSync, strToU8, unzipSync, strFromU8 } = require('fflate');
const fixture = () => ({ application: 'Synthetic test application', testUen: 'SYNTHETICUEN', cases: [{ id: 'TS01', method: 'POST', url: URL, startedAt: '2020-01-01T00:00:00Z', httpStatus: 400,
  decryptedRequest: { trainer: { idNumber: 'SYNTHETIC-EXISTING', idType: { code: 'SP' }, name: 'Exact saved trainer name', domainAreaOfPractice: 'Exact saved practice', photo: { name: 'test.png', content: 'c3ludGhldGlj' } } },
  decryptedResponse: { status: 400, error: { message: 'Trainer ID Number already exists.' } } }] });
async function setup(t, auth = true) {
  const previous = { data: process.env.DATA_DIR, disabled: process.env.AUTH_DISABLED, seed: process.env.CONFORMANCE_SEED_FILE };
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'api-uat-workbench-')); process.env.DATA_DIR = root; process.env.AUTH_DISABLED = auth ? 'true' : 'false'; delete process.env.CONFORMANCE_SEED_FILE;
  const originals = { send: uat.send, readiness: uat.readiness, version: uat.version };
  let calls = 0; let respond = async () => ({ status: 400, body: { status: 400, error: { message: 'Duplicate identity' } }, rawBody: '{}', ms: 2 });
  uat.readiness = ({ auth, encrypt }) => ({ ready: true, missing: [], auth, encrypt, fingerprint: 'synthetic' }); uat.version = () => 'synthetic-v1';
  uat.send = async request => { calls++; return respond(request); };
  const app = express(); app.use(express.json({ limit: '10mb' })); configureAuth(app); app.use('/workbench', requireAuth, router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve)); Object.assign(uat, originals);
    for (const [key, value] of [['DATA_DIR', previous.data], ['AUTH_DISABLED', previous.disabled], ['CONFORMANCE_SEED_FILE', previous.seed]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await fs.rm(root, { recursive: true, force: true });
  });
  const call = async (suffix = '', method = 'GET', body) => { const response = await fetch(`http://127.0.0.1:${server.address().port}/workbench${suffix}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: response.status, body: await response.json() }; };
  return { call, count: () => calls, response: fn => { respond = fn; } };
}
async function addDraft(call, sourceRunId) {
  if (!(await store.history()).length) await legacy.importReport(fixture(), 'synthetic-original.json', 'test');
  const result = await call('/load', 'POST', { templateId: 'trainer-add', sourceRunId }); assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body.draft;
}
const confirm = (call, draft) => call('/run', 'POST', { draftId: draft.id, digest: draft.digest, confirmation: 'CONFIRM AND RUN ONCE' });
async function successfulCreate(ctx) {
  ctx.response(async () => ({ status: 200, body: { status: 200, data: { trainer: { id: 'synthetic-created-id' } }, error: {} }, ms: 2 }));
  const draft = await addDraft(ctx.call); const result = await confirm(ctx.call, draft); assert.equal(result.body.run.outcome, 'pass'); return result.body.run;
}
test('all routes require staff sign-in', async t => {
  const { call } = await setup(t, false); assert.equal((await call()).status, 401); assert.equal((await call('/load', 'POST', {})).status, 401);
});
test('built-in templates cover Add, Retrieve, Update, Delete and all six workbook cases', async t => {
  const { call } = await setup(t); const state = (await call()).body;
  assert.equal(state.templates.length, 7); assert.deepEqual(state.templates.filter(x => /^TS/.test(x.caseId)).map(x => x.caseId).sort(), ['TS01', 'TS02', 'TS03', 'TS04', 'TS05', 'TS06']);
  assert.equal(state.templates.find(x => x.id === 'trainer-retrieve').encrypt, false);
});
test('loading a historical Add preserves every saved trainer field and sends zero requests', async t => {
  const ctx = await setup(t); await legacy.importReport(fixture(), 'original.json', 'test'); const original = (await store.history())[0];
  const draft = await addDraft(ctx.call, original.id);
  assert.deepEqual(draft.request.body, original.request.body); assert.equal(draft.sourceRunId, original.id); assert.equal(draft.blockers.length, 0); assert.equal(ctx.count(), 0);
  assert.match(draft.warnings.join(' '), /duplicate-identity/); assert.equal(draft.credentialVersion, undefined);
});
test('known failed identity can be deliberately repeated; each newly loaded preview produces a separate attempt', async t => {
  const ctx = await setup(t); const one = await addDraft(ctx.call); const original = (await store.history())[0];
  const first = await confirm(ctx.call, one); assert.equal(first.status, 200); assert.equal(first.body.run.outcome, 'fail'); assert.equal(first.body.run.response.status, 400);
  const two = await addDraft(ctx.call, original.id); const second = await confirm(ctx.call, two);
  assert.notEqual(first.body.run.id, second.body.run.id); assert.equal(ctx.count(), 2); assert.equal((await store.history()).length, 3);
  assert.deepEqual((await store.findRun(original.id)).request.body, original.request.body);
});
test('double clicks and retries of the same confirmation send exactly once', async t => {
  const ctx = await setup(t); const draft = await addDraft(ctx.call);
  ctx.response(async () => { assert.equal((await store.history()).filter(r => r.state === 'running').length, 1); return { status: 400, body: { status: 400, error: {} }, ms: 1 }; });
  const [a, b] = await Promise.all([confirm(ctx.call, draft), confirm(ctx.call, draft)]); assert.equal(a.body.run.id, b.body.run.id); assert.equal(ctx.count(), 1);
});
test('preview can be loaded while credentials are missing, but confirmation is blocked', async t => {
  const ctx = await setup(t); uat.readiness = ({ auth, encrypt }) => ({ ready: false, missing: ['Synthetic missing certificate'], auth, encrypt });
  const draft = await addDraft(ctx.call); assert.equal(draft.credential.ready, false); assert.equal((await confirm(ctx.call, draft)).status, 400); assert.equal(ctx.count(), 0);
});
test('changed credentials, template revisions, invalid digest and stale previews require a fresh review', async t => {
  const ctx = await setup(t); const draft = await addDraft(ctx.call);
  assert.equal((await ctx.call('/run', 'POST', { draftId: draft.id, digest: 'tampered', confirmation: 'CONFIRM AND RUN ONCE' })).status, 400);
  uat.version = () => 'new-credential-version'; assert.equal((await confirm(ctx.call, draft)).status, 400); uat.version = () => 'synthetic-v1';
  const saved = await store.get('drafts', draft.id); saved.createdAt = '2020-01-01T00:00:00Z'; await store.save('drafts', saved.id, saved); assert.equal((await confirm(ctx.call, draft)).status, 400);
  const fresh = await addDraft(ctx.call); const current = await templates.get('trainer-add'); await templates.save({ ...current, revision: current.revision + 1 }, 'test'); assert.equal((await confirm(ctx.call, fresh)).status, 400); assert.equal(ctx.count(), 0);
});
test('confirmation cannot substitute an unreviewed request body', async t => {
  const ctx = await setup(t); const draft = await addDraft(ctx.call); let captured;
  ctx.response(async request => { captured = JSON.parse(request.body); return { status: 400, body: { status: 400 }, ms: 1 }; });
  const result = await ctx.call('/run', 'POST', { draftId: draft.id, digest: draft.digest, confirmation: 'CONFIRM AND RUN ONCE', body: { trainer: { name: 'unreviewed' } } });
  assert.equal(result.status, 200); assert.deepEqual(captured, draft.request.body);
});
test('Retrieve sends no body/encryption and does not inherit Add encryption prerequisites', async t => {
  const ctx = await setup(t); let requested; uat.readiness = ({ auth, encrypt }) => ({ ready: !encrypt, missing: encrypt ? ['AES'] : [], auth, encrypt });
  ctx.response(async request => { requested = request; return { status: 200, body: { status: 200, data: { trainers: [] } }, ms: 1 }; });
  const result = await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve', inputs: { uen: 'SYNTHETICUEN', keyword: 'read only' } }); assert.equal(result.status, 200);
  assert.equal((await confirm(ctx.call, result.body.draft)).body.run.outcome, 'pass'); assert.equal(requested.body, ''); assert.equal(requested.encrypt, false); assert.match(requested.url, /keyword=read\+only/);
  assert.equal((await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve', inputs: { uen: 'SYNTHETICUEN' }, body: { forbidden: 'body' } })).status, 400);
});
for (const scenario of ['timeout', 'server error', '200 without trainer ID']) test(`${scenario} holds writes to the resource, while reads remain available`, async t => {
  const ctx = await setup(t); const draft = await addDraft(ctx.call);
  ctx.response(async () => { if (scenario === 'timeout') throw new Error('synthetic timeout'); return { status: scenario === 'server error' ? 500 : 200, body: { status: scenario === 'server error' ? 500 : 200, data: {} }, ms: 1 }; });
  const result = await confirm(ctx.call, draft); assert.equal(result.body.run.state, 'uncertain'); assert.equal(result.body.run.outcome, 'unknown');
  assert.ok((await addDraft(ctx.call)).blockers.length);
  const read = await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve', inputs: { uen: 'SYNTHETICUEN' } }); assert.equal(read.body.draft.blockers.length, 0);
  assert.equal((await ctx.call(`/runs/${result.body.run.id}/reconcile`, 'POST', { note: 'Provider confirmed the synthetic outcome in test reference #123.' })).status, 200);
  assert.equal((await addDraft(ctx.call)).blockers.length, 0);
});
test('Update/Delete require a trainer created by this workflow; imported success is insufficient', async t => {
  const ctx = await setup(t);
  let result = await ctx.call('/load', 'POST', { templateId: 'trainer-delete', inputs: { uen: 'SYNTHETICUEN', trainerId: 'existing-unrelated' } });
  assert.equal(result.status, 200); assert.ok(result.body.draft.blockers.length); assert.equal((await confirm(ctx.call, result.body.draft)).status, 400); assert.equal(ctx.count(), 0);
  const created = await successfulCreate(ctx);
  result = await ctx.call('/load', 'POST', { templateId: 'trainer-delete', dependencyRunId: created.id, inputs: { trainerId: 'unrelated' } }); assert.ok(result.body.draft.blockers.length);
});
test('full workflow passes the created ID between individually confirmed tests and verifies state', async t => {
  const ctx = await setup(t); const created = await successfulCreate(ctx); const trainer = created.request.body.trainer;
  ctx.response(async () => ({ status: 200, body: { status: 200, data: { trainers: [{ ...trainer, id: created.trainerId }] } }, ms: 1 }));
  let draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve-created', dependencyRunId: created.id })).body.draft;
  assert.equal((await confirm(ctx.call, draft)).body.run.outcome, 'pass');
  const updated = { trainer: { ...trainer, name: 'Reviewed updated name', domainAreaOfPractice: 'Reviewed updated practice', action: 'update' } };
  ctx.response(async request => { assert.match(request.url, /synthetic-created-id$/); assert.equal(JSON.parse(request.body).trainer.action, 'update'); return { status: 200, body: { status: 200, data: {} }, ms: 1 }; });
  draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-update', dependencyRunId: created.id, body: updated })).body.draft;
  const update = (await confirm(ctx.call, draft)).body.run; assert.equal(update.outcome, 'pass'); assert.equal(update.workflowId, created.id);
  ctx.response(async () => ({ status: 200, body: { status: 200, data: { trainers: [{ ...updated.trainer, id: created.trainerId }] } }, ms: 1 }));
  draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve-updated', dependencyRunId: update.id })).body.draft; assert.equal((await confirm(ctx.call, draft)).body.run.outcome, 'pass');
  ctx.response(async request => { assert.equal(JSON.parse(request.body).trainer.action, 'delete'); return { status: 200, body: { status: 200, data: {} }, ms: 1 }; });
  draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-delete', dependencyRunId: created.id })).body.draft; const deleted = (await confirm(ctx.call, draft)).body.run; assert.equal(deleted.outcome, 'pass');
  ctx.response(async () => ({ status: 200, body: { status: 200, data: { trainers: [] }, meta: { total: 0 } }, ms: 1 }));
  draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-verify-absent', dependencyRunId: deleted.id })).body.draft; assert.equal((await confirm(ctx.call, draft)).body.run.outcome, 'pass'); assert.equal(ctx.count(), 6);
});
test('verification fails for unrelated trainer data, incomplete pagination and wrong business status', async t => {
  const ctx = await setup(t); const created = await successfulCreate(ctx);
  ctx.response(async () => ({ status: 200, body: { status: 200, data: { trainers: [{ id: 'unrelated' }] } }, ms: 1 }));
  const draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve-created', dependencyRunId: created.id })).body.draft; assert.equal((await confirm(ctx.call, draft)).body.run.outcome, 'fail');
  const tAbsent = await templates.get('trainer-verify-absent'); assert.equal(templates.evaluate(tAbsent, { status: 200, body: { status: 200, data: { trainers: [] }, meta: { total: 4 } } }, { trainerId: created.trainerId, pageSize: 100 }).pass, false);
  assert.equal(templates.evaluate(await templates.get('trainer-add'), { status: 200, body: { status: 400, data: { trainer: { id: 'not-success' } } } }).pass, false);
});
test('future JSON templates persist, execute with declared rules and reject arbitrary destinations or credentials', async t => {
  const ctx = await setup(t);
  const template = { id: 'future-read', revision: 1, name: 'Future read API', classification: 'functional', operation: 'read', method: 'GET', path: '/future/{reference}', version: 'v1.0', auth: 'uat-mtls', encoding: 'none', encrypt: false, fields: [{ name: 'reference', label: 'Reference', required: true }], expected: { httpStatus: 200, checks: [{ path: 'data.value', operator: 'equals', value: 'expected' }] } };
  assert.equal((await ctx.call('/templates', 'POST', { template })).status, 200);
  assert.equal((await ctx.call('/templates', 'POST', { template: { ...template, id: 'production', path: '//api.ssg-wsg.sg/future' } })).status, 400);
  assert.equal((await ctx.call('/templates', 'POST', { template: { ...template, id: 'secret', headers: { Authorization: 'secret' } } })).status, 400);
  ctx.response(async request => { assert.equal(request.url, uat.BASE + '/future/real-reference'); return { status: 200, body: { data: { value: 'expected' } }, ms: 1 }; });
  const draft = (await ctx.call('/load', 'POST', { templateId: template.id, inputs: { reference: 'real-reference' } })).body.draft; assert.equal((await confirm(ctx.call, draft)).body.run.outcome, 'pass');
  assert.ok((await store.list('templates')).find(x => x.id === template.id));
});
test('multipart, form and text formats preserve reviewed data', async t => {
  await setup(t);
  const form = runner.encode({ method: 'POST', encoding: 'form' }, { field: 'reviewed value' }, []); assert.equal(form.body, 'field=reviewed+value');
  const multipart = runner.encode({ method: 'POST', encoding: 'multipart' }, { note: 'reviewed' }, [{ name: 'test.txt', field: 'file', type: 'text/plain', base64: Buffer.from('exact file data').toString('base64') }]);
  assert.match(multipart.body.toString(), /exact file data/); assert.match(multipart.contentType, /multipart\/form-data; boundary=/);
});
test('read-only failed attempts are repeatable and history/evidence survive a new store read', async t => {
  const ctx = await setup(t); ctx.response(async () => { throw new Error('read timeout'); });
  const draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve', inputs: { uen: 'SYNTHETICUEN' } })).body.draft;
  const run = (await confirm(ctx.call, draft)).body.run; assert.equal(run.state, 'completed'); assert.equal(run.outcome, 'fail');
  assert.equal((await store.findRun(run.id)).id, run.id); assert.equal((await ctx.call(`/runs/${run.id}/evidence`)).body.id, run.id);
});
test('modified requests are labelled and keep the original unchanged', async t => {
  const ctx = await setup(t); await legacy.importReport(fixture(), 'original.json', 'test'); const original = (await store.history())[0];
  const changed = structuredClone(original.request.body); changed.trainer.name = 'Explicitly edited';
  const result = await ctx.call('/load', 'POST', { templateId: 'trainer-add', sourceRunId: original.id, body: changed });
  assert.equal(result.body.draft.modified, true); assert.match(result.body.draft.warnings.join(' '), /Modified request/);
  assert.equal((await store.findRun(original.id)).request.body.trainer.name, 'Exact saved trainer name');
});
test('revisions cannot bypass workflow provenance or silently turn a missing trainer ID into a confirmed create', async t => {
  const ctx = await setup(t); const tAdd = await templates.get('trainer-add');
  await templates.save({ ...tAdd, revision: 2, expected: { httpStatus: 200 } }, 'test');
  ctx.response(async () => ({ status: 200, body: { data: {} }, ms: 1 })); const draft = await addDraft(ctx.call);
  assert.equal((await confirm(ctx.call, draft)).body.run.state, 'uncertain');
});
test('custom templates cannot hide a Delete action or target a different UEN than the workflow', async t => {
  const ctx = await setup(t); const created = await successfulCreate(ctx); const deletion = await templates.get('trainer-delete');
  await templates.save({ ...deletion, id: 'mislabelled-delete', operation: 'write' }, 'test');
  assert.equal((await ctx.call('/load', 'POST', { templateId: 'mislabelled-delete', dependencyRunId: created.id })).status, 400);
  await templates.save({ ...deletion, id: 'different-target', path: '/trainingProviders/UNRELATEDUEN/trainers/{trainerId}' }, 'test');
  const result = await ctx.call('/load', 'POST', { templateId: 'different-target', dependencyRunId: created.id }); assert.ok(result.body.draft.blockers.length);
});
test('secrets in API responses are redacted before evidence is stored', async t => {
  const ctx = await setup(t); ctx.response(async () => ({ status: 200, body: { status: 200, data: { trainers: [] }, access_token: 'synthetic-sensitive-token', client_secret: 'synthetic-secret' }, rawBody: 'synthetic-sensitive-token', ms: 1 }));
  const draft = (await ctx.call('/load', 'POST', { templateId: 'trainer-retrieve', inputs: { uen: 'SYNTHETICUEN' } })).body.draft;
  const result = await confirm(ctx.call, draft); assert.equal(result.body.run.response.body.access_token, '[redacted credential]'); assert.equal(JSON.stringify(await store.list('runs')).includes('synthetic-sensitive-token'), false);
});
test('workbook imports draft templates for explicit review, then exports a completed original workbook', async t => {
  const ctx = await setup(t);
  const esc = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rows = [
    { A1: 'Test case ID', B1: 'Test case', E1: 'Test Step Description', F1: 'Expected Result', G1: 'Actual Result', H1: 'Status (Pass/Fail)' },
    { A2: 'TS01', B2: 'Add trainer', E2: 'Encrypted request. Sample payload: {"trainer":{"idNumber":"SYNTHETIC-NEW","name":"Reviewed fixture"}}' },
    { E3: `Request type: POST\nx-api-version: v2.0\n${URL}`, F3: '{"status":200}' },
  ];
  const bytes = Buffer.from(zipSync({
    'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="Test" r:id="r1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData>${rows.map((row, i) => `<row r="${i + 1}">${Object.entries(row).map(([cell, text]) => `<c r="${cell}" t="inlineStr"><is><t>${esc(text)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`),
  }));
  const uploaded = await ctx.call('/workbooks', 'POST', { filename: 'synthetic-tests.xlsx', file: bytes.toString('base64') }); assert.equal(uploaded.status, 200, JSON.stringify(uploaded.body));
  const imported = uploaded.body.templates[0]; assert.equal(imported.reviewed, false); assert.equal(imported.path, '/trainingProviders/{uen}/trainers'); assert.equal(imported.body.trainer.name, 'Reviewed fixture');
  let draft = (await ctx.call('/load', 'POST', { templateId: imported.id, inputs: { uen: 'SYNTHETICUEN' } })).body.draft; assert.ok(draft.blockers.length);
  await ctx.call('/templates', 'POST', { template: { ...imported, revision: imported.revision + 1, reviewed: true } });
  ctx.response(async () => ({ status: 400, body: { status: 400, error: { message: 'Synthetic rejection' } }, ms: 1 }));
  draft = (await ctx.call('/load', 'POST', { templateId: imported.id, inputs: { uen: 'SYNTHETICUEN' } })).body.draft; assert.equal((await confirm(ctx.call, draft)).body.run.outcome, 'fail');
  assert.equal((await ctx.call()).body.notes.some(n => 'file' in n), false);
  // Exercise export through the router with its real binary response.
  const app = express(); app.use('/w', router); const exportServer = app.listen(0, '127.0.0.1'); await new Promise(resolve => exportServer.once('listening', resolve));
  t.after(() => new Promise(resolve => exportServer.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${exportServer.address().port}/w/workbooks/${uploaded.body.workbookId}/export`); assert.equal(response.status, 200);
  const result = unzipSync(new Uint8Array(await response.arrayBuffer())); const sheet = strFromU8(result['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /HTTP 400/); assert.match(sheet, /Fail/); assert.match(sheet, /Synthetic rejection/);
});
test('members may view templates/history but cannot load, run, change templates or import', async t => {
  await setup(t); const users = require('../server/users'); const saved = { find: users.find, isAdmin: users.isAdmin, roleOf: users.roleOf }; const oldAuth = process.env.AUTH_DISABLED;
  process.env.AUTH_DISABLED = 'false'; users.find = () => ({ role: 'member' }); users.isAdmin = () => false; users.roleOf = () => 'member';
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.user = { email: 'member@example.invalid' }; req.isAuthenticated = () => true; next(); }); app.use('/w', requireAuth, router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); Object.assign(users, saved); process.env.AUTH_DISABLED = oldAuth; });
  const base = `http://127.0.0.1:${server.address().port}/w`; assert.equal((await fetch(base)).status, 200);
  for (const endpoint of ['/load', '/run', '/templates', '/import', '/workbooks']) assert.equal((await fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
});
