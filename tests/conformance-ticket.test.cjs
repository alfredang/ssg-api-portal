const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const archive = require('../server/conformance-records');
const uat = require('../server/uat');
const { configureAuth, requireAuth } = require('../server/auth');
const router = require('../server/conformance-ticket');
const URL = 'https://uat-api.ssg-wsg.sg/trainingProviders/SYNTHETICUEN/trainers';
const goodCredentials = () => ({ status: { ready: true, hasEncryptionKey: true, encryptionSourceConfirmed: true } });
const evidence = () => ({ ticket: 'DP-15411', application: 'Synthetic fixture application', cases: [{ id: 'TS01', method: 'POST', url: URL, startedAt: '2020-01-11T02:33:36.559Z', httpStatus: 400,
  decryptedRequest: { trainer: { name: 'synthetic', email: 'fixture@example.invalid', idNumber: 'WORKBOOK-EXISTING-ID', idType: { code: 'SP' }, photo: { name: 'fixture.png', content: 'synthetic' } } },
  decryptedResponse: { status: 400, error: { details: [{ field: 'IdNumber', message: 'Trainer ID Number already exists.' }] } } }] });
async function setup(t, production = false) {
  const oldData = process.env.DATA_DIR; const oldAuth = process.env.AUTH_DISABLED; const oldSeed = process.env.CONFORMANCE_SEED_FILE;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dp15411-test-'));
  process.env.DATA_DIR = dir; process.env.AUTH_DISABLED = production ? 'false' : 'true';
  const seeds = Array.from({ length: 11 }, (_, i) => {
    const report = evidence(); const c = report.cases[0];
    c.startedAt = new Date(Date.UTC(2020, 0, i + 1)).toISOString();
    if (![0, 1, 10].includes(i)) c.id = `synthetic-diagnostic-${i}`;
    const record = archive.normalize(report, 'synthetic-fixture.json')[0];
    record.request.body.trainer.idNumber = '[redacted]'; record.source.original = false;
    return record;
  });
  process.env.CONFORMANCE_SEED_FILE = path.join(dir, 'synthetic-seeds.json');
  await fs.writeFile(process.env.CONFORMANCE_SEED_FILE, JSON.stringify(seeds));
  const originalSend = uat.send; const originalCredentials = uat.credentials;
  uat.send = async () => { throw new Error('Unexpected outbound UAT call'); };
  const app = express(); app.use(express.json()); configureAuth(app); app.use('/ticket', requireAuth, router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve)); uat.send = originalSend; uat.credentials = originalCredentials;
    if (oldData === undefined) delete process.env.DATA_DIR; else process.env.DATA_DIR = oldData;
    if (oldAuth === undefined) delete process.env.AUTH_DISABLED; else process.env.AUTH_DISABLED = oldAuth;
    if (oldSeed === undefined) delete process.env.CONFORMANCE_SEED_FILE; else process.env.CONFORMANCE_SEED_FILE = oldSeed;
    await fs.rm(dir, { recursive: true, force: true });
  });
  return async (suffix = '', method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ticket${suffix}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
}
async function prepare(call) {
  await archive.importReport(evidence(), 'fixture.json', 'test');
  const saved = await call('/preparation', 'PUT', { idNumber: 'UAT-FRESH-001', idType: 'SP', sourceReference: 'DP-15411 SWDA synthetic identity reply', syntheticConfirmed: true, scope: 'add-only-retain' });
  assert.equal(saved.status, 200);
  return (await call()).body.preparation.revision;
}
test('staff authentication gates history and imports', async t => {
  const call = await setup(t, true);
  assert.equal((await call()).status, 401);
  assert.equal((await call('/import', 'POST', { filename: 'fixture.json', report: evidence() })).status, 401);
});
test('seeds include prior functional failures and separate diagnostics without exposing secrets or identities', async t => {
  const call = await setup(t); const { body } = await call();
  assert.equal(body.runs.length, 11); assert.equal(body.runs.filter(r => r.kind === 'Functional test').length, 3);
  assert.equal(body.runs[0].response.status, 400); assert.match(body.runs[0].interpretation, /already exists/);
  assert.equal(body.runs[0].outcome, 'fail'); assert.equal(body.ready, false);
  assert.equal(body.hasOriginalFixture, false); assert.equal(body.runs[0].request.body.trainer.idNumber, '[redacted]');
  assert.equal(body.runs.some(r => 'evidence' in r), false);
  assert.equal((await call()).body.runs.length, 11);
});
test('import upgrades sanitized history, persists and deduplicates without any UAT call', async t => {
  const call = await setup(t); const report = evidence();
  const first = await call('/import', 'POST', { filename: 'fixture.json', report });
  assert.equal(first.status, 200); assert.equal(first.body.imported, 1);
  assert.equal((await call('/import', 'POST', { filename: 'fixture.json', report })).body.imported, 0);
  const result = await call(); assert.equal(result.body.hasOriginalFixture, true);
  const imported = result.body.runs.find(r => r.source?.filename === 'fixture.json');
  const download = await call(`/runs/${imported.id}/evidence`);
  assert.deepEqual(download.body, report);
  assert.equal((await archive.list()).some(r => r.source?.filename === 'fixture.json'), true);
});
test('rejects credential-bearing imports and path traversal', async t => {
  const call = await setup(t); const report = { ...evidence(), encryptionKey: 'must-never-be-stored' };
  assert.equal((await call('/import', 'POST', { filename: 'fixture.json', report })).status, 400);
  assert.equal((await call('/runs/..%2f..%2f.env/evidence')).status, 404);
  assert.equal(JSON.stringify(await archive.list()).includes('must-never-be-stored'), false);
});
test('private multi-report bundle imports once and rejects invalid bundles before writing', async t => {
  const call = await setup(t);
  const report = evidence();
  const bundle = { format: 'DP15411-evidence-bundle-v1', reports: [{ filename: 'synthetic-report.json', report }] };
  const result = await call('/import', 'POST', { filename: 'private-bundle.json', report: bundle });
  assert.equal(result.status, 200); assert.equal(result.body.imported, 1);
  assert.equal((await call('/import', 'POST', { filename: 'private-bundle.json', report: bundle })).body.imported, 0);
  bundle.reports.push({ filename: 'invalid.json', report: { privateKey: 'secret' } });
  assert.equal((await call('/import', 'POST', { filename: 'private-bundle.json', report: bundle })).status, 400);
});
test('requires original fixture, synthetic identity and declared scope', async t => {
  const call = await setup(t);
  const form = { idNumber: 'UAT-FRESH-001', idType: 'SP', sourceReference: 'SWDA confirmed synthetic fixture', syntheticConfirmed: true, scope: 'add-only-retain' };
  assert.equal((await call('/preparation', 'PUT', form)).status, 400);
  await archive.importReport(evidence(), 'fixture.json', 'test');
  assert.equal((await call('/preparation', 'PUT', { ...form, idNumber: 'WORKBOOK-EXISTING-ID' })).status, 400);
  assert.equal((await call('/preparation', 'PUT', { ...form, syntheticConfirmed: false })).status, 400);
  assert.equal((await call('/preparation', 'PUT', { ...form, scope: 'delete-all' })).status, 400);
});
test('requires confirmed credentials, current preparation and explicit run confirmation', async t => {
  const call = await setup(t); const revision = await prepare(call);
  uat.credentials = () => ({ status: { ready: true, hasEncryptionKey: true, encryptionSourceConfirmed: false } });
  assert.equal((await call('/run', 'POST', { revision, confirmation: 'RUN TS01 ON UAT' })).status, 400);
  uat.credentials = goodCredentials;
  assert.equal((await call('/run', 'POST', { revision: 'stale', confirmation: 'RUN TS01 ON UAT' })).status, 400);
  assert.equal((await call('/run', 'POST', { revision, confirmation: false })).status, 400);
});
test('records before outbound call; concurrent/repeated submits create only once and preserve returned trainer ID', async t => {
  const call = await setup(t); const revision = await prepare(call); let calls = 0;
  uat.credentials = goodCredentials;
  uat.send = async request => {
    calls++; assert.equal(request.url, URL); assert.equal(request.encrypt, true);
    assert.equal((await archive.list()).filter(r => r.state === 'running').length, 1);
    assert.equal(JSON.parse(request.body).trainer.idNumber, 'UAT-FRESH-001');
    return { status: 200, body: { status: 200, data: { trainer: { id: 'created-in-this-run' } } }, rawBody: '{}', ms: 20, encryptedRequest: 'ciphertext' };
  };
  const body = { revision, confirmation: 'RUN TS01 ON UAT' };
  const [a, b] = await Promise.all([call('/run', 'POST', body), call('/run', 'POST', body)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(calls, 1);
  assert.equal(a.body.run.outcome, 'pass'); assert.equal(a.body.run.trainerId, 'created-in-this-run');
  assert.equal(a.body.run.id, b.body.run.id); assert.equal((await call()).body.ready, false);
  assert.equal((await call('/run', 'POST', body)).body.run.id, a.body.run.id); assert.equal(calls, 1);
  assert.equal((await call('/preparation', 'PUT', { idNumber: 'UAT-FRESH-001', idType: 'SP', sourceReference: 'SWDA identity reply', syntheticConfirmed: true, scope: 'add-only-retain' })).status, 400);
});
for (const scenario of ['timeout', '200 without ID', 'HTTP 200 API 400', 'HTTP 500']) test(`${scenario} holds new Add attempts and survives archive reload`, async t => {
  const call = await setup(t); const revision = await prepare(call); uat.credentials = goodCredentials;
  uat.send = async () => {
    if (scenario === 'timeout') throw new Error('timeout');
    return { status: scenario === 'HTTP 500' ? 500 : 200, body: { status: scenario === 'HTTP 200 API 400' ? 400 : 200, data: {} }, rawBody: '{}', ms: 10 };
  };
  const result = await call('/run', 'POST', { revision, confirmation: 'RUN TS01 ON UAT' });
  assert.equal(result.body.run.state, 'uncertain');
  const page = await call(); assert.equal(page.body.ready, false); assert.match(page.body.blocker, /reconciliation/);
  const record = (await archive.list()).find(r => r.id === result.body.run.id); assert.equal(record.state, 'uncertain');
  assert.equal((await call('/preparation', 'PUT', { idNumber: 'UAT-FRESH-002', idType: 'SP', sourceReference: 'SWDA fresh identity reply', syntheticConfirmed: true, scope: 'add-only-retain' })).status, 400);
  assert.equal((await call(`/runs/${record.id}/reconcile`, 'POST', { confirmed: true, note: 'SWDA confirmed no record was created, reply DP-15411 test reference.' })).status, 200);
  assert.ok((await archive.list()).find(r => r.id === record.id).review);
});
test('structured HTTP 400 records failed conformance, releases lock and does not retry', async t => {
  const call = await setup(t); const revision = await prepare(call); let calls = 0; uat.credentials = goodCredentials;
  uat.send = async () => { calls++; return { status: 400, body: { status: 400, error: { message: 'Bad Request' } }, ms: 1 }; };
  const result = await call('/run', 'POST', { revision, confirmation: 'RUN TS01 ON UAT' });
  assert.equal(result.body.run.state, 'completed'); assert.equal(result.body.run.outcome, 'fail'); assert.equal(calls, 1);
  await assert.rejects(fs.stat(path.join(archive.DIR(), 'live-run.lock')), { code: 'ENOENT' });
});
test('member sessions can view history but cannot prepare or execute writes', async t => {
  const oldData = process.env.DATA_DIR; const oldAuth = process.env.AUTH_DISABLED;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dp15411-member-'));
  process.env.DATA_DIR = dir; process.env.AUTH_DISABLED = 'false';
  const users = require('../server/users'); const oldFind = users.find; const oldIsAdmin = users.isAdmin; const oldRole = users.roleOf;
  users.find = () => ({ role: 'member' }); users.isAdmin = () => false; users.roleOf = () => 'member';
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.user = { email: 'member@example.invalid' }; req.isAuthenticated = () => true; next(); }); app.use('/ticket', requireAuth, router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); users.find = oldFind; users.isAdmin = oldIsAdmin; users.roleOf = oldRole; if (oldData === undefined) delete process.env.DATA_DIR; else process.env.DATA_DIR = oldData; if (oldAuth === undefined) delete process.env.AUTH_DISABLED; else process.env.AUTH_DISABLED = oldAuth; await fs.rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}/ticket`;
  assert.equal((await fetch(base)).status, 200);
  for (const endpoint of ['/import', '/run']) assert.equal((await fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
});
