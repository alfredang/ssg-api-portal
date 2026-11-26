const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const crypto = require('node:crypto');
const https = require('node:https');
const express = require('express');
const { zipSync, strToU8 } = require('fflate');
const conformance = require('../server/conformance');

function workbook(rows) {
  const esc = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const table = [
    { A1: 'Test case ID', B1: 'Test case', E1: 'Test Step Description', F1: 'Expected Result', G1: 'Actual Result', H1: 'Status (Pass/Fail)' },
    ...rows,
  ];
  return Buffer.from(zipSync({
    'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="Test" r:id="r1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData>${table.map((row, i) => `<row r="${i + 1}">${Object.entries(row).map(([cell, text]) => `<c r="${cell}" t="inlineStr"><is><t>${esc(text)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`),
  }));
}

test('trainer payload rows before URLs retain body, encryption and case identity', () => {
  const bytes = workbook([
    { A2: 'TS01', B2: 'Insert', E2: 'Encrypt the request. Sample Payload: {"trainer":{"name":"synthetic"}}' },
    { E3: 'Request type: POST\nx-api-version: v2.0\nhttps://uat-api.ssg-wsg.sg/trainingProviders/{uen}/trainers', F3: '{"status":200}' },
    { A4: 'TS03', B4: 'Update', E4: 'The request must be encrypted. Sample Payload: {"trainer":{"action":"update","name":"synthetic update"}}' },
    { E5: 'Request type: POST\nx-api-version: v2.0\nhttps://uat-api.ssg-wsg.sg/trainingProviders/{uen}/trainers/{trainerId}' },
    { A6: 'TS05', B6: 'Delete', E6: 'The request must be encrypted. Sample Payload: {"trainer":{"action":"delete"}}' },
    { E7: 'Request type: POST\nx-api-version: v2.0\nhttps://uat-api.ssg-wsg.sg/trainingProviders/{uen}/trainers/{trainerId}' },
  ]);
  const [sheet] = conformance.parseWorkbook(conformance.openWorkbook(bytes));
  assert.deepEqual(sheet.steps.map(s => [s.id, s.title, s.encrypt, JSON.parse(s.body).trainer.action || 'insert']), [
    ['TS01', 'Insert', true, 'insert'], ['TS03', 'Update', true, 'update'], ['TS05', 'Delete', true, 'delete'],
  ]);
});

test('payload rows after requests still attach to their request', () => {
  const [sheet] = conformance.parseWorkbook(conformance.openWorkbook(workbook([
    { A2: 'TS01', E2: 'Request type: POST\nhttps://uat-api.ssg-wsg.sg/tpg/example' },
    { E3: 'Sample Payload: {"test":"after"}' },
  ])));
  assert.deepEqual(JSON.parse(sheet.steps[0].body), { test: 'after' });
  assert.equal(sheet.steps[0].encrypt, true);
});

test('payload from an unfinished case is not reused for the next case', () => {
  const [sheet] = conformance.parseWorkbook(conformance.openWorkbook(workbook([
    { A2: 'TS01', E2: 'Sample Payload: {"trainer":{"action":"update"}}' },
    { A3: 'TS02', E3: 'Request type: POST\nhttps://uat-api.ssg-wsg.sg/example' },
  ])));
  assert.equal(sheet.steps[0].body, '');
  assert.equal(sheet.steps[0].id, 'TS02');
});

async function localApi(t) {
  const app = express();
  app.use(express.json());
  app.use('/api/conformance', conformance);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api/conformance/run`;
}

test('legacy direct execution requires the reviewed workbench and makes no request', async t => {
  const originalRequest = https.request;
  let calls = 0;
  https.request = () => { calls++; throw new Error('No request should be made'); };
  t.after(() => { https.request = originalRequest; });
  const url = await localApi(t);
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://uat-api.ssg-wsg.sg/trainingProviders/SYNTHETICUEN/trainers', method: 'POST', body: '{}' }) });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /workbench/);
  assert.equal(calls, 0);
});
