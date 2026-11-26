const crypto = require('node:crypto');
const store = require('./api-test-store');
const templates = require('./api-test-templates');
const uat = require('./uat');
const legacy = require('./conformance-records');
const clone = value => structuredClone(value);
const pending = r => ['running', 'uncertain'].includes(r.state) && !r.review;
const isWrite = request => request.method !== 'GET';
let queue = Promise.resolve();
function serial(work) { const result = queue.then(work, work); queue = result.catch(() => {}); return result; }
function trainerIdOf(run) { return run.trainerId || run.response?.body?.data?.trainer?.id; }
function workflowCreate(history, id) { return history.find(r => r.id === id && r.templateId === 'trainer-add' && r.outcome === 'pass' && r.response?.status === 200 && Number(r.response?.body?.status) === 200 && trainerIdOf(r) && r.origin === 'Portal UAT run'); }
function resourceOf(request) {
  const url = new URL(request.url);
  return `${url.origin}${url.pathname}`;
}
function trainerOperation(request) {
  const path = new URL(request.url).pathname;
  if (request.method === 'GET') return 'read';
  if (/^\/trainingProviders\/[^/]+\/trainers$/.test(path)) return 'create';
  if (/^\/trainingProviders\/[^/]+\/trainers\/[^/]+$/.test(path)) return request.body?.trainer?.action === 'delete' ? 'delete' : 'update';
  return null;
}
function encode(t, body, attachments) {
  if (t.method === 'GET' || t.encoding === 'none') return { body: '', contentType: 'application/json' };
  if (t.encoding === 'json') return { body: JSON.stringify(body), contentType: 'application/json' };
  if (t.encoding === 'text') return { body: String(body), contentType: 'text/plain' };
  if (t.encoding === 'form') return { body: new URLSearchParams(body).toString(), contentType: 'application/x-www-form-urlencoded' };
  const boundary = 'api-uat-' + templates.digest({ body, attachments }).slice(0, 24); const chunks = [];
  const add = text => chunks.push(Buffer.from(text));
  for (const [name, value] of Object.entries(body || {})) { if (!/^[\w-]+$/.test(name)) throw new Error('Multipart field names must be plain text.'); add(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${String(value)}\r\n`); }
  for (const a of attachments) { add(`--${boundary}\r\nContent-Disposition: form-data; name="${a.field}"; filename="${a.name}"\r\nContent-Type: ${a.type}\r\n\r\n`); chunks.push(Buffer.from(a.base64, 'base64')); add('\r\n'); }
  add(`--${boundary}--\r\n`);
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}
function validateAttachments(t, attachments) {
  if (!Array.isArray(attachments) || attachments.length > 4 || (attachments.length && t.encoding !== 'multipart')) throw new Error('Attachments require a multipart template, with at most four files.');
  let size = 0;
  for (const a of attachments) {
    if (!/^[\w.-]{1,160}$/.test(a.name) || !/^[\w-]{1,50}$/.test(a.field) || !/^[\w.+-]+\/[\w.+-]+$/.test(a.type) || typeof a.base64 !== 'string' || Buffer.from(a.base64, 'base64').toString('base64') !== a.base64) throw new Error('Invalid attachment name, field, content type or base64 data.');
    size += Buffer.byteLength(a.base64, 'base64');
    if (/\.(pem|key|pfx|p12)$/i.test(a.name) || /-----BEGIN (?:RSA |EC |ENCRYPTED )?(?:PRIVATE KEY|CERTIFICATE)-----/.test(Buffer.from(a.base64, 'base64').toString('utf8'))) throw new Error('Credential files belong in secure server configuration, not test attachments.');
  }
  if (size > 5 * 1024 * 1024) throw new Error('Attachments exceed the 5 MB limit.');
}
async function initial(templateId, sourceRunId, dependencyRunId) {
  const t = await templates.get(templateId); const history = await store.history();
  const source = sourceRunId ? history.find(r => r.id === sourceRunId) : null;
  if (sourceRunId && !source) throw new Error('Source attempt not found.');
  if (source && source.templateId !== templateId) throw new Error('Choose the same template as the historical request.');
  const context = history.find(r => r.testUen && r.application);
  const inputs = Object.fromEntries(t.fields.map(f => [f.name, f.name === 'uen' ? context?.testUen || '' : f.default ?? '']));
  let body = clone(t.body ?? (t.encoding === 'text' ? '' : {})); let dependency; let fixtureSource;
  if (t.dependsOn) {
    dependency = history.find(r => r.id === dependencyRunId && r.templateId === t.dependsOn && r.outcome === 'pass') || (!dependencyRunId && history.find(r => r.templateId === t.dependsOn && r.outcome === 'pass'));
    if (dependency) {
      const create = workflowCreate(history, dependency.workflowId || dependency.id);
      if (create) {
        inputs.uen = create.testUen; inputs.trainerId = String(trainerIdOf(create));
        inputs.keyword = (dependency.request?.body?.trainer || create.request?.body?.trainer)?.name || '';
        if (t.id === 'trainer-update') body = { trainer: { ...clone(create.request.body.trainer), action: 'update' } };
      }
    }
  } else if (t.id === 'trainer-add' && !source) {
    const fixture = history.find(r => r.templateId === 'trainer-add' && r.request.body?.trainer && r.source?.original);
    if (fixture) { body = clone(fixture.request.body); fixtureSource = fixture; }
  }
  if (source) {
    body = clone(source.request.body ?? body);
    Object.assign(inputs, source.inputs || {});
    const url = new URL(source.request.url); const path = url.pathname.split('/');
    if (path[1] === 'trainingProviders') { inputs.uen = decodeURIComponent(path[2]); if (path[4]) inputs.trainerId = decodeURIComponent(path[4]); }
    for (const name of t.query || []) inputs[name] = url.searchParams.get(name) ?? inputs[name];
    dependency = history.find(r => r.id === source.dependencyRunId) || dependency;
  }
  return { template: t, inputs, body, attachments: source?.request.attachments || [], sourceRunId: source?.id || fixtureSource?.id || null, dependencyRunId: dependency?.id || dependencyRunId || '', application: source?.application || context?.application || '', applicationId: source?.applicationId || context?.applicationId || '' };
}
async function load(data, user, persist = true) {
  const initialState = await initial(data.templateId, data.sourceRunId, data.dependencyRunId); const t = initialState.template;
  const inputs = { ...initialState.inputs, ...(data.inputs || {}) };
  const body = data.body === undefined ? initialState.body : data.body;
  const attachments = data.attachments || initialState.attachments;
  legacy.checkSecrets({ body, inputs }); validateAttachments(t, attachments);
  for (const f of t.fields) {
    const value = inputs[f.name];
    if (f.required && (value == null || String(value).trim() === '')) throw new Error(`Supply ${f.label}.`);
    if (value != null && (typeof value !== 'string' && typeof value !== 'number' || String(value).length > 1000)) throw new Error(`Invalid ${f.label}.`);
    if (f.type === 'number' && value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0)) throw new Error(`${f.label} must be a non-negative integer.`);
  }
  if (t.encoding === 'json' && (!body || typeof body !== 'object' || Array.isArray(body))) throw new Error('Supply a JSON object payload.');
  if ((t.method === 'GET' || t.encoding === 'none') && data.body != null && (typeof data.body === 'string' ? data.body.trim() : Object.keys(data.body).length)) throw new Error('This template sends no request body.');
  const request = { method: t.method, url: templates.urlFor(t, inputs), version: t.version, headers: { ...t.headers, ...(t.version ? { 'x-api-version': t.version } : {}) }, encoding: t.encoding, auth: t.auth, encrypted: !!t.encrypt, body: t.method === 'GET' || t.encoding === 'none' ? null : body, attachments };
  const operation = trainerOperation(request);
  if (operation && operation !== t.operation) throw new Error('The declared operation does not match the trainer request.');
  if (operation === 'create' && !body?.trainer?.idNumber) throw new Error('Complete the trainer details, including its test identity.');
  if (operation === 'create' && ['update', 'delete'].includes(body?.trainer?.action)) throw new Error('An Add request cannot contain an Update/Delete action.');
  if (operation && operation !== 'read' && !request.encrypted) throw new Error('Trainer mutations require an encrypted request.');
  if (['update', 'delete'].includes(operation)) {
    if (body?.trainer?.action !== operation) throw new Error(`Use trainer.action = "${operation}".`);
    if (!request.encrypted) throw new Error('Trainer mutations require an encrypted request.');
  }
  const history = await store.history(); const warnings = []; const blockers = [];
  if (!t.reviewed) blockers.push('An admin must review and save this template before execution.');
  const dependency = history.find(r => r.id === initialState.dependencyRunId && r.outcome === 'pass');
  const create = dependency && workflowCreate(history, dependency.workflowId || dependency.id);
  const actualPath = new URL(request.url).pathname.split('/').map(decodeURIComponent);
  const context = { trainerId: create ? String(trainerIdOf(create)) : null, expectedTrainer: dependency?.request?.body?.trainer || create?.request?.body?.trainer, pageSize: Number(inputs.pageSize) || 100 };
  if (t.dependsOn && (!dependency || dependency.templateId !== t.dependsOn || !create)) blockers.push(`Requires a successful ${t.dependsOn} attempt and its workflow-created trainer ID.`);
  if (['update', 'delete'].includes(operation) && (!create || actualPath[2] !== create.testUen || actualPath[4] !== String(trainerIdOf(create)))) blockers.push('This trainer ID and UEN must come from the selected successful Add in this workflow.');
  if (t.verification && create && actualPath[2] !== create.testUen) blockers.push('Verification must use the workflow’s assigned UEN.');
  if (t.verification && context.expectedTrainer?.name && inputs.keyword !== context.expectedTrainer.name) blockers.push('Verification search must use the workflow trainer’s exact name.');
  if (t.verification && Number(inputs.page || 0) !== 0) blockers.push('Start workflow verification at page zero.');
  const resource = resourceOf(request);
  if (isWrite(request) && history.some(r => pending(r) && (r.resource === resource || (!r.resource && r.request?.url && resourceOf(r.request) === resource)))) blockers.push('A previous write to this resource needs reconciliation before another write.');
  if (operation === 'create' && history.some(r => r.request?.body?.trainer?.idNumber === body.trainer.idNumber)) warnings.push('This identity appears in earlier attempts. A repeat may return a duplicate-identity error; you may confirm the repeat.');
  if (initialState.sourceRunId) warnings.push('Loaded from a historical attempt. The original record will remain unchanged.');
  if (isWrite(request)) warnings.push(operation === 'delete' ? 'This request deletes the selected synthetic trainer on UAT.' : 'This request can change UAT data. Returned trainer IDs are retained; no automatic cleanup runs.');
  if (t.classification === 'conformance' && !t.source?.reference) blockers.push('Conformance tests need their official test requirement reference.');
  const credential = uat.readiness({ auth: t.auth, encrypt: t.encrypt });
  const sourceAttempt = history.find(r => r.id === initialState.sourceRunId);
  const modified = !!sourceAttempt && templates.digest({ method: request.method, url: request.url, version: request.version, body: request.body, attachments: attachments || [] }) !== templates.digest({ method: sourceAttempt.request.method, url: sourceAttempt.request.url, version: sourceAttempt.request.version, body: sourceAttempt.request.body, attachments: sourceAttempt.request.attachments || [] });
  if (modified) warnings.push('Modified request: the data or API version differs from the saved source attempt.');
  const wire = encode(t, request.body, attachments);
  request.headers = { Accept: 'application/json', ...request.headers, ...(t.method !== 'GET' && t.encoding !== 'none' ? { 'Content-Type': t.encrypt ? 'application/json' : wire.contentType } : {}) };
  const draft = { id: 'draft-' + crypto.randomUUID(), template: t, templateDigest: templates.digest(t), request, inputs, context, resource, modified, credentialVersion: uat.version(), credential, warnings, blockers,
    application: data.application || initialState.application, applicationId: initialState.applicationId, testUen: inputs.uen || '', sourceRunId: initialState.sourceRunId,
    dependencyRunId: dependency?.id || initialState.dependencyRunId || null, workflowId: create?.id || null, createdAt: new Date().toISOString(), createdBy: user };
  draft.digest = templates.digest({ templateDigest: draft.templateDigest, request, inputs, dependencyRunId: draft.dependencyRunId, sourceRunId: draft.sourceRunId });
  if (persist) await store.save('drafts', draft.id, draft, true);
  return draft;
}
async function run(data, user) {
  return serial(async () => {
    const draft = await store.get('drafts', data.draftId);
    if (!draft || draft.createdBy !== user || draft.digest !== data.digest || data.confirmation !== 'CONFIRM AND RUN ONCE') throw new Error('Load and review the current request before confirming.');
    const history = await store.history(); const previous = history.find(r => r.draftId === draft.id);
    if (previous) return previous;
    const recoveredAt = await require('./portal-storage').recoveryTime();
    if (recoveredAt && Date.parse(draft.createdAt) <= Date.parse(recoveredAt)) throw new Error('This preview predates server data recovery. Load and review the request again.');
    if (Date.now() - Date.parse(draft.createdAt) > 30 * 60 * 1000) throw new Error('This preview expired. Load and review it again.');
    const template = await templates.get(draft.template.id);
    if (templates.digest(template) !== draft.templateDigest) throw new Error('The template changed. Load and review the request again.');
    if (uat.version() !== draft.credentialVersion) throw new Error('UAT credentials changed. Load and review the request again.');
    const ready = uat.readiness({ auth: template.auth, encrypt: template.encrypt });
    if (!ready.ready) throw new Error('Configure the selected UAT credentials first: ' + ready.missing.join(', '));
    // Rebuild and revalidate scope/dependencies, without sending a request.
    const rechecked = await load({ templateId: template.id, sourceRunId: draft.sourceRunId, dependencyRunId: draft.dependencyRunId, inputs: draft.inputs, body: draft.request.body, attachments: draft.request.attachments, application: draft.application }, user, false);
    if (rechecked.digest !== draft.digest || rechecked.blockers.length) throw new Error(rechecked.blockers.join(' ') || 'The prepared request changed. Reload it before running.');
    const id = draft.id.replace(/^draft-/, 'run-'); const write = isWrite(draft.request);
    const record = { id, templateId: template.id, templateRevision: template.revision, templateSnapshot: template, draftId: draft.id, ticket: template.ticket || '', caseId: template.caseId || template.id, title: template.name,
      classification: template.classification, kind: template.classification === 'diagnostic' ? 'Diagnostic' : 'Functional test', origin: 'Portal UAT run', state: 'running', outcome: 'pending', at: new Date().toISOString(), executedBy: user,
      request: draft.request, inputs: draft.inputs, credentialProfile: template.auth, credentialFingerprint: ready.fingerprint || null, application: draft.application, applicationId: draft.applicationId, testUen: draft.testUen,
      resource: draft.resource, modified: draft.modified, sourceRunId: draft.sourceRunId, dependencyRunId: draft.dependencyRunId, workflowId: draft.workflowId, interpretation: 'Request started. Waiting for its response.', response: null };
    let lockId;
    if (write) lockId = await store.lock(draft.resource, id);
    record.lockId = lockId;
    try { await store.save('runs', id, record, true); } catch (e) { if (lockId) await store.release(lockId); if (e.code === 'EEXIST') return await store.get('runs', id); throw e; }
    try {
      const wire = encode(template, draft.request.body, draft.request.attachments);
      const response = await uat.send({ method: draft.request.method, url: draft.request.url, headers: draft.request.headers, body: wire.body, contentType: wire.contentType, encrypt: template.encrypt, auth: template.auth });
      const safeBody = store.redact(response.body);
      record.response = { status: response.status, apiStatus: response.body?.status ?? null, body: safeBody, rawBody: typeof safeBody === 'object' ? JSON.stringify(safeBody) : store.redact(response.rawBody), ms: response.ms, decrypted: response.decrypted };
      record.request.encryptedBody = response.encryptedRequest;
      const evaluation = templates.evaluate(template, response, draft.context);
      record.checks = evaluation.checks; record.outcome = evaluation.pass ? 'pass' : 'fail';
      const returned = response.body?.data?.trainer?.id;
      record.trainerId = returned == null ? draft.context.trainerId : String(returned);
      if (template.id === 'trainer-add' && evaluation.pass) record.workflowId = id;
      const certainRejection = response.status >= 400 && response.status < 500 && response.body && typeof response.body === 'object' && !returned;
      const confirmedCreate = trainerOperation(draft.request) !== 'create' || response.status === 200 && Number(response.body?.status) === 200 && !!returned;
      const certainSuccess = response.status >= 200 && response.status < 300 && evaluation.pass && confirmedCreate;
      record.state = !write || certainSuccess || certainRejection ? 'completed' : 'uncertain';
      if (record.state === 'uncertain') { record.outcome = 'unknown'; record.interpretation = 'The write outcome needs reconciliation before another write to this resource.'; }
      else record.interpretation = evaluation.pass ? 'The response met this template’s checks.' : 'The response did not meet this template’s expected result. Review the recorded checks.';
    } catch {
      record.state = write ? 'uncertain' : 'completed'; record.outcome = write ? 'unknown' : 'fail'; record.interpretation = write ? 'No confirmed response. Reconcile with the API provider before repeating this write.' : 'No confirmed response. This read-only attempt may be repeated.';
    }
    record.finishedAt = new Date().toISOString();
    await store.save('runs', id, record);
    if (lockId && record.state === 'completed') await store.release(lockId);
    return record;
  });
}
async function reconcile(id, note, user) {
  return serial(async () => {
    const record = await store.findRun(id);
    if (!record || !pending(record) || typeof note !== 'string' || note.trim().length < 20) throw new Error('Record the provider-confirmed outcome and its reference.');
    if (record.state === 'running' && Date.now() - Date.parse(record.at) < 120000) throw new Error('The request may still be in flight. Wait for its response.');
    record.review = { at: new Date().toISOString(), by: user, note: note.trim() };
    if (record.legacy) { const { legacy: ignored, ...old } = record; await legacy.save(old); }
    else await store.save('runs', record.id, record);
    if (record.lockId) await store.release(record.lockId);
    return record;
  });
}
module.exports = { initial, load, run, reconcile, serial, encode };
