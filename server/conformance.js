// ─────────────────────────────────────────────────────────────────
// Conformance test runner.
//
// SSG sends a UAT test workbook (.xlsx) for some APIs and wants it back
// with the actual result of every test step. This module:
//   POST /parse   read the workbook: every test sheet, every step, and the
//                 request each step describes (method, URL, headers, payload)
//   POST /run     send ONE step to SSG's UAT environment with our UAT
//                 certificate, and return the response
//   POST /export  write the results into the same workbook and return it
//
// Safety: /run only ever calls the UAT host (UAT_API_BASE). It cannot reach
// production. The workbook is edited in place, cell by cell, so SSG's layout,
// formatting and other sheets are kept exactly.
// Nothing is stored on the server: the browser holds the workbook and results.
// ─────────────────────────────────────────────────────────────────
const express = require('express');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { unzipSync, zipSync, strFromU8, strToU8 } = require('fflate');

const router = express.Router();
const UAT_BASE = (process.env.UAT_API_BASE || 'https://uat-api.ssg-wsg.sg').replace(/\/+$/, '');
const UAT_HOST = new URL(UAT_BASE).hostname;
const IV = Buffer.from('SSGAPIInitVector', 'utf8');

function source(name) {
  const file = process.env[`${name}_FILE`];
  let v;
  if (file) { try { v = fs.readFileSync(file, 'utf8'); } catch { return undefined; } } else v = process.env[name];
  return v ? v.replace(/\\n/g, '\n').trim() : undefined;
}
function uat() {
  const cert = source('UAT_CERT'); const key = source('UAT_KEY'); const enc = source('UAT_ENCRYPTION_KEY');
  let encKey = null;
  if (enc) { try { const b = Buffer.from(enc, 'base64'); if (b.length === 32) encKey = b; } catch { /* ignore */ } }
  let validTo = null;
  if (cert) { try { validTo = new Date(new crypto.X509Certificate(cert).validTo).toISOString(); } catch { /* ignore */ } }
  return { cert, key, encKey, validTo, ready: !!(cert && key) };
}
const aes = (mode, key, text) => {
  if (mode === 'enc') { const c = crypto.createCipheriv('aes-256-cbc', key, IV); return c.update(text, 'utf8', 'base64') + c.final('base64'); }
  const d = crypto.createDecipheriv('aes-256-cbc', key, IV); return d.update(text, 'base64', 'utf8') + d.final('utf8');
};

// ── Minimal .xlsx reader and cell writer ────────────────────────
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/_x000D_/g, '').replace(/&amp;/g, '&');
const esc = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOf = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unesc(m[1])).join('');
const colNum = (ref) => ref.replace(/\d+/g, '').split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);

function openWorkbook(bytes) {
  let files;
  try { files = unzipSync(new Uint8Array(bytes)); } catch { throw new Error('This is not an Excel .xlsx workbook. Old binary .xls files must be saved as .xlsx first.'); }
  if (!files['xl/workbook.xml']) throw new Error('This file is not an Excel workbook.');
  const shared = files['xl/sharedStrings.xml'] ? [...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const rels = Object.fromEntries([...strFromU8(files['xl/_rels/workbook.xml.rels']).matchAll(/<Relationship\b[^>]*>/g)].map((m) => [(/Id="([^"]+)"/.exec(m[0]) || [])[1], (/Target="([^"]+)"/.exec(m[0]) || [])[1]]));
  const sheets = [...strFromU8(files['xl/workbook.xml']).matchAll(/<sheet\b[^>]*>/g)].map((m) => {
    const name = unesc((/name="([^"]*)"/.exec(m[0]) || [])[1] || '');
    const target = rels[(/r:id="([^"]+)"/.exec(m[0]) || [])[1]] || '';
    return { name, path: target.startsWith('/') ? target.slice(1) : `xl/${target}` };
  }).filter((s) => files[s.path]);
  return { files, shared, sheets };
}

/** { A1: 'text', ... } for one sheet. */
function readCells(wb, sheet) {
  const xml = strFromU8(wb.files[sheet.path]);
  const cells = {};
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = (/\br="([A-Z]+\d+)"/.exec(m[1]) || [])[1];
    if (!ref || m[2] === undefined) continue;
    const type = (/\bt="([^"]+)"/.exec(m[1]) || [])[1];
    const v = (/<v>([\s\S]*?)<\/v>/.exec(m[2]) || [])[1];
    let value = '';
    if (type === 's') value = wb.shared[Number(v)] ?? '';
    else if (type === 'inlineStr') value = textOf(m[2]);
    else if (v !== undefined) value = unesc(v);
    if (String(value).trim()) cells[ref] = String(value);
  }
  return cells;
}

