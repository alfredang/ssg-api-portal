// Users of the backend (API Console). Sign-in is by Google, but only for an
// email on this list. One admin, fixed: ADMIN_EMAIL. The admin adds and
// removes members in the console (Users page); members can use the console
// but cannot manage users or settings.
//
// Stored in DATA_DIR/users.json (keep DATA_DIR on a persistent volume).
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'users.json');

const ADMIN_EMAIL = 'angch@tertiaryinfotech.com';
// Members created the first time the file is written. Nobody else can sign in
// until the admin adds them: there is no domain-wide or environment allow-list.
const SEED_MEMBERS = ['angss@tertiaryinfotech.com', 'danny@tertiaryinfotech.com', 'deepa@tertiaryinfotech.com'];

const norm = (e) => String(e || '').trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let cache = null;
function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    const now = new Date().toISOString();
    cache = { users: [ADMIN_EMAIL, ...SEED_MEMBERS]
      .map((email) => ({ email, role: email === ADMIN_EMAIL ? 'admin' : 'member', addedAt: now, addedBy: 'system', lastLogin: null })) };
    save();
  }
  // The admin is always present and always the only admin, whatever the file says.
  cache.users = cache.users.filter((u) => u && EMAIL.test(u.email));
  for (const u of cache.users) u.role = norm(u.email) === ADMIN_EMAIL ? 'admin' : 'member';
  if (!cache.users.some((u) => norm(u.email) === ADMIN_EMAIL)) cache.users.unshift({ email: ADMIN_EMAIL, role: 'admin', addedAt: new Date().toISOString(), addedBy: 'system', lastLogin: null });
  return cache;
}
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

const find = (email) => load().users.find((u) => norm(u.email) === norm(email));
const roleOf = (email) => find(email)?.role || null;
const isAdmin = (email) => norm(email) === ADMIN_EMAIL;

/** May this email sign in (by Google or by one-time code)? Only if it is on the list. */
function admit(email) {
  return EMAIL.test(norm(email)) && !!find(email);
}
function recordLogin(email) {
  const u = find(email);
  if (u) { u.lastLogin = new Date().toISOString(); save(); }
}
function list() { return load().users.map((u) => ({ ...u })); }
function add(email, addedBy) {
  const e = norm(email);
  if (!EMAIL.test(e)) throw new Error('Enter a valid email address');
  if (find(e)) throw new Error('That user already exists');
  load().users.push({ email: e, role: 'member', addedAt: new Date().toISOString(), addedBy, lastLogin: null });
  save();
}
function remove(email) {
  const e = norm(email);
  if (e === ADMIN_EMAIL) throw new Error('The admin cannot be removed');
  const before = load().users.length;
  cache.users = cache.users.filter((u) => norm(u.email) !== e);
  if (cache.users.length === before) throw new Error('No such user');
  save();
}

module.exports = { ADMIN_EMAIL, admit, recordLogin, roleOf, isAdmin, list, add, remove, find };
