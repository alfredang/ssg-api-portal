const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const express = require('express');
const storage = require('../server/portal-storage');
const backup = require('../server/portal-data-backup');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'portal-storage-test-'));
  const previous = Object.fromEntries(['DATA_DIR', 'SESSION_SECRET', 'AUTH_DISABLED', 'PORTAL_DATA_ID'].map(k => [k, process.env[k]]));
  process.env.DATA_DIR = path.join(root, 'data'); process.env.SESSION_SECRET = 'synthetic-portal-storage-secret'; process.env.AUTH_DISABLED = 'true'; delete process.env.PORTAL_DATA_ID;
  await fs.mkdir(process.env.DATA_DIR);
  t.after(async () => { for (const [k, v] of Object.entries(previous)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } await fs.rm(root, { recursive: true, force: true }); });
  return root;
}
function child(code, env = {}) { return JSON.parse(execFileSync(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); }
test('users, defaults, encrypted settings and both test stores write beneath the same configured DATA_DIR', async t => {
  const root = await fixture(t);
  const result = child(`(async () => {
    const fs=require('node:fs/promises'),path=require('node:path');
    const users=require('./server/users'),defaults=require('./server/store'),settings=require('./server/settings');
    const records=require('./server/conformance-records'),store=require('./server/api-test-store');
    users.add('synthetic-member@example.invalid','synthetic operator');
    await defaults.saveDefaults('synthetic-user',{course:'synthetic-course'}); settings.updateMail({SMTP_PASS:'synthetic-private-mail-secret'});
    await records.save({id:'import-abcdef',state:'completed',at:'2020-01-01'}); await store.save('notes','synthetic-note',{id:'synthetic-note',text:'synthetic'});
    const files=['users.json','defaults.json','settings.enc','conformance/DP-15411/import-abcdef.json','conformance/workbench/notes/synthetic-note.json'];
    for(const file of files) await fs.access(path.join(process.env.DATA_DIR,file));
    console.log(JSON.stringify({files:files.length,defaults:await defaults.getDefaults('synthetic-user'),encrypted:!(await fs.readFile(path.join(process.env.DATA_DIR,'settings.enc'))).includes(Buffer.from('synthetic-private-mail-secret'))}));
  })().catch(()=>process.exit(1));`);
  assert.equal(result.files, 5); assert.deepEqual(result.defaults, { course: 'synthetic-course' }); assert.equal(result.encrypted, true);
  await storage.initialize(); const archive = await backup.create('synthetic operator'); const recovered = path.join(root, 'recovered'); await backup.restore(archive, recovered);
  const values = child(`(async()=>{ console.log(JSON.stringify({member:!!require('./server/users').find('synthetic-member@example.invalid'),defaults:await require('./server/store').getDefaults('synthetic-user'),settings:require('./server/settings').mailConfig().SMTP_PASS==='synthetic-private-mail-secret'})) })().catch(()=>process.exit(1))`, { DATA_DIR: recovered });
  assert.equal(values.member, true); assert.deepEqual(values.defaults, result.defaults); assert.equal(values.settings, true);
});
test('write access, restart retention and changed-build retention are distinguished, including loss of one test folder', async t => {
  const root = await fixture(t); const code = path.join(root, 'server'); await fs.mkdir(code);
  for (const name of ['portal-storage.js', 'data-directory.js']) await fs.copyFile(path.join(__dirname, '../server', name), path.join(code, name));
  const revision = path.join(code, 'synthetic-revision.json'); await fs.writeFile(revision, '{"revision":1}');
  const read = () => child(`require(${JSON.stringify(path.join(code, 'portal-storage.js'))}).status().then(s=>console.log(JSON.stringify(s)))`);
  const first = read(); assert.equal(first.writable, true); assert.equal(first.backupOptional, false); assert.equal(first.restartVerifiedAt, null);
  const restart = read(); assert.ok(restart.restartVerifiedAt); assert.equal(restart.deploymentVerifiedAt, null);
  await fs.writeFile(revision, '{"revision":2}'); const deployed = read(); assert.ok(deployed.deploymentVerifiedAt); assert.equal(deployed.backupOptional, true); assert.equal(deployed.storageId, first.storageId);
  await fs.unlink(path.join(process.env.DATA_DIR, 'conformance/workbench', storage.PROBE));
  const lost = read(); assert.ok(lost.lossDetectedAt); assert.equal(lost.backupOptional, false); assert.equal(lost.deploymentVerifiedAt, null);
});
test('a pinned data-folder identity rejects an empty or different folder instead of reseeding users', async t => {
  await fixture(t); const status = await storage.status(); process.env.PORTAL_DATA_ID = status.storageId;
  assert.equal(storage.dataDirectory(), process.env.DATA_DIR);
  const other = path.join(process.env.DATA_DIR, '..', 'unattached'); await fs.mkdir(other);
  assert.throws(() => child(`require('./server/users').list(); console.log('{}')`, { DATA_DIR: other }));
  assert.deepEqual(await fs.readdir(other), []);
  await storage.armVerification(); assert.equal(storage.dataDirectory(), process.env.DATA_DIR);
});
test('whole-folder encrypted backup restores every data byte to a separate empty staging folder without copying verification claims', async t => {
  const root = await fixture(t); await storage.initialize();
  const files = { 'users.json': '{"users":[]}', 'defaults.json': '{"synthetic":{"course":"synthetic-course"}}', 'settings.enc': 'synthetic-encrypted-settings-bytes', 'leads.jsonl': '{"synthetic":true}\n', 'audit.jsonl': '{"event":"synthetic"}\n', 'conformance/DP-15411/import-abcdef.json': '{"synthetic":"original-evidence"}', 'conformance/workbench/notes/synthetic.json': '{"synthetic":"private-workbook"}' };
  for (const [name, value] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(process.env.DATA_DIR, name)), { recursive: true }); await fs.writeFile(path.join(process.env.DATA_DIR, name), value); }
  const archive = await backup.create('synthetic operator'); assert.equal(archive.files, 7); assert.equal(JSON.stringify(archive).includes('original-evidence'), false);
  const target = path.join(root, 'staging'); const result = await backup.restore(archive, target); assert.equal(result.files, 7);
  for (const [name, value] of Object.entries(files)) assert.equal(await fs.readFile(path.join(target, name), 'utf8'), value);
  const marker = JSON.parse(await fs.readFile(path.join(target, storage.STATE), 'utf8')); assert.equal(marker.restorePending, true); assert.equal(marker.deploymentVerifiedAt, null);
  await assert.rejects(backup.restore(archive, target), /must be empty/);
  await assert.rejects(backup.restore(archive, process.env.DATA_DIR), /separate empty/);
  await assert.rejects(backup.restore(archive, path.join(process.env.DATA_DIR, 'staging')), /separate empty/);
  process.env.PORTAL_DATA_ID = marker.id; await fs.rename(process.env.DATA_DIR, path.join(root, 'detached-source'));
  assert.equal((await backup.restore(archive, path.join(root, 'recovery-without-live-volume'))).files, 7);
});
test('backup tampering and a changed session secret are rejected before creating a restore folder', async t => {
  const root = await fixture(t); await storage.initialize(); const archive = await backup.create('synthetic operator');
  const target = path.join(root, 'must-not-exist');
  const edited = { ...archive, tag: Buffer.alloc(16).toString('base64') }; await assert.rejects(backup.restore(edited, target), /could not be verified/);
  process.env.SESSION_SECRET = 'different synthetic secret'; await assert.rejects(backup.restore(archive, target), /could not be verified/);
  await assert.rejects(fs.access(target));
});
test('empty folders can be recovered and data/restore symlinks are refused', async t => {
  const root = await fixture(t); await storage.initialize(); const archive = await backup.create('synthetic operator');
  assert.equal((await backup.restore(archive, path.join(root, 'empty-restored'))).files, 0);
  const outside = path.join(root, 'outside'); await fs.mkdir(outside); await fs.writeFile(path.join(outside, 'private.json'), '{"synthetic":"outside-data"}');
  const link = path.join(process.env.DATA_DIR, 'outside-link'); await fs.symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(backup.create('synthetic operator'), /links outside/);
  await assert.rejects(backup.restore(archive, link), /separate empty/);
  const restoreLink = path.join(root, 'restore-link'); await fs.symlink(outside, restoreLink, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(backup.restore(archive, restoreLink), /symbolic link/);
});
test('damaged user lists and settings are preserved instead of silently replaced with defaults', async t => {
  await fixture(t); const userFile = path.join(process.env.DATA_DIR, 'users.json'); const settingsFile = path.join(process.env.DATA_DIR, 'settings.enc');
  await fs.writeFile(userFile, 'damaged-synthetic-users'); await fs.writeFile(settingsFile, 'damaged-synthetic-settings');
  assert.throws(() => child(`require('./server/users').list(); console.log('{}')`));
  assert.throws(() => child(`require('./server/settings').updateMail({SMTP_HOST:'synthetic'}); console.log('{}')`));
  assert.equal(await fs.readFile(userFile, 'utf8'), 'damaged-synthetic-users'); assert.equal(await fs.readFile(settingsFile, 'utf8'), 'damaged-synthetic-settings');
});
test('storage status, verification and full backups are admin-only and never return plaintext settings', async t => {
  await fixture(t); const router = require('../server/portal-storage-routes'); const app = express(); app.use('/storage', router);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/storage`;
  process.env.AUTH_DISABLED = 'false';
  for (const [suffix, method] of [['', 'GET'], ['/verification', 'POST'], ['/backup', 'POST']]) assert.equal((await fetch(base + suffix, { method })).status, 401);
  const users = require('../server/users'); const prior = users.isAdmin; users.isAdmin = () => false;
  const memberApp = express(); memberApp.use((req, _res, next) => { req.user = { email: 'synthetic-member@example.invalid' }; req.isAuthenticated = () => true; next(); }); memberApp.use('/storage', router);
  const memberServer = memberApp.listen(0, '127.0.0.1'); await new Promise(resolve => memberServer.once('listening', resolve));
  t.after(async () => { users.isAdmin = prior; await new Promise(resolve => memberServer.close(resolve)); });
  for (const [suffix, method] of [['', 'GET'], ['/verification', 'POST'], ['/backup', 'POST']]) assert.equal((await fetch(`http://127.0.0.1:${memberServer.address().port}/storage${suffix}`, { method })).status, 403);
  process.env.AUTH_DISABLED = 'true';
  const status = await fetch(base); assert.equal(status.status, 200); assert.equal(status.headers.get('cache-control'), 'no-store');
  const archive = await (await fetch(base + '/backup', { method: 'POST' })).json(); assert.equal(archive.format, 'portal-data-backup-v1'); assert.equal(archive.owner, undefined); assert.equal(archive.encrypted.includes('synthetic-portal-storage-secret'), false);
});
