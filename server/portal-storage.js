const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { dataDirectory, MARKER } = require('./data-directory');
const BOOT = crypto.randomUUID();
const STATE = MARKER;
const PROBE = '.portal-storage-probe.json';
const AREAS = ['', 'conformance/DP-15411', 'conformance/workbench'];
const starts = new Map();
function buildId() {
  const hash = crypto.createHash('sha256');
  for (const name of fsSync.readdirSync(__dirname).filter(n => /\.(js|json)$/.test(n)).sort()) hash.update(name).update(fsSync.readFileSync(path.join(__dirname, name)));
  const client = path.join(__dirname, '../client/dist/index.html');
  if (fsSync.existsSync(client)) hash.update(fsSync.readFileSync(client));
  return hash.digest('hex');
}
const BUILD = buildId();
async function json(file) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
async function atomic(file, value) {
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  try { await fs.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }); await fs.rename(tmp, file); }
  finally { await fs.unlink(tmp).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
}
async function probes(directory, id) {
  for (const area of AREAS) {
    let folder = directory;
    for (const part of ['', ...area.split('/').filter(Boolean)]) {
      if (part) folder = path.join(folder, part);
      try { if ((await fs.lstat(folder)).isSymbolicLink()) throw new Error('The shared data folder and its test folders must not be symbolic links.'); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    await fs.mkdir(folder, { recursive: true, mode: 0o700 });
    await atomic(path.join(folder, PROBE), { id });
  }
}
async function initialize() {
  const directory = dataDirectory();
  if (!starts.has(directory)) starts.set(directory, (async () => {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const previous = await json(path.join(directory, STATE));
    if (previous && (previous.schema !== 1 || typeof previous.id !== 'string' || !previous.id)) throw new Error('The storage verification record is unreadable. Preserve the folder before repairing it.');
    const now = new Date().toISOString();
    const state = previous || { schema: 1, id: crypto.randomUUID(), createdAt: now, deploymentVerifiedAt: null, restartVerifiedAt: null };
    if (previous && previous.bootId !== BOOT && !previous.restorePending) {
      const survived = (await Promise.all(AREAS.map(area => json(path.join(directory, area, PROBE))))).every(probe => probe?.id === state.id);
      if (survived && !state.lossDetectedAt) {
        state.restartVerifiedAt = now;
        if (previous.buildId && previous.buildId !== BUILD) state.deploymentVerifiedAt = now;
      } else { state.lossDetectedAt = state.lossDetectedAt || now; state.deploymentVerifiedAt = null; }
    }
    if (!previous) await probes(directory, state.id);
    delete state.restorePending; state.bootId = BOOT; state.buildId = BUILD; state.startedAt = now;
    await atomic(path.join(directory, STATE), state);
    return state;
  })());
  return starts.get(directory);
}
async function armVerification() {
  const state = await initialize(); const now = new Date().toISOString();
  const next = { schema: 1, id: state.id, createdAt: now, bootId: BOOT, buildId: BUILD, startedAt: now, deploymentVerifiedAt: null, restartVerifiedAt: null };
  await probes(dataDirectory(), next.id); await atomic(path.join(dataDirectory(), STATE), next);
  Object.keys(state).forEach(key => delete state[key]); Object.assign(state, next);
  return status();
}
async function writable(directory) {
  const file = path.join(directory, `.portal-write-check-${crypto.randomUUID()}`);
  try { await fs.writeFile(file, '', { flag: 'wx', mode: 0o600 }); return true; }
  finally { await fs.unlink(file).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
}
async function inventory(directory = dataDirectory()) {
  const files = [];
  async function visit(folder, relative = '') {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name.endsWith('.tmp')) continue;
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error('Backups do not follow links outside the portal data folder.');
      if (entry.isDirectory()) await visit(path.join(folder, entry.name), name);
      else if (entry.isFile()) { const stat = await fs.stat(path.join(folder, entry.name)); files.push({ name, bytes: stat.size, modified: stat.mtimeMs }); }
    }
  }
  await visit(directory); return files.sort((a, b) => a.name.localeCompare(b.name));
}
async function mountObserved(directory) {
  try {
    const lines = (await fs.readFile('/proc/self/mountinfo', 'utf8')).split('\n');
    return lines.some(line => { const location = line.split(' ')[4]?.replace(/\\040/g, ' '); return location && location !== '/' && (directory === location || directory.startsWith(location + '/')); });
  } catch { return false; }
}
async function status() {
  const directory = dataDirectory();
  try {
    const state = await initialize(); await writable(directory);
    const observed = await json(path.join(directory, STATE));
    const retained = observed?.id === state.id && (await Promise.all(AREAS.map(area => json(path.join(directory, area, PROBE))))).every(probe => probe?.id === state.id);
    if (!retained) { state.lossDetectedAt = state.lossDetectedAt || new Date().toISOString(); state.deploymentVerifiedAt = null; }
    const files = await inventory(directory);
    const buckets = [
      ['Users', n => n === 'users.json'], ['Defaults', n => n === 'defaults.json'], ['Settings', n => n === 'settings.enc'],
      ['Enquiries and audit', n => ['leads.jsonl', 'audit.jsonl'].includes(n)], ['Test history and workbooks', n => n.startsWith('conformance/')],
      ['Other portal data', n => !['users.json', 'defaults.json', 'settings.enc', 'leads.jsonl', 'audit.jsonl'].includes(n) && !n.startsWith('conformance/')],
    ].map(([label, match]) => ({ label, files: files.filter(f => match(f.name)).length, bytes: files.filter(f => match(f.name)).reduce((sum, f) => sum + f.bytes, 0) }));
    return { directory, storageId: state.id, writable: true, mountObserved: await mountObserved(directory), deploymentVerifiedAt: state.deploymentVerifiedAt || null, restartVerifiedAt: state.restartVerifiedAt || null,
      lossDetectedAt: state.lossDetectedAt || null, baselineAt: state.createdAt, buildId: BUILD.slice(0, 12), files: files.length, bytes: files.reduce((sum, f) => sum + f.bytes, 0), buckets,
      backupOptional: !!state.deploymentVerifiedAt && !state.lossDetectedAt };
  } catch (e) { return { directory, writable: false, backupOptional: false, error: e.code ? 'The server data folder is not accessible. Check its storage attachment and permissions.' : e.message }; }
}
async function recoveryTime() { return (await json(path.join(dataDirectory(), STATE)))?.restoredAt || null; }
module.exports = { initialize, status, armVerification, inventory, recoveryTime, dataDirectory, STATE, PROBE };
