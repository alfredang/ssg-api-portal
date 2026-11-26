const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { execFileSync } = require('node:child_process');
const express = require('express');
const selfsigned = require('selfsigned');
const forge = require('node-forge');
const settings = require('../server/uat-settings');
const uat = require('../server/uat');
const { configureAuth, requireAuth } = require('../server/auth');
const setupRouter = require('../server/uat-setup-routes');
const workbench = require('../server/api-test-workbench');
const envNames = ['DATA_DIR', 'PORTAL_DATA_ID', 'SESSION_SECRET', 'AUTH_DISABLED', 'UAT_CERT', 'UAT_KEY', 'UAT_ENCRYPTION_KEY', 'UAT_CERT_FILE', 'UAT_KEY_FILE', 'UAT_ENCRYPTION_KEY_FILE', 'UAT_EXPECTED_CERT_SHA256', 'UAT_ENCRYPTION_KEY_SOURCE', 'UAT_API_BASE'];
let material;
async function setup(t) {
  if (!material) material = Promise.all([1, 2].map(() => selfsigned.generate([{ name: 'commonName', value: 'synthetic-uat-setup.invalid' }], { keySize: 2048, days: 2 })));
  const [pair, other] = await material;
  const previous = Object.fromEntries(envNames.map(n => [n, process.env[n]])); for (const n of envNames) delete process.env[n];
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'uat-setup-test-')); process.env.DATA_DIR = path.join(root, 'data'); await fs.mkdir(process.env.DATA_DIR);
  process.env.SESSION_SECRET = 'synthetic-stable-session-secret-for-UAT-setup'; process.env.AUTH_DISABLED = 'true';
  const originalRequest = https.request; let network = 0; https.request = () => { network++; throw new Error('Unexpected outbound request'); };
  const app = express(); app.use(express.json({ limit: '10mb' })); configureAuth(app); app.use('/setup', setupRouter); app.use('/workbench', requireAuth, workbench);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { https.request = originalRequest; await new Promise(resolve => server.close(resolve)); for (const [n, v] of Object.entries(previous)) { if (v === undefined) delete process.env[n]; else process.env[n] = v; } await fs.rm(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = async (url = '/setup', method = 'GET', body) => { const response = await fetch(origin + url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body) }); return { status: response.status, headers: response.headers, body: await response.json() }; };
  const input = { certificate: pair.cert, privateKey: pair.private, encryptionKey: Buffer.alloc(32, 11).toString('base64'), expectedFingerprint: new crypto.X509Certificate(pair.cert).fingerprint256, keyReplyDate: '2026-11-24', sourceConfirmed: true };
  return { root, input, other, call, origin, network: () => network };
}
function assertNoSecrets(value, input) {
  const text = JSON.stringify(value); assert.equal(text.includes('-----BEGIN'), false); assert.equal(text.includes(input.encryptionKey), false); assert.equal(text.includes(process.env.SESSION_SECRET), false);
}
test('UAT validation checks uploaded material locally without saving files or calling SWDA', async t => {
  const ctx = await setup(t); const status = await ctx.call(); assert.equal(status.status, 200); assert.equal(status.body.hasSaved, false); assert.equal(status.body.canSave, true); assert.equal(status.body.readiness.ready, false);
  const result = await ctx.call('/setup/validate', 'POST', ctx.input); assert.equal(result.status, 200); assert.equal(result.body.valid, true); assert.ok(result.body.checks.every(c => c.pass));
  assert.deepEqual(await fs.readdir(process.env.DATA_DIR), []); assertNoSecrets(result.body, ctx.input); assert.equal(ctx.network(), 0);
});
test('saving encrypts the dedicated UAT profile, exposes metadata only and makes encrypted-request readiness pass', async t => {
  const ctx = await setup(t); const version = uat.version();
  const production = Object.fromEntries(['CERT_1_CERT', 'CERT_1_KEY', 'CERT_2_CERT', 'CERT_2_KEY', 'CERT_3_ENCRYPTION_KEY', 'SSG_CLIENT_ID'].map(n => [n, process.env[n]]));
  const result = await ctx.call('/setup', 'POST', ctx.input); assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.saved, true); assert.equal(result.body.readiness.ready, true); assert.equal(result.body.source, 'Saved UAT settings');
  assert.notEqual(uat.version(), version); assert.equal(uat.credentials().key, ctx.input.privateKey.trim()); assert.equal(uat.credentials().encryptionKeySource, 'swda-2026-11-24');
  const bytes = await fs.readFile(path.join(process.env.DATA_DIR, 'uat-settings.enc')); assert.equal(bytes.includes(Buffer.from('-----BEGIN')), false); assert.equal(bytes.includes(Buffer.from(ctx.input.encryptionKey)), false);
  assertNoSecrets(result.body, ctx.input); const read = await ctx.call(); assertNoSecrets(read.body, ctx.input); assert.equal(read.headers.get('cache-control'), 'no-store'); assert.equal(read.body.readiness.ready, true);
  for (const [name, value] of Object.entries(production)) assert.equal(process.env[name], value);
  assert.equal(ctx.network(), 0);
});
test('wrong key pairs, fingerprints, AES formats, source confirmation and unexpected fields cannot replace a valid profile', async t => {
  const ctx = await setup(t); await ctx.call('/setup', 'POST', ctx.input); const file = path.join(process.env.DATA_DIR, 'uat-settings.enc'); const before = await fs.readFile(file);
  const invalid = [ { privateKey: ctx.other.private }, { expectedFingerprint: '0'.repeat(64) }, { encryptionKey: 'not-base64' }, { encryptionKey: Buffer.alloc(31).toString('base64') }, { sourceConfirmed: false }, { keyReplyDate: '2026-02-31' }, { keyReplyDate: 'a-secret-is-not-a-date' }, { CERT_1_KEY: 'unexpected-production-setting' }, { certificate: 'x'.repeat(129 * 1024) } ];
  for (const patch of invalid) { const input = { ...ctx.input, ...patch }; const validation = await ctx.call('/setup/validate', 'POST', input); assert.equal(validation.body.valid, false); const save = await ctx.call('/setup', 'POST', input); assert.equal(save.status, 400); assertNoSecrets(save.body, ctx.input); assert.deepEqual(await fs.readFile(file), before); }
  assert.equal(ctx.network(), 0);
});
test('expired and not-yet-valid certificates fail despite a matching private key and fingerprint', async t => {
  const ctx = await setup(t);
  for (const shift of [-4, 4]) {
    const certificate = forge.pki.certificateFromPem(ctx.input.certificate); certificate.validity.notBefore = new Date(Date.now() + shift * 86400000); certificate.validity.notAfter = new Date(certificate.validity.notBefore.getTime() + 86400000); certificate.sign(forge.pki.privateKeyFromPem(ctx.input.privateKey), forge.md.sha256.create());
    const pem = forge.pki.certificateToPem(certificate); const input = { ...ctx.input, certificate: pem, expectedFingerprint: new crypto.X509Certificate(pem).fingerprint256 };
    const result = await ctx.call('/setup/validate', 'POST', input); assert.equal(result.body.valid, false); assert.equal(result.body.checks.find(c => c.name === 'Certificate is currently valid').pass, false); assert.equal(result.body.checks.find(c => c.name === 'Private key matches the certificate').pass, true);
  }
  assert.equal(ctx.network(), 0);
});
test('hosting fingerprint restrictions, a production destination and missing server encryption prevent saves', async t => {
  const ctx = await setup(t);
  process.env.UAT_EXPECTED_CERT_SHA256 = '0'.repeat(64); assert.equal((await ctx.call('/setup', 'POST', ctx.input)).status, 400); delete process.env.UAT_EXPECTED_CERT_SHA256;
  process.env.UAT_API_BASE = 'https://api.ssg-wsg.sg'; assert.equal((await ctx.call('/setup', 'POST', ctx.input)).status, 400); delete process.env.UAT_API_BASE;
  for (const secret of ['', 'short-secret', 'change-me-to-a-long-random-string']) { process.env.SESSION_SECRET = secret; const result = await ctx.call('/setup', 'POST', ctx.input); assert.equal(result.status, 400); assert.equal((await ctx.call()).body.canSave, false); }
  assert.deepEqual(await fs.readdir(process.env.DATA_DIR), []); assert.equal(ctx.network(), 0);
});
test('saved credentials survive a new process and are used for UAT transport instead of environment credentials', async t => {
  const ctx = await setup(t); await ctx.call('/setup', 'POST', ctx.input);
  const output = execFileSync(process.execPath, ['-e', "console.log(JSON.stringify(require('./server/uat').readiness({auth:'uat-mtls',encrypt:true})))"], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.equal(JSON.parse(output).ready, true); assertNoSecrets(output, ctx.input);
  let captured;
  https.request = (options, callback) => { captured = options; const request = new EventEmitter(); request.write = body => { captured.body = body; }; request.end = () => { const response = new EventEmitter(); response.statusCode = 400; callback(response); queueMicrotask(() => { response.emit('data', '{"status":400}'); response.emit('end'); }); }; return request; };
  const body = JSON.stringify({ synthetic: true }); await uat.send({ method: 'POST', url: uat.BASE + '/synthetic', body, encrypt: true });
  assert.equal(captured.hostname, 'uat-api.ssg-wsg.sg'); assert.equal(captured.key.toString(), ctx.input.privateKey.trim()); assert.equal(uat.aes('dec', Buffer.from(ctx.input.encryptionKey, 'base64'), captured.body), body);
});
test('changed session secrets and damaged saved settings fail closed without falling back or overwriting the file', async t => {
  const ctx = await setup(t); await ctx.call('/setup', 'POST', ctx.input); const file = path.join(process.env.DATA_DIR, 'uat-settings.enc'); const original = await fs.readFile(file);
  Object.assign(process.env, { UAT_CERT: ctx.input.certificate, UAT_KEY: ctx.input.privateKey, UAT_ENCRYPTION_KEY: ctx.input.encryptionKey, UAT_EXPECTED_CERT_SHA256: ctx.input.expectedFingerprint, UAT_ENCRYPTION_KEY_SOURCE: 'synthetic-environment-source' });
  const secret = process.env.SESSION_SECRET; process.env.SESSION_SECRET = 'different-synthetic-session-secret'; assert.equal(uat.readiness({ encrypt: true }).ready, false); assert.equal((await ctx.call('/setup', 'POST', ctx.input)).status, 400); assert.deepEqual(await fs.readFile(file), original);
  process.env.SESSION_SECRET = secret; await fs.appendFile(file, 'damaged'); const damaged = await fs.readFile(file); assert.equal(uat.credentials().status.hasCertificate, false); assert.equal((await ctx.call('/setup', 'POST', ctx.input)).status, 400); assert.deepEqual(await fs.readFile(file), damaged); assert.equal(ctx.network(), 0);
});
test('credential saves invalidate old execution previews and never execute the test automatically', async t => {
  const ctx = await setup(t);
  Object.assign(process.env, { UAT_CERT: ctx.input.certificate, UAT_KEY: ctx.input.privateKey, UAT_ENCRYPTION_KEY: ctx.input.encryptionKey, UAT_EXPECTED_CERT_SHA256: ctx.input.expectedFingerprint, UAT_ENCRYPTION_KEY_SOURCE: 'synthetic-environment-source' });
  const report = { application: 'Synthetic UAT', cases: [{ id: 'TS01', method: 'POST', url: uat.BASE + '/trainingProviders/SYNTHETICUEN/trainers', startedAt: '2020-01-01T00:00:00Z', httpStatus: 400, decryptedRequest: { trainer: { idNumber: 'SYNTHETIC', idType: { code: 'SP' }, name: 'Synthetic', domainAreaOfPractice: 'Synthetic', photo: { name: 'test.png', content: 'c3ludGhldGlj' } } }, decryptedResponse: { status: 400 } }] };
  assert.equal((await ctx.call('/workbench/import', 'POST', { report, filename: 'synthetic.json' })).status, 200);
  const load = await ctx.call('/workbench/load', 'POST', { templateId: 'trainer-add' }); assert.equal(load.status, 200); assert.equal(load.body.draft.credential.ready, true);
  await ctx.call('/setup', 'POST', ctx.input);
  const run = await ctx.call('/workbench/run', 'POST', { draftId: load.body.draft.id, digest: load.body.draft.digest, confirmation: 'CONFIRM AND RUN ONCE' }); assert.equal(run.status, 400); assert.match(run.body.error, /credentials changed/); assert.equal(ctx.network(), 0);
});
test('workbench browser backups omit UAT credentials; full encrypted portal recovery preserves the profile', async t => {
  const ctx = await setup(t); await ctx.call('/setup', 'POST', ctx.input); const storage = require('../server/portal-storage'); await storage.initialize();
  const browser = require('../server/api-test-backup'); const archive = await browser.create('synthetic operator'); assertNoSecrets(browser.open(archive, 'synthetic operator'), ctx.input);
  const full = require('../server/portal-data-backup'); const backup = await full.create('synthetic operator'); const destination = path.join(ctx.root, 'recovered'); await full.restore(backup, destination);
  const output = execFileSync(process.execPath, ['-e', "console.log(JSON.stringify(require('./server/uat').readiness({encrypt:true})))"], { cwd: path.join(__dirname, '..'), env: { ...process.env, DATA_DIR: destination }, encoding: 'utf8' }); assert.equal(JSON.parse(output).ready, true); assert.equal(ctx.network(), 0);
});
test('all setup endpoints require admins and reject simple form submissions', async t => {
  const ctx = await setup(t); process.env.AUTH_DISABLED = 'false';
  for (const [url, method] of [['/setup', 'GET'], ['/setup/validate', 'POST'], ['/setup', 'POST']]) assert.equal((await ctx.call(url, method, ctx.input)).status, 401);
  const users = require('../server/users'); const prior = users.isAdmin; users.isAdmin = () => false;
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.user = { email: 'synthetic-member@example.invalid' }; req.isAuthenticated = () => true; next(); }); app.use('/setup', setupRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(async () => { users.isAdmin = prior; await new Promise(resolve => server.close(resolve)); });
  for (const [url, method] of [['/setup', 'GET'], ['/setup/validate', 'POST'], ['/setup', 'POST']]) { const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method, headers: { 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify(ctx.input) }) }); assert.equal(response.status, 403); }
  process.env.AUTH_DISABLED = 'true'; const simple = await fetch(ctx.origin + '/setup', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'sourceConfirmed=true' }); assert.equal(simple.status, 415); assert.equal(ctx.network(), 0);
});
