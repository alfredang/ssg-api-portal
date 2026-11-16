// Request specs and code samples (curl / Python / JavaScript) for every API in
// catalog.ts. Samples are generated from the catalogue entry + the request
// shape below, so the catalogue stays the single source for path / version / auth.
//
// Values are illustrative placeholders (S1234567A, TGS-2020001685, run 123456).
// The official schema of each API is on the SWDA Developer Portal ("Official docs").

import type { ApiEntry } from './catalog';
import { BASE_URLS } from './catalog';

export interface Field { name: string; required?: boolean; example: string; desc: string }
export interface Spec {
  /** Query-string parameters. */
  query?: Field[];
  /** Extra request headers besides x-api-version. */
  headers?: Field[];
  /** Example JSON body (plain, before AES encryption). */
  body?: unknown;
  /** The request body is sent plain, but SSG returns the response AES-encrypted. */
  encryptedResponse?: boolean;
  /** Extra note shown under the spec. */
  note?: string;
}

const UEN = '201200696W';
const REF = 'TGS-2020001685';
const paging: Field[] = [
  { name: 'pageSize', example: '20', desc: 'Records per page.' },
  { name: 'page', example: '0', desc: 'Zero-based page number.' },
];
const uenHeader: Field = { name: 'uen', required: true, example: UEN, desc: 'Training provider UEN the record belongs to.' };

export const PATH_PARAMS: Record<string, { example: string; desc: string }> = {
  refNo: { example: REF, desc: 'Reference number of the record (course: TGS-…, enrolment: ENR-…, assessment: ASM-…).' },
  runId: { example: '123456', desc: 'Course run ID.' },
  uen: { example: UEN, desc: 'Training provider UEN.' },
  trainerId: { example: 'TRNR-0001', desc: 'Trainer ID returned by Retrieve Trainer Details.' },
  grantRefNo: { example: 'GRN-2026-000001', desc: 'Grant reference number.' },
  claimId: { example: '2600012345', desc: 'SkillsFuture Credit claim ID.' },
  occupationId: { example: '1', desc: 'Occupation ID from List Occupations.' },
};

const trainee = { id: 'S1234567A', idType: { type: 'NRIC' }, fullName: 'Tan Ah Kow', dateOfBirth: '1990-01-31', emailAddress: 'trainee@example.com', contactNumber: { areaCode: '', countryCode: '65', phoneNumber: '91234567' } };

