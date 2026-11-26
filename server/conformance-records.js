// Private, file-backed evidence. Never put original reports in client/public.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const DIR = () => path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'conformance', 'DP-15411');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const parse = value => { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } };
function targetOf(c) {
  try {
    const raw = c.url || c.path || c.requestPath || '';
    const target = new URL(raw, 'https://uat-api.ssg-wsg.sg');
    return target.origin === 'https://uat-api.ssg-wsg.sg' && !target.username && !target.password && /^\/trainingProviders\/[A-Za-z0-9-]+\/trainers$/.test(target.pathname) ? target : null;
  } catch { return null; }
}
function checkSecrets(value) {
  if (typeof value === 'string' && /-----BEGIN (?:RSA |EC |ENCRYPTED )?(?:PRIVATE KEY|CERTIFICATE)-----|\bBearer\s+[A-Za-z0-9._~-]{16}/.test(value)) throw new Error('Evidence must not contain PEM credentials or bearer tokens.');
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:privateKey|clientSecret|accessToken|refreshToken|encryptionKey|(?:UAT|SFW)_(?:KEY|CERT)(?:_PEM)?|(?:UAT|SFW_RESPONSE)_ENCRYPTION_KEY|authorization|cookie|password)$/i.test(key) && child && !(key === 'authorization' && typeof child === 'string' && !/bearer|basic /i.test(child) && child.includes('Danny'))) throw new Error('Evidence contains a credential field. Remove credentials before importing.');
    checkSecrets(child);
  }
}
function normalize(report, filename, importedBy = 'Evidence archive') {
  checkSecrets(report);
  const candidates = report.cases || report.results || (report.result && typeof report.result === 'object' ? [report.result] : report.check ? [report.check] : []);
  const selected = candidates.filter(c => (c.method === 'POST' || c.id === 'TS01') && targetOf(c) && (!c.ticket || c.ticket === 'DP-15411'));
  if (!selected.length) throw new Error('No DP-15411 Add UAT attempt was found in this report.');
  return selected.map(c => {
    const at = c.startedAt || report.startedAt;
    if (!at || !Number.isFinite(Date.parse(at))) throw new Error('The report needs an original execution timestamp.');
    const functional = c.id === 'TS01';
    const body = c.decryptedResponse ?? c.response ?? c.responseBody ?? c.rawResponse ?? { status: c.responseStatus, messages: c.serviceMessages };
    const requestBody = c.decryptedRequest ?? c.requestBody ?? c.body ?? (report.check ? '{}' : null);
    const httpStatus = c.httpStatus ?? c.status;
    const sourceText = JSON.stringify(report);
    const id = `import-${sha(`${at}|${c.id}|${httpStatus}|${c.rawResponse || JSON.stringify(body)}`).slice(0, 24)}`;
    const parsed = parse(body);
    const trainerId = parsed?.data?.trainer?.id;
    const passed = functional && httpStatus === 200 && Number(parsed?.status) === 200 && !!trainerId;
    const outcome = functional ? (passed ? 'pass' : 'fail') : 'diagnostic';
    const interpretation = !functional ? 'Validation/access diagnostic only. This does not establish a functional TS01 pass.' : passed ? 'TS01 returned HTTP/API 200 and a new trainer ID.' : httpStatus === 401 || httpStatus === 403 ? 'Blocked by UAT access; no new trainer ID was returned.' : httpStatus === 500 ? 'Gateway decryption failed; Add did not complete.' : JSON.stringify(parsed).includes('Trainer ID Number already exists') ? 'The workbook identity already exists. No new trainer ID was returned.' : 'TS01 did not meet its success criteria. Review the recorded response.';
    const target = targetOf(c);
    return { id, ticket: 'DP-15411', application: report.application || 'Training provider application', applicationId: report.applicationId || null, testUen: target.pathname.split('/')[2], caseId: functional ? 'TS01' : c.id || 'Access probe', kind: functional ? 'Functional test' : 'Diagnostic', origin: 'Imported history', at,
      title: functional ? 'Add trainer — TS01' : report.check ? 'Encrypted empty-object validation' : c.testType || c.description || 'Add endpoint access probe',
      state: 'completed', outcome, interpretation, identityHash: requestBody?.trainer?.idNumber ? sha(requestBody.trainer.idNumber.toUpperCase()) : null, trainerId: trainerId ? String(trainerId) : null, executedBy: report.executedBy || 'Recorded local test', importedBy, importedAt: new Date().toISOString(),
      request: { method: 'POST', url: target.href, version: 'v2.0', encrypted: !!c.encryptedRequest || /encrypt/i.test(report.purpose || report.requestShape || ''), body: parse(requestBody), encryptedBody: c.encryptedRequest || null },
      response: { status: httpStatus, apiStatus: parsed && typeof parsed === 'object' ? parsed.status ?? null : null, body: parsed, rawBody: c.rawResponse ?? c.responseBody ?? null, ms: c.finishedAt ? Math.max(0, Date.parse(c.finishedAt) - Date.parse(at)) : null },
      source: { filename: path.basename(filename), sha256: sha(sourceText), original: true }, evidence: report };
  });
}
async function ensure() {
  await fs.mkdir(DIR(), { recursive: true });
  let seeds = [];
  if (process.env.CONFORMANCE_SEED_FILE) { try { seeds = JSON.parse(await fs.readFile(process.env.CONFORMANCE_SEED_FILE, 'utf8')); } catch (err) { if (err.code !== 'ENOENT') throw err; } }
  for (const record of seeds) { try { await fs.writeFile(path.join(DIR(), `${record.id}.json`), JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 }); } catch (err) { if (err.code !== 'EEXIST') throw err; } }
}
async function list() {
  await ensure();
  const names = (await fs.readdir(DIR())).filter(n => /^(?:import|run)-[a-f0-9-]+\.json$/.test(n));
  const records = await Promise.all(names.map(async name => JSON.parse(await fs.readFile(path.join(DIR(), name), 'utf8'))));
  return records.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
async function save(record, fresh = false) {
  await ensure();
  if (!/^(?:import|run)-[a-f0-9-]+$/.test(record.id)) throw new Error('Invalid evidence ID.');
  const file = path.join(DIR(), `${record.id}.json`);
  if (fresh) await fs.writeFile(file, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
  else { const tmp = `${file}.${crypto.randomUUID()}.tmp`; await fs.writeFile(tmp, JSON.stringify(record, null, 2), { mode: 0o600 }); await fs.rename(tmp, file); }
}
async function importReport(report, filename, user) {
  const records = normalize(report, filename, user); const existing = await list(); let imported = 0;
  for (const record of records) {
    const prior = existing.find(r => r.id === record.id);
    if (!prior) { await save(record, true); imported++; }
    else if (!prior.source?.original) { await save({ ...prior, evidence: report, source: record.source, importedBy: user, importedAt: record.importedAt }); imported++; }
  }
  return imported;
}
async function preparation() { await ensure(); try { return JSON.parse(await fs.readFile(path.join(DIR(), 'preparation.json'), 'utf8')); } catch (err) { if (err.code === 'ENOENT') return null; throw err; } }
async function savePreparation(value) { await ensure(); const tmp = path.join(DIR(), `prep-${crypto.randomUUID()}.tmp`); await fs.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 }); await fs.rename(tmp, path.join(DIR(), 'preparation.json')); }
module.exports = { DIR, targetOf, sha, normalize, checkSecrets, list, save, importReport, preparation, savePreparation };
