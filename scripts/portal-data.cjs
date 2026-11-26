// Run on the portal host, not against a different application's data directory.
require('dotenv').config({ quiet: true });
const fs = require('node:fs/promises');
const path = require('node:path');
const storage = require('../server/portal-storage');
const backup = require('../server/portal-data-backup');
async function main() {
  const [command, file, destination] = process.argv.slice(2);
  if (command === 'status') { const value = await storage.status(); console.log(JSON.stringify(value, null, 2)); if (!value.writable) process.exitCode = 1; return; }
  if (command === 'backup' && file) {
    const output = path.resolve(file); const root = storage.dataDirectory();
    if (output === root || output.startsWith(root + path.sep)) throw new Error('Save the backup outside DATA_DIR.');
    await fs.writeFile(output, JSON.stringify(await backup.create('Server operator')), { flag: 'wx', mode: 0o600 });
    console.log('Encrypted portal backup saved. Keep it private and retain the server session secret separately.'); return;
  }
  if (command === 'restore' && file && destination) {
    const result = await backup.restore(JSON.parse(await fs.readFile(file, 'utf8')), destination);
    console.log(`Restored ${result.files} files into the empty staging folder. Verify it before attaching it to the application.`); return;
  }
  throw new Error('Usage: node scripts/portal-data.cjs status | backup <private-file> | restore <private-file> <empty-staging-folder>');
}
main().catch(e => { console.error(e.code ? 'Data folder operation failed. Check paths and permissions; existing files were not replaced.' : e.message); process.exitCode = 1; });