/** Request shape per console page id (ApiEntry.page). APIs with only path params need no entry. */
export const SPECS: Record<string, Spec> = {
  'course-lookup': { query: [{ name: 'includeExpired', example: 'true', desc: 'Also return expired courses.' }] },
  'course-search': {
    body: { uen: UEN, keyword: 'data analytics', page: 0, pageSize: 10, details: 'FULL', sortBy: { field: 'updatedDate', order: 'desc' }, course: { meta: { updatedDate: { from: '2019-01-01', to: '2026-12-31' } } } },
  },
  'popular-courses': { query: [...paging, { name: 'taggingCode', example: 'FULL', desc: 'Course tagging code filter.' }] },
  'tp-courses': {
    body: { uen: UEN, keyword: '', page: 0, pageSize: 20, details: 'FULL', sortBy: { field: 'updatedDate', order: 'desc' }, course: { meta: { updatedDate: { from: '2019-01-01', to: '2026-12-31' } } } },
    note: 'Same registry search, with an empty keyword so every course of the UEN is returned.',
  },
  'direct-applications': {
    encryptedResponse: true,
    body: { uen: UEN, tpCode: `${UEN}-01`, page: 0, pageSize: 20 },
    note: 'uen and tpCode are required. Optional filters: keyword, applicationId, applicationStatus, lastUpdateDate, runStartDate { from, to }, sortBy, sortOrder. The request body is plain JSON. A successful response is AES-encrypted text that decrypts to the usual envelope (data.courseApplications, meta.total). When nothing matches, SSG returns { "error": "<encrypted>" } instead, which decrypts to status 404 "No record found". Retrieval only: confirming or cancelling an application is still done on TPGateway.',
  },
  'course-sessions': {
    query: [
      { name: 'uen', required: true, example: UEN, desc: 'Training provider UEN.' },
      { name: 'courseReferenceNumber', required: true, example: REF, desc: 'Course reference number.' },
      { name: 'sessionMonth', example: '112026', desc: 'Month of the sessions (MMYYYY).' },
      { name: 'includeExpiredCourses', example: 'true', desc: 'Include expired courses.' },
    ],
  },
  'session-attendance': {
    query: [
      { name: 'uen', required: true, example: UEN, desc: 'Training provider UEN.' },
      { name: 'courseReferenceNumber', required: true, example: REF, desc: 'Course reference number.' },
      { name: 'sessionId', example: `${REF}-123456-S1`, desc: 'Session ID; omit for all sessions.' },
    ],
  },
  'upload-attendance': {
    body: {
      uen: UEN,
      course: {
        sessionID: `${REF}-123456-S1`, referenceNumber: REF,
        attendance: { status: { code: '1' }, trainee: { id: 'S1234567A', name: 'Tan Ah Kow', email: 'trainee@example.com', idType: { code: 'SB' }, contactNumber: { mobile: '91234567', areaCode: null, countryCode: 65 }, numberOfHours: 3.5, surveyLanguage: { code: 'EL' } } },
      },
      corppassId: 'S1234567A',
    },
    note: 'Status code 1 = confirmed, 2 = unconfirmed, 3 = rejected, 4 = TP voided.',
  },
  'trainer-details': { query: [...paging, { name: 'keyword', example: 'tan', desc: 'Filter trainers by name.' }] },
  'update-trainer': {
    body: { trainer: { action: 'update', name: 'Tan Ah Kow', email: 'trainer@example.com', experience: '10 years of adult education', domainAreaOfPractice: 'Data analytics', salutationId: 1, qualifications: [{ level: { code: '21' }, description: 'Bachelor of Science' }] } },
    note: 'Set action to "update" or "delete".',
  },
  'publish-course-run': {
    query: [{ name: 'includeExpiredCourses', example: 'true', desc: 'Allow runs on expired courses.' }],
    body: {
      course: {
        courseReferenceNumber: REF, trainingProvider: { uen: UEN },
        runs: [{
          sequenceNumber: 0, registrationDates: { opening: 20261201, closing: 20261215 }, courseDates: { start: 20261220, end: 20261221 },
          scheduleInfoType: { code: '01', description: 'Description' }, scheduleInfo: 'Sat / Sun, 9am to 6pm',
          venue: { block: '112A', street: 'Street name', floor: '15', unit: '001', building: 'Building', postalCode: '049315', room: '24', wheelChairAccess: true },
          intakeSize: 20, courseAdminEmail: 'admin@example.com', modeOfTraining: '1', courseVacancy: { code: 'A', description: 'Available' },
          sessions: [{ startDate: '20261220', endDate: '20261220', startTime: '09:00', endTime: '18:00', modeOfTraining: '1', venue: { block: '112A', street: 'Street name', floor: '15', unit: '001', postalCode: '049315', room: '24' } }],
          linkCourseRunTrainer: [{ trainer: { trainerType: { code: '1', description: 'Existing' }, indexNumber: 0, id: 'TRNR-0001', name: 'Tan Ah Kow', email: 'trainer@example.com', inTrainingProviderProfile: true } }],
        }],
      },
    },
  },
  'edit-course-run': {
    query: [{ name: 'includeExpiredCourses', example: 'true', desc: 'Allow runs on expired courses.' }],
    body: { course: { courseReferenceNumber: REF, trainingProvider: { uen: UEN }, run: { action: 'update', sequenceNumber: 0, registrationDates: { opening: 20261201, closing: 20261215 }, courseDates: { start: 20261220, end: 20261221 }, intakeSize: 25, courseAdminEmail: 'admin@example.com', modeOfTraining: '1', courseVacancy: { code: 'A', description: 'Available' } } } },
    note: 'Set run.action to "update" or "delete".',
  },
  'course-run-by-id': { query: [{ name: 'includeExpiredCourses', example: 'true', desc: 'Include expired courses.' }] },
  'course-runs-by-ref': {
    query: [
      { name: 'courseReferenceNumber', required: true, example: REF, desc: 'Course reference number.' },
      { name: 'uen', example: UEN, desc: 'Training provider UEN.' },
      ...paging,
      { name: 'tpCode', example: `${UEN}-01`, desc: 'Training partner code.' },
      { name: 'courseRunStartDate', example: '20261220', desc: 'Only runs starting on this date (YYYYMMDD).' },
    ],
  },
  'grant-baseline': { body: { course: { referenceNumber: REF, startDate: '2026-12-20', fee: 1000 } } },
  'grant-personalised': {
    body: { course: { referenceNumber: REF, startDate: '2026-12-20', fee: 1000 }, trainee: { id: 'S1234567A', idType: 'NRIC', dateOfBirth: '1990-01-31', sponsoringEmployerUen: '', modularisedSCTPBundleCourseStartDate: '' } },
  },
  'grant-search': {
    headers: [uenHeader],
    body: { meta: { lastUpdateDateFrom: '2026-11-01', lastUpdateDateTo: '2026-11-30' }, sortBy: { field: 'updatedOn', order: 'asc' }, grants: { trainingPartner: { uen: UEN, code: `${UEN}-01` } }, parameters: { page: 0, pageSize: 20 } },
    note: 'grants.trainingPartner (uen and code) is required. Optional filters inside "grants": course.run.id, course.referenceNumber, trainee.id, employer.uen, enrolment.referenceNumber. Send no x-api-version header: SSG answers "Api Version has expired" when one is present.',
  },
  'sf-view-claim': { query: [{ name: 'nric', required: true, example: 'S1234567A', desc: 'NRIC of the claimant.' }] },
  'sf-cancel-claim': { body: { nric: 'S1234567A', claimCancelCode: '51' }, note: 'claimCancelCode: 51 = course cancelled, 52 = course postponed, 53 = trainee withdrawn, 54 = incorrect amount, 55 = others.' },
  'sf-upload-docs': { body: { nric: 'S1234567A', attachments: [{ fileName: 'receipt.pdf', fileSize: '120 KB', fileType: 'pdf', attachmentId: 'attachment1', attachmentByte: '<base64 file content>' }] } },
  'sf-encrypt-request': {
    body: { claimRequest: { course: { id: REF, fee: '1000.00', runId: '123456', startDate: '2026-12-20' }, individual: { nric: 'S1234567A', email: 'trainee@example.com', homeNumber: '', mobileNumber: '91234567' }, additionalInformation: '', claimRefNumber: 'CLM-0001' } },
    note: 'Returns the encrypted claim request to post to the SkillsFuture Credit Pay page.',
  },
  'sf-decrypt-request': { body: { claimRequestStatus: '<encrypted string returned to your callback URL>' } },
  'enrol-create': {
    body: {
      enrolment: {
        course: { run: { id: '123456' }, referenceNumber: REF },
        trainee: { ...trainee, sponsorshipType: 'INDIVIDUAL', employer: { uen: '', contact: { fullName: '', emailAddress: '', contactNumber: { areaCode: '', countryCode: '65', phoneNumber: '' } } }, fees: { discountAmount: 0, collectionStatus: 'Full Payment' }, enrolmentDate: '2026-12-01' },
        trainingPartner: { uen: UEN, code: `${UEN}-01` },
      },
    },
    note: 'sponsorshipType is INDIVIDUAL or EMPLOYER; the employer block is required for EMPLOYER.',
  },
  'enrol-update': {
    headers: [uenHeader],
    body: { enrolment: { action: 'Update', course: { run: { id: '123456' } }, trainee: { emailAddress: 'new@example.com', contactNumber: { areaCode: '', countryCode: '65', phoneNumber: '91234567' }, fees: { discountAmount: 0, collectionStatus: 'Full Payment' } } } },
    note: 'Set action to "Update" or "Cancel".',
  },
  'enrol-search': {
    body: { meta: { lastUpdateDateFrom: '2026-11-01', lastUpdateDateTo: '2026-11-30' }, sortBy: { field: 'updatedOn', order: 'asc' }, enrolment: { trainingPartner: { uen: UEN, code: `${UEN}-01` } }, parameters: { page: 0, pageSize: 20 } },
    note: 'enrolment.trainingPartner (uen and code) is required. Optional filters inside "enrolment": course.run.id, course.referenceNumber, status, trainee.id, trainee.idType.type. Send no x-api-version header: SSG answers "Api Version has expired" when one is present.',
  },
  'enrol-view': { headers: [uenHeader] },
  'enrol-fee-collection': { body: { enrolment: { fees: { collectionStatus: 'Full Payment' } } }, note: 'collectionStatus: "Pending Payment", "Partial Payment", "Full Payment" or "Cancelled".' },
  'enrol-codes': { query: [{ name: 'codeType', example: 'sponsorshipType', desc: 'Code list to return.' }] },
  'assess-create': {
    body: { assessment: { course: { run: { id: '123456' }, referenceNumber: REF }, trainee: { id: 'S1234567A', idType: 'NRIC', fullName: 'Tan Ah Kow' }, result: 'Pass', grade: 'A', score: 80, assessmentDate: '2026-12-21', skillCode: 'ICT-DIT-3002-1.1', trainingPartner: { uen: UEN, code: `${UEN}-01` }, conferringInstitute: { code: `${UEN}-01` } } },
    note: 'result is "Pass", "Fail" or "Exempt".',
  },
  'assess-update': { body: { assessment: { action: 'update', result: 'Pass', grade: 'B', score: 70, assessmentDate: '2026-12-21', trainee: { fullName: 'Tan Ah Kow' } } }, note: 'Set action to "update" or "void".' },
  'assess-search': {
    body: { meta: { lastUpdateDateFrom: '2026-01-01', lastUpdateDateTo: '2026-12-31' }, sortBy: { field: 'updatedOn', order: 'asc' }, assessment: { course: { run: { id: '123456' }, referenceNumber: REF }, trainee: { id: 'S1234567A' }, trainingPartner: { uen: UEN, code: `${UEN}-01` } }, parameters: { page: 0, pageSize: 20 } },
  },
  'sp-qualifications': { query: [{ name: 'level', example: '70', desc: 'SSEC-EQA level code; omit for all.' }] },
  'sea-skill-extract': { body: { textData: 'Build dashboards in Power BI and analyse sales data with Python.', modelVersion: 'latest' } },
  'sea-skill-search': { body: { textData: 'data visualisation', modelVersion: 'latest' } },
  'sfw-job-roles': { query: [{ name: 'jobRoleId', example: '1', desc: 'Job role ID.' }] },
  'sfw-skills': { query: [{ name: 'skillCode', example: 'ICT-DIT-3002-1.1', desc: 'Skill code.' }] },
  'sfw-gsc-codes': { query: [{ name: 'keyword', required: true, example: 'communication', desc: 'Text to autocomplete.' }] },
  'sfw-ccs-details': { query: [{ name: 'code', required: true, example: 'CCS-0001', desc: 'Critical core skill code.' }] },
  'sfw-tsc-codes': { query: [{ name: 'keyword', required: true, example: 'data', desc: 'Text to autocomplete.' }] },
  'sfw-tsc-codes-details': { query: [{ name: 'keyword', required: true, example: 'data', desc: 'Text to autocomplete, returned with details.' }] },
  'sfw-tsc-details': { query: [{ name: 'code', required: true, example: 'ICT-DIT-3002-1.1', desc: 'Technical skill code.' }] },
  'sfw-job-roles-search': { query: [{ name: 'keyword', example: 'analyst', desc: 'Job role keyword.' }, ...paging] },
  'sfw-job-role-profile': { query: [{ name: 'jobRoleId', required: true, example: '1', desc: 'Job role ID.' }] },
  'sfw-occupations': { query: paging },
};

