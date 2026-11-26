const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const legacy = require('./conformance-records');
const root = () => path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'conformance', 'workbench');
const valid = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,100}$/.test(id);
function file(group, id) {
  if (!['runs', 'drafts', 'templates', 'locks', 'notes'].includes(group) || !valid(id)) throw new Error('Invalid record identifier.');
  return path.join(root(), group, `${id}.json`);
}
async function get(group, id) { try { return JSON.parse(await fs.readFile(file(group, id), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
async function save(group, id, value, fresh = false) {
  const target = file(group, id); await fs.mkdir(path.dirname(target), { recursive: true });
  if (fresh) await fs.writeFile(target, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
  else { const tmp = `${target}.${crypto.randomUUID()}.tmp`; await fs.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 }); await fs.rename(tmp, target); }
}
async function list(group) {
  await fs.mkdir(path.join(root(), group), { recursive: true });
  const names = (await fs.readdir(path.join(root(), group))).filter(n => /^[a-z0-9-]+\.json$/.test(n));
  return Promise.all(names.map(name => get(group, name.slice(0, -5))));
}
async function history() {
  const old = (await legacy.list()).map(r => ({ ...r, legacy: true, templateId: r.caseId === 'TS01' ? 'trainer-add' : 'trainer-add-diagnostic', classification: r.kind === 'Diagnostic' ? 'diagnostic' : 'conformance', workflowId: r.trainerId ? r.id : null }));
  return [...old, ...await list('runs')].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
async function findRun(id) { if (!valid(id)) return null; return (await history()).find(r => r.id === id) || null; }
function visible({ evidence, identityHash, credentialVersion, ...record }) { return record; }
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, /^(?:authorization|cookie|set-cookie|password|private_?key|client_?secret|access_?token|refresh_?token|api[-_]?key|x-api-key|encryption_?key)$/i.test(key) ? '[redacted credential]' : redact(child)]));
  if (typeof value === 'string' && /-----BEGIN (?:RSA |EC |ENCRYPTED )?(?:PRIVATE KEY|CERTIFICATE)-----|\bBearer\s+[A-Za-z0-9._~-]{16}/.test(value)) return '[redacted credential]';
  return value;
}
async function lock(resource, runId) {
  const id = 'resource-' + crypto.createHash('sha256').update(resource).digest('hex');
  await save('locks', id, { runId, resource, at: new Date().toISOString() }, true).catch(e => { if (e.code === 'EEXIST') throw new Error('An earlier write to this resource is running or needs reconciliation.'); throw e; });
  return id;
}
async function release(id) { await fs.unlink(file('locks', id)).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
module.exports = { root, valid, get, save, list, history, findRun, visible, redact, lock, release };
