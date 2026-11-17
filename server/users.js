// Users of the backend (API Console). Sign-in is by Google, but only for an
// email on this list. The admins are fixed in ADMIN_EMAILS. An admin adds and
// removes members in the console (Users page), changes settings and can view
// the certificates and keys; members can use the console but none of that.
//
// Stored in DATA_DIR/users.json (keep DATA_DIR on a persistent volume).
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'users.json');

// Admins, fixed in code: changing who is an admin is a code change, not a console action.
const ADMIN_EMAILS = ['angch@tertiaryinfotech.com', 'danny@tertiaryinfotech.com'];
const ADMIN_EMAIL = ADMIN_EMAILS[0]; // the owner: default recipient for test mail
// Members created the first time the file is written. Nobody else can sign in
// until the admin adds them: there is no domain-wide or environment allow-list.
const SEED_MEMBERS = ['angss@tertiaryinfotech.com', 'deepa@tertiaryinfotech.com'];

const norm = (e) => String(e || '').trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let cache = null;
function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    const now = new Date().toISOString();
    cache = { users: [...ADMIN_EMAILS, ...SEED_MEMBERS]
      .map((email) => ({ email, role: ADMIN_EMAILS.includes(email) ? 'admin' : 'member', addedAt: now, addedBy: 'system', lastLogin: null })) };
    save();
  }
  // The admins are always present, and nobody else is an admin, whatever the file says.
  cache.users = cache.users.filter((u) => u && EMAIL.test(u.email));
  for (const u of cache.users) u.role = ADMIN_EMAILS.includes(norm(u.email)) ? 'admin' : 'member';
  for (const email of [...ADMIN_EMAILS].reverse()) {
    if (!cache.users.some((u) => norm(u.email) === email)) cache.users.unshift({ email, role: 'admin', addedAt: new Date().toISOString(), addedBy: 'system', lastLogin: null });
  }
  cache.users.sort((a, b) => (b.role === 'admin') - (a.role === 'admin'));
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
const isAdmin = (email) => ADMIN_EMAILS.includes(norm(email));

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
  if (ADMIN_EMAILS.includes(e)) throw new Error('An admin cannot be removed');
  const before = load().users.length;
  cache.users = cache.users.filter((u) => norm(u.email) !== e);
  if (cache.users.length === before) throw new Error('No such user');
  save();
}

module.exports = { ADMIN_EMAIL, ADMIN_EMAILS, admit, recordLogin, roleOf, isAdmin, list, add, remove, find };