export type Lang = 'curl' | 'python' | 'javascript';

/** Reader's own values, substituted into every example (see prefs.ts). */
export interface Vars { uen: string; refNo: string; runId: string; cert: string; key: string }
export const DEFAULT_VARS: Vars = { uen: UEN, refNo: REF, runId: '123456', cert: 'ssg-app1-cert.pem', key: 'ssg-app1-key.pem' };

/** Swap the placeholder values in a generated example for the reader's own. */
export function applyVars(text: string, v: Vars): string {
  const pairs: [string, string][] = [
    [DEFAULT_VARS.cert, v.cert || DEFAULT_VARS.cert], [DEFAULT_VARS.key, v.key || DEFAULT_VARS.key],
    [DEFAULT_VARS.refNo, v.refNo || DEFAULT_VARS.refNo], [DEFAULT_VARS.uen, v.uen || DEFAULT_VARS.uen],
    [DEFAULT_VARS.runId, v.runId || DEFAULT_VARS.runId],
  ];
  return pairs.reduce((t, [from, to]) => (from === to ? t : t.split(from).join(to)), text);
}

export const FILE_EXT: Record<Lang, string> = { curl: 'sh', python: 'py', javascript: 'mjs' };
export type AuthChoice = 'cert' | 'oauth';

/** Auth methods an API can be called with (first = default). */
export function authChoices(api: ApiEntry): AuthChoice[] {
  if (api.auth === 'cert+oauth') return ['cert', 'oauth'];
  if (api.auth === 'local') return [];
  return ['cert'];
}

