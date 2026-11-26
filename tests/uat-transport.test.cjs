const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const selfsigned = require('selfsigned');
const uat = require('../server/uat');
const names = ['UAT_CERT', 'UAT_KEY', 'UAT_ENCRYPTION_KEY', 'UAT_CERT_FILE', 'UAT_KEY_FILE', 'UAT_ENCRYPTION_KEY_FILE', 'UAT_EXPECTED_CERT_SHA256', 'UAT_API_BASE', 'UAT_ENCRYPTION_KEY_SOURCE'];
async function config(t) {
  const old = Object.fromEntries(names.map(n => [n, process.env[n]]));
  for (const name of names) delete process.env[name];
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'synthetic-test.invalid' }], { keySize: 2048, days: 2 });
  const key = Buffer.alloc(32, 7);
  Object.assign(process.env, { UAT_CERT: pems.cert, UAT_KEY: pems.private, UAT_ENCRYPTION_KEY: key.toString('base64'), UAT_EXPECTED_CERT_SHA256: new crypto.X509Certificate(pems.cert).fingerprint256, UAT_ENCRYPTION_KEY_SOURCE: 'swda-2026-11-24' });
  t.after(() => { for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; } });
  return { pems, key };
}
test('readiness validates certificate, matching key, AES encoding, fingerprint and UAT host without exposing secrets', async t => {
  const { pems } = await config(t); let result = uat.credentials().status;
  assert.equal(result.ready, true); assert.equal(result.hasEncryptionKey, true); assert.equal(result.encryptionSourceConfirmed, true);
  assert.equal(JSON.stringify(result).includes(pems.private), false);
  process.env.UAT_ENCRYPTION_KEY = 'not a canonical 32-byte key'; assert.equal(uat.credentials().status.hasEncryptionKey, false);
  process.env.UAT_EXPECTED_CERT_SHA256 = 'wrong'; assert.equal(uat.credentials().status.ready, false);
  process.env.UAT_API_BASE = 'https://api.ssg-wsg.sg'; assert.equal(uat.credentials().status.hostAllowed, false);
});
test('transport encrypts the exact payload and decrypts the response, with no network call', async t => {
  const { key } = await config(t); const original = https.request; let captured;
  https.request = (options, callback) => {
    const request = new EventEmitter(); request.write = body => { captured = { options, body }; };
    request.end = () => { const response = new EventEmitter(); response.statusCode = 200; callback(response); queueMicrotask(() => { response.emit('data', uat.aes('enc', key, '{"status":200,"data":{"trainer":{"id":"synthetic-created"}}}')); response.emit('end'); }); };
    return request;
  };
  t.after(() => { https.request = original; });
  const payload = JSON.stringify({ trainer: { idNumber: 'SYNTHETIC-TEST' } });
  const result = await uat.send({ method: 'POST', url: uat.BASE + '/trainingProviders/SYNTHETICUEN/trainers', headers: { 'x-api-version': 'v2.0' }, body: payload, encrypt: true });
  assert.equal(uat.aes('dec', key, captured.body), payload); assert.equal(captured.options.hostname, 'uat-api.ssg-wsg.sg');
  assert.equal(captured.options.headers['Content-Type'], 'application/json'); assert.equal(result.decrypted, true); assert.equal(result.body.data.trainer.id, 'synthetic-created');
});
test('transport rejects production, alternate ports and URL credentials before any outbound request', async t => {
  await config(t); const original = https.request; https.request = () => { throw new Error('No network expected'); }; t.after(() => { https.request = original; });
  for (const url of ['https://api.ssg-wsg.sg/trainers', 'https://uat-api.ssg-wsg.sg:444/trainers', 'https://user:secret@uat-api.ssg-wsg.sg/trainers']) await assert.rejects(uat.send({ method: 'POST', url }), /Only the SWDA UAT host/);
});
