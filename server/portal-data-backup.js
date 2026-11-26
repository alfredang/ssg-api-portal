// An operator recovery archive for the existing DATA_DIR, encrypted on the
// server. Never include this archive or its encryption secret in source control.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const storage = require('./portal-storage');
const FORMAT = 'portal-data-backup-v1';
const MAX = 6 * 1024 * 1024;
function key() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'dev-insecure-secret-change-me') throw new Error('A stable SESSION_SECRET is required for an encrypted portal backup.');
  return crypto.hkdfSync('sha256', process.env.SESSION_SECRET, 'portal-data-backup', FORMAT, 32);
}
function safeName(name) {
  return typeof name === 'string' && name.length < 500 && !/[\\:\x00-\x1f]/.test(name) && name.split('/').every(part => part && part === part.trim() && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.tmp') && !/^(?:CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(?:\.|$)/i.test(part));
}
async function create(owner) {
  const directory = storage.dataDirectory(); const before = await storage.inventory(directory); const files = []; let bytes = 0;
  for (const item of before) {
    if (!safeName(item.name)) throw new Error('A data file has an unsupported name. Use an offline operator backup.');
    bytes += item.bytes;
    if (bytes > MAX) throw new Error('The data folder is too large for an in-browser backup. Use an offline operator backup.');
    const location = path.join(directory, item.name); if ((await fs.lstat(location)).isSymbolicLink()) throw new Error('Data links are not included in portal backups.');
    const file = await fs.open(location, require('node:fs').constants.O_RDONLY | (require('node:fs').constants.O_NOFOLLOW || 0));
    try { const stat = await file.stat(); if (!stat.isFile()) throw new Error('The data folder changed during backup. Try again.'); files.push({ name: item.name, content: (await file.readFile()).toString('base64') }); }
    finally { await file.close(); }
  }
  if (JSON.stringify(before) !== JSON.stringify(await storage.inventory(directory))) throw new Error('Portal data changed during backup. Try again, or back it up while the app is stopped.');
  const marker = await fs.readFile(path.join(directory, storage.STATE), 'utf8').then(JSON.parse).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
  const payload = Buffer.from(JSON.stringify({ owner, at: new Date().toISOString(), storageId: marker?.id || null, files }));
  if (payload.length > MAX) throw new Error('The data folder is too large for an in-browser backup. Use an offline operator backup.');
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv); cipher.setAAD(Buffer.from(FORMAT));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return { format: FORMAT, at: new Date().toISOString(), files: files.length, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), encrypted: encrypted.toString('base64') };
}
function open(archive) {
  try {
    if (archive?.format !== FORMAT || typeof archive.encrypted !== 'string' || archive.encrypted.length > MAX * 1.4) throw new Error();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(archive.iv, 'base64')); decipher.setAAD(Buffer.from(FORMAT)); decipher.setAuthTag(Buffer.from(archive.tag, 'base64'));
    const payload = JSON.parse(Buffer.concat([decipher.update(Buffer.from(archive.encrypted, 'base64')), decipher.final()]).toString());
    if (payload.storageId != null && (typeof payload.storageId !== 'string' || !/^[a-f0-9-]{36}$/.test(payload.storageId))) throw new Error();
    if (!Array.isArray(payload.files) || payload.files.length > 20000 || payload.files.some(f => !safeName(f.name) || typeof f.content !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.content))) throw new Error();
    if (new Set(payload.files.map(f => f.name.toLowerCase())).size !== payload.files.length) throw new Error();
    return payload;
  } catch { throw new Error('The portal backup could not be verified. Keep the original archive and use its original server session secret.'); }
}
async function restore(archive, destination) {
  const payload = open(archive); const target = path.resolve(destination);
  // Recovery must work even when the pinned live volume is absent. Resolve its
  // configured path for containment checks without opening that live folder.
  const live = require('./data-directory').configuredDirectory();
  if (target === path.parse(target).root || target === live || live.startsWith(target + path.sep) || target.startsWith(live + path.sep)) throw new Error('Restore into a separate empty staging folder while the app is stopped.');
  if (process.env.PORTAL_DATA_ID && payload.storageId && process.env.PORTAL_DATA_ID !== payload.storageId) throw new Error('This archive belongs to a different portal data folder. Keep the current storage identity unchanged.');
  try { if ((await fs.lstat(target)).isSymbolicLink()) throw new Error('The restore folder must not be a symbolic link.'); if ((await fs.readdir(target)).length) throw new Error('The restore folder must be empty. Existing portal data will not be overwritten.'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  // All names and archive authentication are checked before creating files.
  const names = new Set(payload.files.map(f => f.name.toLowerCase()));
  for (const item of payload.files) for (let parent = path.posix.dirname(item.name); parent !== '.'; parent = path.posix.dirname(parent)) if (names.has(parent.toLowerCase())) throw new Error('The archive contains conflicting file paths.');
  await fs.mkdir(target, { recursive: true, mode: 0o700 });
  for (const item of payload.files) {
    const file = path.resolve(target, item.name);
    if (!file.startsWith(target + path.sep)) throw new Error('Invalid restore path.');
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await fs.writeFile(file, Buffer.from(item.content, 'base64'), { mode: 0o600, flag: 'wx' });
  }
  if (payload.storageId) {
    const id = payload.storageId; const now = new Date().toISOString();
    await fs.writeFile(path.join(target, storage.STATE), JSON.stringify({ schema: 1, id, createdAt: now, restoredAt: now, restorePending: true, deploymentVerifiedAt: null, restartVerifiedAt: null }), { mode: 0o600, flag: 'wx' });
    for (const area of ['', 'conformance/DP-15411', 'conformance/workbench']) { const folder = path.join(target, area); await fs.mkdir(folder, { recursive: true, mode: 0o700 }); await fs.writeFile(path.join(folder, storage.PROBE), JSON.stringify({ id }), { mode: 0o600, flag: 'wx' }); }
  }
  return { files: payload.files.length, destination: target };
}
module.exports = { create, open, restore };