/** Search APIs that must be called without an x-api-version header. */
export const NO_VERSION = new Set(['enrol-search', 'grant-search']);

export function pathParams(api: ApiEntry): string[] {
  return [...api.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

function filledPath(api: ApiEntry): string {
  return api.path.replace(/\{(\w+)\}/g, (_, k: string) => PATH_PARAMS[k]?.example ?? k);
}


const indent = (s: string, n: number) => s.split('\n').map((l, i) => (i ? ' '.repeat(n) + l : l)).join('\n');
const pyLiteral = (v: unknown) => JSON.stringify(v, null, 4).replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None');

export function codeSample(api: ApiEntry, lang: Lang, auth: AuthChoice): string {
  const spec = SPECS[api.page] ?? {};
  const aesReq = api.auth === 'cert+aes' && auth === 'cert';
  const aes = aesReq || (!!spec.encryptedResponse && auth === 'cert');
  const base = auth === 'oauth' ? BASE_URLS.oauth : BASE_URLS.cert;
  const query = (spec.query ?? []).filter((f) => f.required || ['pageSize', 'page', 'includeExpired'].includes(f.name));
  const qs = query.length ? '?' + query.map((f) => `${f.name}=${encodeURIComponent(f.example)}`).join('&') : '';
  const url = `${base}${filledPath(api)}`;
  const headers: [string, string][] = [];
  if (!NO_VERSION.has(api.page)) headers.push(['x-api-version', api.version]);
  for (const h of spec.headers ?? []) headers.push([h.name, h.example]);
  const hasBody = api.method === 'POST';
  const body = spec.body ?? {};

  if (lang === 'curl') {
    const lines: string[] = [];
    if (auth === 'oauth') {
      lines.push('# 1. Get an access token (valid about 30 minutes)', `TOKEN=$(curl -s -X POST ${BASE_URLS.oauth}/dp-oauth/oauth/token \\`, '  -u "$SSG_CLIENT_ID:$SSG_CLIENT_SECRET" \\', '  -d grant_type=client_credentials | jq -r .access_token)', '', '# 2. Call the API');
    }
    if (aes && !aesReq) {
      lines.push('# The response is AES-256-CBC encrypted: key = base64 key from the Developer Portal, IV = "SSGAPIInitVector"', 'KEY_HEX=$(printf %s "$SSG_ENCRYPTION_KEY" | base64 -d | xxd -p -c 64)', 'IV_HEX=$(printf %s SSGAPIInitVector | xxd -p)', '');
    }
    if (aesReq) {
      lines.push('# 1. Encrypt the JSON body: AES-256-CBC, key = base64 key from the Developer Portal,', '#    IV = "SSGAPIInitVector", output base64', `cat > body.json <<'JSON'`, JSON.stringify(body, null, 2), 'JSON', 'KEY_HEX=$(printf %s "$SSG_ENCRYPTION_KEY" | base64 -d | xxd -p -c 64)', 'IV_HEX=$(printf %s SSGAPIInitVector | xxd -p)', 'openssl enc -aes-256-cbc -K "$KEY_HEX" -iv "$IV_HEX" -base64 -A -in body.json > body.enc', '', '# 2. Send it with the client certificate, then decrypt the reply');
    }
    lines.push(`curl -s -X ${api.method} "${url}${qs}" \\`);
    if (auth === 'oauth') lines.push('  -H "Authorization: Bearer $TOKEN" \\');
    else lines.push('  --cert ssg-app1-cert.pem --key ssg-app1-key.pem \\');
    for (const [k, v] of headers) lines.push(`  -H "${k}: ${v}" \\`);
    if (hasBody) {
      lines.push('  -H "Content-Type: application/json" \\');
      lines.push(aesReq ? '  --data-binary @body.enc \\' : `  -d '${indent(JSON.stringify(body, null, 2), 2)}' \\`);
    }
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, '');
    if (aes) lines[lines.length - 1] += ' \\\n  | openssl enc -d -aes-256-cbc -K "$KEY_HEX" -iv "$IV_HEX" -base64 -A';
    return lines.join('\n');
  }

  if (lang === 'python') {
    const L: string[] = ['import os', 'import requests'];
    if (aes) L.push('import base64, json', 'from Crypto.Cipher import AES          # pip install pycryptodome', 'from Crypto.Util.Padding import pad, unpad');
    L.push('');
    if (aes) {
      L.push('KEY = base64.b64decode(os.environ["SSG_ENCRYPTION_KEY"])   # 32 bytes', 'IV = b"SSGAPIInitVector"', '', 'def encrypt(obj):', '    data = pad(json.dumps(obj).encode(), AES.block_size)', '    return base64.b64encode(AES.new(KEY, AES.MODE_CBC, IV).encrypt(data)).decode()', '', 'def decrypt(text):', '    raw = AES.new(KEY, AES.MODE_CBC, IV).decrypt(base64.b64decode(text))', '    return json.loads(unpad(raw, AES.block_size))', '');
    }
    if (auth === 'oauth') {
      L.push('token = requests.post(', `    "${BASE_URLS.oauth}/dp-oauth/oauth/token",`, '    auth=(os.environ["SSG_CLIENT_ID"], os.environ["SSG_CLIENT_SECRET"]),', '    data={"grant_type": "client_credentials"},', '    timeout=30,', ').json()["access_token"]', '');
    }
    if (hasBody) L.push(`body = ${pyLiteral(body)}`, '');
    L.push(`resp = requests.${api.method.toLowerCase()}(`, `    "${url}",`);
    if (query.length) L.push(`    params={${query.map((f) => `"${f.name}": "${f.example}"`).join(', ')}},`);
    const hs = headers.map(([k, v]) => `"${k}": "${v}"`);
    if (auth === 'oauth') hs.push('"Authorization": f"Bearer {token}"');
    if (aesReq) hs.push('"Content-Type": "application/json"');
    if (hs.length) L.push(`    headers={${hs.join(', ')}},`);
    if (hasBody) L.push(aesReq ? '    data=encrypt(body),' : '    json=body,');
    if (auth === 'cert') L.push('    cert=("ssg-app1-cert.pem", "ssg-app1-key.pem"),');
    L.push('    timeout=30,', ')', 'print(resp.status_code)', aes ? 'print(decrypt(resp.text))' : 'print(resp.json())');
    return L.join('\n');
  }

  // JavaScript (Node 18+)
  const J: string[] = [];
  if (auth === 'cert') J.push("import fs from 'node:fs';", "import https from 'node:https';");
  if (aes) J.push("import crypto from 'node:crypto';");
  if (J.length) J.push('');
  if (aes) {
    J.push("const KEY = Buffer.from(process.env.SSG_ENCRYPTION_KEY, 'base64'); // 32 bytes", "const IV = Buffer.from('SSGAPIInitVector');", 'const encrypt = (obj) => {', "  const c = crypto.createCipheriv('aes-256-cbc', KEY, IV);", "  return c.update(JSON.stringify(obj), 'utf8', 'base64') + c.final('base64');", '};', 'const decrypt = (text) => {', "  const d = crypto.createDecipheriv('aes-256-cbc', KEY, IV);", "  return JSON.parse(d.update(text, 'base64', 'utf8') + d.final('utf8'));", '};', '');
  }
  if (hasBody) J.push(`const body = ${JSON.stringify(body, null, 2)};`, '');
  const fullUrl = `${url}${qs}`;
  if (auth === 'oauth') {
    J.push(`const tokenRes = await fetch('${BASE_URLS.oauth}/dp-oauth/oauth/token', {`, "  method: 'POST',", '  headers: {', "    Authorization: 'Basic ' + Buffer.from(`${process.env.SSG_CLIENT_ID}:${process.env.SSG_CLIENT_SECRET}`).toString('base64'),", "    'Content-Type': 'application/x-www-form-urlencoded',", '  },', "  body: 'grant_type=client_credentials',", '});', 'const { access_token } = await tokenRes.json();', '');
    J.push(`const res = await fetch('${fullUrl}', {`, `  method: '${api.method}',`, '  headers: {');
    for (const [k, v] of headers) J.push(`    '${k}': '${v}',`);
    J.push('    Authorization: `Bearer ${access_token}`,');
    if (hasBody) J.push("    'Content-Type': 'application/json',");
    J.push('  },');
    if (hasBody) J.push('  body: JSON.stringify(body),');
    J.push('});', 'console.log(res.status, await res.json());');
    return J.join('\n');
  }
  J.push('// The client certificate goes on the TLS connection (mTLS), so use node:https.');
  J.push(`const req = https.request('${fullUrl}', {`, `  method: '${api.method}',`, "  cert: fs.readFileSync('ssg-app1-cert.pem'),", "  key: fs.readFileSync('ssg-app1-key.pem'),");
  const jh = headers.map(([k, v]) => `'${k}': '${v}'`);
  if (hasBody) jh.push("'Content-Type': 'application/json'");
  if (jh.length) J.push(`  headers: { ${jh.join(', ')} },`);
  J.push('}, (res) => {', "  let data = '';", "  res.on('data', (chunk) => (data += chunk));", `  res.on('end', () => console.log(res.statusCode, ${aes ? 'decrypt(data)' : 'JSON.parse(data)'}));`, '});', "req.on('error', console.error);");
  if (hasBody) J.push(aesReq ? 'req.write(encrypt(body));' : 'req.write(JSON.stringify(body));');
  J.push('req.end();');
  return J.join('\n');
}

export function localToolSample(api: ApiEntry, lang: Lang): string {
  const kind = api.page === 'tools-generate-cert' ? 'cert' : api.page === 'tools-generate-keypair' ? 'keypair' : 'aes';
  if (lang === 'curl') {
    return {
      cert: '# Self-signed certificate + private key (upload the certificate to the Developer Portal)\nopenssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \\\n  -keyout ssg-app1-key.pem -out ssg-app1-cert.pem \\\n  -subj "/C=SG/ST=Singapore/L=Singapore/O=Your Company Pte Ltd/CN=your-app-name"',
      keypair: '# RSA key pair for digital signatures (upload the public key)\nopenssl genrsa -out signature-private.pem 2048\nopenssl rsa -in signature-private.pem -pubout -out signature-public.pem',
      aes: '# 32-byte AES-256 key, base64 encoded\nopenssl rand -base64 32',
    }[kind];
  }
  if (lang === 'python') {
    return {
      cert: '# pip install cryptography\nimport datetime\nfrom cryptography import x509\nfrom cryptography.x509.oid import NameOID\nfrom cryptography.hazmat.primitives import hashes, serialization\nfrom cryptography.hazmat.primitives.asymmetric import rsa\n\nkey = rsa.generate_private_key(public_exponent=65537, key_size=4096)\nname = x509.Name([\n    x509.NameAttribute(NameOID.COUNTRY_NAME, "SG"),\n    x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Your Company Pte Ltd"),\n    x509.NameAttribute(NameOID.COMMON_NAME, "your-app-name"),\n])\nnow = datetime.datetime.now(datetime.timezone.utc)\ncert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)\n        .public_key(key.public_key()).serial_number(x509.random_serial_number())\n        .not_valid_before(now).not_valid_after(now + datetime.timedelta(days=3650))\n        .sign(key, hashes.SHA256()))\nopen("ssg-app1-cert.pem", "wb").write(cert.public_bytes(serialization.Encoding.PEM))\nopen("ssg-app1-key.pem", "wb").write(key.private_bytes(\n    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))',
      keypair: '# pip install cryptography\nfrom cryptography.hazmat.primitives import serialization\nfrom cryptography.hazmat.primitives.asymmetric import rsa\n\nkey = rsa.generate_private_key(public_exponent=65537, key_size=2048)\nopen("signature-private.pem", "wb").write(key.private_bytes(\n    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))\nopen("signature-public.pem", "wb").write(key.public_key().public_bytes(\n    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))',
      aes: 'import base64, os\n\nprint(base64.b64encode(os.urandom(32)).decode())',
    }[kind];
  }
  return {
    cert: "// Node has no built-in X.509 builder; call openssl from a script\nimport { execFileSync } from 'node:child_process';\n\nexecFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:4096', '-sha256', '-days', '3650', '-nodes',\n  '-keyout', 'ssg-app1-key.pem', '-out', 'ssg-app1-cert.pem',\n  '-subj', '/C=SG/O=Your Company Pte Ltd/CN=your-app-name']);",
    keypair: "import crypto from 'node:crypto';\nimport fs from 'node:fs';\n\nconst { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {\n  modulusLength: 2048,\n  publicKeyEncoding: { type: 'spki', format: 'pem' },\n  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },\n});\nfs.writeFileSync('signature-public.pem', publicKey);\nfs.writeFileSync('signature-private.pem', privateKey);",
    aes: "import crypto from 'node:crypto';\n\nconsole.log(crypto.randomBytes(32).toString('base64'));",
  }[kind];
}
