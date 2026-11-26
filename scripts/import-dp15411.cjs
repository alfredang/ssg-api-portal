// Import reviewed evidence, or package it for the staff-only portal.
// No API request is executed. Generated bundles must stay private.
const fs = require('node:fs/promises');
const path = require('node:path');
const records = require('../server/conformance-records');
async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) throw new Error('Usage: node scripts/import-dp15411.cjs <archive-directory> [--bundle <private-output.json>]');
  const root = path.resolve(args[0]); const bundleIndex = args.indexOf('--bundle');
  if (bundleIndex !== -1 && !args[bundleIndex + 1]) throw new Error('Specify a private bundle output path.');
  const sources = [
    ['SWDA_Trainer_Conformance_2026-11-13.json', 'cases'],
    ['SWDA_UAT_Entitlement_Probe_2026-11-20.json', 'results'],
    ['SWDA_Add_Valid_Encrypted_Retest_2026-11-24.json'],
    ['diagnostics-2026-11-24/nonmutating-gateway-results.json', 'cases'],
    ['diagnostics-2026-11-24/independent-python-http-results.json', 'cases'],
    ['SWDA_Add_Key_Validation_2026-11-25.json'],
    ['SWDA_Add_TS01_Retest_2026-11-26.json'],
  ];
  const reports = []; let addUrl;
  for (const [filename, collection] of sources) {
    let report;
    try { report = JSON.parse(await fs.readFile(path.join(root, filename), 'utf8')); }
    catch (err) { if (err.code === 'ENOENT') { console.log(`Missing optional evidence: ${filename}`); continue; } throw err; }
    if (Array.isArray(report) && filename.includes('independent-python')) {
      if (!addUrl) throw new Error('Import primary TS01 evidence before packaging independent diagnostics.');
      report = { purpose: 'Independent Python HTTPS encrypted empty-object Add diagnostics', cases: report.map(c => ({ id: `python-${c.case}`, method: 'POST', url: addUrl, startedAt: c.at, httpStatus: c.httpStatus, response: c.response, description: `Independent Python diagnostic: ${c.case}` })) };
    }
    if (collection && Array.isArray(report[collection])) report = { ...report, [collection]: report[collection].filter(c => (c.method === 'POST' || c.id === 'TS01') && records.targetOf(c) && (!c.ticket || c.ticket === 'DP-15411')) };
    if (collection && !report[collection]?.length) continue;
    const normalized = records.normalize(report, path.basename(filename));
    addUrl ||= normalized[0].request.url;
    if (bundleIndex !== -1) reports.push({ filename: path.basename(filename), report });
    else console.log(`${filename}: ${await records.importReport(report, path.basename(filename), 'Reviewed local archive')} attempt(s) imported`);
  }
  if (bundleIndex !== -1) {
    const destination = path.resolve(args[bundleIndex + 1]);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, JSON.stringify({ format: 'DP15411-evidence-bundle-v1', reports }), { mode: 0o600 });
    console.log(`Prepared private bundle with ${reports.length} reports. Import through the signed-in portal; do not publish it.`);
  }
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