/** Write text into one cell of a sheet's XML, keeping the cell's style. */
function writeCell(xml, ref, value) {
  const text = esc(String(value).slice(0, 32000));
  const inner = `<is><t xml:space="preserve">${text}</t></is>`;
  const existing = new RegExp(`<c\\b([^>]*\\br="${ref}"[^>]*?)(?:/>|>[\\s\\S]*?</c>)`).exec(xml);
  if (existing) {
    const attrs = existing[1].replace(/\s+t="[^"]*"/, '').replace(/\s*\/$/, '');
    return xml.slice(0, existing.index) + `<c${attrs} t="inlineStr">${inner}</c>` + xml.slice(existing.index + existing[0].length);
  }
  const rowNo = ref.replace(/[A-Z]+/, '');
  const cellXml = `<c r="${ref}" t="inlineStr">${inner}</c>`;
  const row = new RegExp(`<row\\b[^>]*\\br="${rowNo}"[^>]*?(/>|>([\\s\\S]*?)</row>)`).exec(xml);
  if (!row) throw new Error(`Row ${rowNo} is not in the sheet`);
  if (row[1] === '/>') return xml.slice(0, row.index) + row[0].slice(0, -2) + `>${cellXml}</row>` + xml.slice(row.index + row[0].length);
  // keep cells in column order
  const bodyStart = row.index + row[0].indexOf('>') + 1;
  let at = bodyStart + row[2].length;
  for (const c of row[2].matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"/g)) if (colNum(c[1]) > colNum(ref)) { at = bodyStart + c.index; break; }
  return xml.slice(0, at) + cellXml + xml.slice(at);
}

// ── Reading the test steps ──────────────────────────────────────
function balanced(text, from) {
  const start = text.indexOf('{', from);
  if (start < 0) return '';
  let depth = 0; let inStr = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) { if (ch === '\\') i++; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return text.slice(start);
}

const PAYLOAD_LABEL = /(?:sample\s+)?(?:request\s*)?(?:payload|body)\s*:|sample\s+request\s*:/i;
/** The JSON payload a step describes: after a "payload" label, else the first JSON object after the URL. */
function payloadOf(desc, urlEnd = 0) {
  const at = desc.search(PAYLOAD_LABEL);
  if (at >= 0) return balanced(desc, at);
  const candidate = balanced(desc, urlEnd);
  return /"\s*:/.test(candidate) ? candidate : '';
}

function parseStep(desc, expected) {
  const method = ((/Request(?:\s*type)?\s*:\s*(GET|POST|PUT|PATCH|DELETE)\b/i.exec(desc) || [])[1] || '').toUpperCase();
  // A step's URL is an SSG address near the top; a link inside a sample payload is not one.
  const startsWithPayload = desc.search(PAYLOAD_LABEL) >= 0 && desc.search(PAYLOAD_LABEL) < 40;
  const urlMatch = startsWithPayload ? null : /https?:\/\/[\w.-]*ssg-wsg[\w.-]*[^\s"'<>]*/i.exec(desc);
  const url = (urlMatch ? urlMatch[0] : '').replace(/[.,;]+$/, '');
  const version = (/x-api-version\s*:\s*([\w.]+)/i.exec(desc) || [])[1] || '';
  const body = url ? payloadOf(desc, urlMatch.index + urlMatch[0].length) : '';
  const expectedStatus = Number((/"status"\s*:\s*"?(\d{3})/.exec(expected) || [])[1]) || 200;
  return { method: method || (body ? 'POST' : 'GET'), url, version, body, expectedStatus };
}
/** Values the tester still has to fill in: <refer to Test Data tab>, {referenceNumber} ... */
const placeholders = (url, body) => [...new Set([...(url + '\n' + body).matchAll(/<[^<>\n"]{3,90}>|\{[A-Za-z][\w ]*\}/g)].map((m) => m[0]))];

function parseWorkbook(wb) {
  const out = [];
  for (const sheet of wb.sheets) {
    const cells = readCells(wb, sheet);
    const header = Object.entries(cells).find(([, v]) => /^test step description$/i.test(v.trim()));
    if (!header) continue;
    const headerRow = Number(header[0].replace(/[A-Z]+/, ''));
    const colOf = (re) => { const hit = Object.entries(cells).find(([ref, v]) => Number(ref.replace(/[A-Z]+/, '')) === headerRow && re.test(v.trim())); return hit ? hit[0].replace(/\d+/, '') : null; };
    const cols = { id: colOf(/^test case id$/i), title: colOf(/^test case$/i), desc: header[0].replace(/\d+/, ''), expected: colOf(/^expected result/i), actual: colOf(/^actual result/i), status: colOf(/^status|similar to the expected/i), comment: colOf(/^comment/i) };
    if (!cols.actual) continue;
    const statusHeader = cols.status ? cells[`${cols.status}${headerRow}`] : '';
    const rowsWithDesc = Object.keys(cells).filter((r) => r.replace(/\d+/, '') === cols.desc).map((r) => Number(r.replace(/[A-Z]+/, ''))).filter((n) => n > headerRow).sort((a, b) => a - b);
    const steps = [];
    for (const row of rowsWithDesc) {
      const desc = cells[`${cols.desc}${row}`];
      const expected = cols.expected ? cells[`${cols.expected}${row}`] || '' : '';
      const parsed = parseStep(desc, expected);
      const last = steps[steps.length - 1];
      if (!parsed.url) {
        // A row with no URL: either a note, or the payload for the step above ("Sample payload is in next row").
        const extra = PAYLOAD_LABEL.test(desc) ? payloadOf(desc) : '';
        if (extra && last && !last.body) { last.body = extra; if (last.method === 'GET' && !/Request(?:\s*type)?\s*:\s*GET/i.test(last.description)) last.method = 'POST'; last.description += `\n\n${desc}`; }
        continue;
      }
      steps.push({ row, id: (cols.id && cells[`${cols.id}${row}`]) || `Row ${row}`, title: (cols.title && cells[`${cols.title}${row}`]) || '', description: desc, expected, ...parsed, existing: cells[`${cols.actual}${row}`] || '' });
    }
    if (!steps.length) continue;
    for (const st of steps) {
      st.todo = placeholders(st.url, st.body);
      // SSG encrypts the TPG (enrolment, assessment, grant) payloads, and says so on others.
      st.encrypt = st.method !== 'GET' && (/\/tpg\//.test(st.url) || /encrypt/i.test(st.description));
    }
    // "Executed by:" and "Execution Date:" labels: the answer goes two columns to the right, as on SSG's sample.
    const label = (re) => { const hit = Object.entries(cells).find(([, v]) => re.test(v.trim())); if (!hit) return null; const col = hit[0].replace(/\d+/, ''); const n = colNum(col) + 2; return `${String.fromCharCode(64 + n)}${hit[0].replace(/[A-Z]+/, '')}`; };
    out.push({
      name: sheet.name, scenario: Object.entries(cells).find(([ref]) => /^C5$/.test(ref))?.[1] || '', environment: cells.C4 || '',
      cols, yesNo: /yes\s*\/\s*no/i.test(statusHeader), executedByCell: label(/^executed by:?$/i), executionDateCell: label(/^execution date:?$/i), steps,
    });
  }
  return out;
}

const fileBytes = (req) => {
  const b64 = req.body && req.body.file;
  if (typeof b64 !== 'string' || !b64) throw new Error('No workbook was sent');
  return Buffer.from(b64, 'base64');
};

router.get('/status', (_req, res) => {
  const u = uat();
  res.json({ ready: u.ready, hasEncryptionKey: !!u.encKey, certificateExpires: u.validTo, base: UAT_BASE });
});

router.post('/parse', (req, res) => {
  try {
    const wb = openWorkbook(fileBytes(req));
    const sheets = parseWorkbook(wb);
    if (!sheets.length) return res.status(422).json({ error: 'No test sheet was found. A test sheet has the columns “Test Step Description” and “Actual Result”.' });
    res.json({ sheets, allSheets: wb.sheets.map((s) => s.name) });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/run', async (req, res) => {
  const { method = 'GET', url, headers = {}, body = '', encrypt = false } = req.body || {};
  let target;
  try { target = new URL(String(url)); } catch { return res.status(400).json({ error: 'The URL is not valid' }); }
  if (target.protocol !== 'https:' || target.hostname !== UAT_HOST) return res.status(400).json({ error: `Conformance tests run on UAT only. The URL must start with ${UAT_BASE}` });
  if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) return res.status(400).json({ error: 'Unknown method' });
  const u = uat();
  if (!u.ready) return res.status(503).json({ error: 'The UAT certificate is not configured on the server (UAT_CERT and UAT_KEY).' });
  const send = { Accept: 'application/json' };
  for (const [k, v] of Object.entries(headers || {})) if (/^[\w-]{1,60}$/.test(k) && typeof v === 'string' && v.length < 500 && !/[\r\n]/.test(v)) send[k] = v;
  let payload = null;
  if (method !== 'GET' && String(body).trim()) {
    if (encrypt) {
      if (!u.encKey) return res.status(503).json({ error: 'The UAT encryption key is not configured on the server (UAT_ENCRYPTION_KEY).' });
      payload = aes('enc', u.encKey, String(body));
    } else payload = String(body);
    send['Content-Type'] = 'application/json';
    send['Content-Length'] = Buffer.byteLength(payload);
  }
  const started = Date.now();
  try {
    const result = await new Promise((resolve, reject) => {
      const r = https.request({ hostname: target.hostname, port: 443, path: target.pathname + target.search, method, cert: u.cert, key: u.key, headers: send, timeout: 45000 }, (resp) => {
        let data = ''; resp.on('data', (c) => { data += c; }); resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
      });
      r.on('timeout', () => r.destroy(new Error('SSG UAT did not answer within 45 seconds')));
      r.on('error', reject);
      if (payload !== null) r.write(payload);
      r.end();
    });
    let text = result.body; let decrypted = false;
    if (u.encKey && text.trim() && !/^[\[{<]/.test(text.trim())) { try { text = aes('dec', u.encKey, text.trim()); decrypted = true; } catch { /* plain */ } }
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    res.json({ status: result.status, ms: Date.now() - started, at: new Date().toISOString(), decrypted, encryptedRequest: !!(encrypt && payload), body: json ?? text });
  } catch (err) {
    res.json({ status: 0, ms: Date.now() - started, at: new Date().toISOString(), error: err.message, body: null });
  }
});

router.post('/export', (req, res) => {
  try {
    const wb = openWorkbook(fileBytes(req));
    const fills = Array.isArray(req.body.fills) ? req.body.fills : [];
    const touched = {};
    for (const f of fills) {
      const sheet = wb.sheets.find((s) => s.name === f.sheet);
      if (!sheet || !/^[A-Z]{1,3}\d{1,5}$/.test(String(f.cell)) || typeof f.value !== 'string') continue;
      touched[sheet.path] = writeCell(touched[sheet.path] ?? strFromU8(wb.files[sheet.path]), f.cell, f.value);
    }
    for (const [p, xml] of Object.entries(touched)) wb.files[p] = strToU8(xml);
    const out = Buffer.from(zipSync(wb.files, { level: 6 }));
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control': 'no-store' }).send(out);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
module.exports.openWorkbook = openWorkbook;
module.exports.parseWorkbook = parseWorkbook;
module.exports.writeCell = writeCell;
