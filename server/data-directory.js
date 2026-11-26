const path = require('node:path');
const fs = require('node:fs');
const MARKER = '.portal-storage.json';

// One location for all portal data. Keep the existing default and file names.
function configuredDirectory() {
  const configured = process.env.DATA_DIR;
  const directory = path.resolve(configured || path.join(__dirname, 'data'));
  if (directory === path.parse(directory).root) throw new Error('DATA_DIR must be a dedicated portal data folder.');
  return directory;
}
function dataDirectory() {
  const directory = configuredDirectory();
  if (process.env.PORTAL_DATA_ID) {
    try { if (JSON.parse(fs.readFileSync(path.join(directory, MARKER), 'utf8')).id !== process.env.PORTAL_DATA_ID) throw new Error(); }
    catch { throw new Error('The expected portal data folder is missing or different. Reattach the original storage before starting the app.'); }
  }
  return directory;
}
module.exports = { dataDirectory, configuredDirectory, MARKER };
