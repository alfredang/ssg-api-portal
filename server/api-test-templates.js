const crypto = require('node:crypto');
const builtins = require('./api-test-templates.json');
const store = require('./api-test-store');
const uat = require('./uat');
const { checkSecrets } = require('./conformance-records');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const at = (object, key) => key.split('.').reduce((value, part) => value == null ? undefined : Object.hasOwn(Object(value), part) ? value[part] : undefined, object);
function validate(raw) {
  checkSecrets(raw);
  const t = structuredClone(raw);
  if (!store.valid(t.id) || !t.name || t.name.length > 160 || !Number.isInteger(t.revision) || t.revision < 1) throw new Error('Templates need an ID, name and positive revision.');
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(t.method) || !['read', 'create', 'update', 'delete', 'write'].includes(t.operation)) throw new Error('Select a supported method and operation.');
  if (!['uat-mtls', 'uat-oauth'].includes(t.auth) || !['none', 'json', 'text', 'form', 'multipart'].includes(t.encoding)) throw new Error('Select a supported UAT credential profile and payload format.');
  if (typeof t.path !== 'string' || !t.path.startsWith('/') || t.path.startsWith('//') || /[?#\\\r\n]/.test(t.path) || t.path.length > 1000) throw new Error('Use an endpoint path on the configured UAT host. Put query parameters in query fields.');
  if (typeof t.version !== 'string' || /[\r\n]/.test(t.version)) throw new Error('The API version must be plain text.');
  if (t.method === 'GET' && (t.encoding !== 'none' || t.encrypt || t.operation !== 'read')) throw new Error('GET templates have no body or request encryption.');
  if (t.method !== 'GET' && t.operation === 'read') throw new Error('Declare this non-GET operation as a write.');
  if (!['functional', 'diagnostic', 'conformance'].includes(t.classification)) throw new Error('Choose functional, diagnostic or conformance.');
  if (!Array.isArray(t.fields) || t.fields.length > 40 || t.fields.some(f => !/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(f.name) || !f.label || !['string', 'number', undefined].includes(f.type))) throw new Error('Template fields need unique plain names and labels.');
  if (new Set(t.fields.map(f => f.name)).size !== t.fields.length) throw new Error('Template field names must be unique.');
  const placeholders = [...t.path.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  if (placeholders.some(name => !t.fields.some(f => f.name === name && f.required))) throw new Error('Every path parameter needs a required input field.');
  if (t.query && (!Array.isArray(t.query) || t.query.some(name => !t.fields.some(f => f.name === name)))) throw new Error('Query parameters must reference defined input fields.');
  if (!t.expected || !Number.isInteger(t.expected.httpStatus) || t.expected.httpStatus < 100 || t.expected.httpStatus > 599) throw new Error('Define the expected HTTP status.');
  if (t.expected.apiStatus != null && !Number.isInteger(t.expected.apiStatus)) throw new Error('Expected API status must be a number.');
  for (const check of t.expected.checks || []) if (!/^[A-Za-z0-9_.]+$/.test(check.path) || !['equals', 'nonempty', 'array', 'exists'].includes(check.operator)) throw new Error('Use supported declarative response checks.');
  if (t.encrypt && ['form', 'multipart', 'none'].includes(t.encoding)) throw new Error('AES request encryption supports JSON or text payloads.');
  if (t.verification && !['created', 'updated', 'absent'].includes(t.verification)) throw new Error('Unknown trainer verification rule.');
  if (t.dependsOn && !store.valid(t.dependsOn)) throw new Error('Invalid dependency template ID.');
  if (t.headers && Object.entries(t.headers).some(([k, v]) => !/^[\w-]+$/.test(k) || typeof v !== 'string' || /[\r\n]/.test(v) || /^(authorization|cookie|host|content-length|content-type|connection|proxy-authorization)$/i.test(k))) throw new Error('Request headers must not contain credentials or transport overrides.');
  t.reviewed = t.reviewed !== false;
  return t;
}
async function all() {
  const saved = await store.list('templates'); const map = new Map(builtins.map(t => [t.id, validate(t)]));
  for (const t of saved) map.set(t.id, validate(t));
  return [...map.values()];
}
async function get(id) { const t = (await all()).find(t => t.id === id); if (!t) throw new Error('Test template not found.'); return t; }
async function save(raw, user) {
  const t = validate(raw); const prior = (await all()).find(x => x.id === t.id);
  if (prior && t.revision <= prior.revision) throw new Error(`Use a revision greater than ${prior.revision}.`);
  await store.save('templates', t.id, { ...t, reviewedBy: user, reviewedAt: new Date().toISOString() });
  return t;
}
function urlFor(t, inputs) {
  const endpoint = t.path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = inputs[key];
    if (value == null || value === '' || String(value) === '.' || String(value) === '..') throw new Error(`Supply ${key}.`);
    return encodeURIComponent(String(value));
  });
  if (/[{}]/.test(endpoint)) throw new Error('Complete all endpoint parameters.');
  const target = new URL(endpoint, uat.BASE);
  if (target.origin !== uat.BASE || target.username || target.password) throw new Error('Only the configured SWDA UAT host is allowed.');
  for (const name of t.query || []) if (inputs[name] != null && inputs[name] !== '') target.searchParams.set(name, String(inputs[name]));
  return target.href;
}
function evaluate(t, response, context = {}) {
  const checks = [];
  const add = (name, pass) => checks.push({ name, pass: !!pass });
  add(`HTTP ${t.expected.httpStatus}`, response.status === t.expected.httpStatus);
  if (t.expected.httpStatus >= 200 && t.expected.httpStatus < 300 && response.body?.error) add('No business error', typeof response.body.error === 'object' ? Object.keys(response.body.error).length === 0 : !response.body.error);
  if (t.expected.apiStatus != null) add(`API ${t.expected.apiStatus}`, Number(response.body?.status) === t.expected.apiStatus);
  for (const check of t.expected.checks || []) {
    const actual = at(response.body, check.path);
    const pass = check.operator === 'equals' ? JSON.stringify(actual) === JSON.stringify(check.value) : check.operator === 'nonempty' ? (typeof actual === 'string' && !!actual.trim()) || typeof actual === 'number' : check.operator === 'array' ? Array.isArray(actual) : actual !== undefined && actual !== null;
    add(`${check.path}: ${check.operator}`, pass);
  }
  const body = response.body; const list = body?.data?.trainers;
  if (t.verification === 'absent') {
    const structuredNotFound = [200, 404].includes(response.status) && Number(body?.status) === 404 && Number(body?.error?.code) === 404 && body?.error?.message === 'Not Found';
    if (structuredNotFound) return { pass: true, checks: [{ name: 'Structured trainer Not Found response', pass: true }] };
    add('Workflow trainer is absent', !!context.trainerId && Array.isArray(list) && !list.some(x => String(x.id) === String(context.trainerId)));
    add('Search covers the workflow trainer', Array.isArray(list) && (response.body?.meta?.total != null ? Number(response.body.meta.total) <= list.length : list.length < context.pageSize));
  } else if (t.verification) {
    const found = Array.isArray(list) && list.find(x => String(x.id) === String(context.trainerId));
    add('Workflow trainer is present', !!found);
    if (context.expectedTrainer?.name) add('Trainer name matches', found?.name === context.expectedTrainer.name);
    if (t.verification === 'updated' && context.expectedTrainer?.domainAreaOfPractice) add('Updated practice area matches', found?.domainAreaOfPractice === context.expectedTrainer.domainAreaOfPractice);
  }
  return { pass: checks.every(c => c.pass), checks };
}
module.exports = { all, get, save, validate, digest, at, urlFor, evaluate };
