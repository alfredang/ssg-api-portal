// ─────────────────────────────────────────────────────────────────
// File-based per-user defaults store (replaces Firestore / Postgres).
//
// Defaults are stored as a single JSON file on disk, keyed by user id:
//   { "local": { ...defaults }, "google:123": { ...defaults } }
//
// On localhost the key is the fixed "local" user; on the remote site it is
// the signed-in Google user. Writes are serialized and written atomically
// (temp file + rename) so concurrent saves can't corrupt the file.
//
// Location is configurable via DATA_DIR (default: server/data). On Coolify,
// mount a persistent volume at that path so defaults survive redeploys.
// ─────────────────────────────────────────────────────────────────
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'defaults.json');

// Ensure the data directory exists up front.
fs.mkdirSync(DATA_DIR, { recursive: true });

// Serialize all reads/writes through a single promise chain to avoid races.
let queue = Promise.resolve();
function withLock(fn) {
  const run = queue.then(fn, fn);
  // Keep the chain alive even if fn rejects.
  queue = run.then(() => {}, () => {});
  return run;
}

async function readAll() {
  try {
    const raw = await fsp.readFile(FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeAll(obj) {
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fsp.rename(tmp, FILE);
}

// Read one user's defaults map ({} if none).
function getDefaults(userId) {
  return withLock(async () => {
    const all = await readAll();
    return all[userId] ?? {};
  });
}

// Replace one user's defaults map.
function saveDefaults(userId, data) {
  return withLock(async () => {
    const all = await readAll();
    all[userId] = data || {};
    await writeAll(all);
    return all[userId];
  });
}

module.exports = { getDefaults, saveDefaults, DATA_DIR, FILE };
