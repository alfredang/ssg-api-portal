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
test('legacy write URLs direct users to the shared reviewed workbench', async t => {
  const call = await setup(t);
  assert.equal((await call('/preparation', 'PUT', {})).status, 409);
  assert.equal((await call('/run', 'POST', {})).status, 409);
});
