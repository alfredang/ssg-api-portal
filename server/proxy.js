const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');
const os = require('os');
const { AsyncLocalStorage } = require('async_hooks');
const { getAccessToken } = require('./oauth');

const router = express.Router();
const certStore = new AsyncLocalStorage();

// ─────────────────────────────────────────────────────────────────
// SSG API Authentication
//
// 1. OAuth (public-api.ssg-wsg.sg)
//    - Auth: Bearer token via client_id + client_secret
//    - Used by: Course Lookup by Ref No (GET /courses/directory/:refNo)
//
// 2. Certificate / mTLS (api.ssg-wsg.sg)
//    - Auth: Client certificate + private key (no OAuth token)
//    - Used by: Course Search (POST /tpg/courses/registry/search)
//    - Used by: Course Details (GET /tpg/courses/registry/details/:refNo)
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Multi-certificate support
// Load up to 3 certificate sets from env vars (CERT_1_*, CERT_2_*, CERT_3_*)
// Wrap multiline PEM values in double quotes in .env for dotenv to parse them.
// The active cert is selected per-request via the x-cert-id header.
// ─────────────────────────────────────────────────────────────────
const certsMap = new Map();
for (let i = 1; i <= 3; i++) {
  const name = process.env[`CERT_${i}_NAME`];
  const certPem = process.env[`CERT_${i}_CERT`];
  const keyPem = process.env[`CERT_${i}_KEY`];
  
  // Debug logging to identify missing variables
  console.log(`\n--- Checking certificate ${i} ---`);
  console.log(`CERT_${i}_NAME:`, name ? `"${name}"` : '❌ MISSING');
  console.log(`CERT_${i}_CERT:`, certPem ? `✓ Present (${certPem.length} chars)` : '❌ MISSING');
  console.log(`CERT_${i}_KEY:`, keyPem ? `✓ Present (${keyPem.length} chars)` : '❌ MISSING');
  
  if (!name || !certPem || !keyPem) {
    console.log(`⚠️  Certificate ${i} skipped - missing required variables`);
    continue;
  }

  const encKey = process.env[`CERT_${i}_ENCRYPTION_KEY`];
  certsMap.set(String(i), {
    id: String(i),
    name,
    cert: Buffer.from(certPem),
    key: Buffer.from(keyPem),
    encryptionKey: encKey ? Buffer.from(encKey, 'base64') : null,
  });
  console.log(`✅ Loaded certificate ${i}: ${name}`);
}
if (certsMap.size === 0) {
  console.warn('No certificates configured. Set CERT_1_NAME, CERT_1_CERT, CERT_1_KEY in .env (wrap PEM in double quotes)');
}

const certApiBase = process.env.SSG_CERT_API_BASE_URL || 'https://api.ssg-wsg.sg';

// Get the active cert for the current request (via AsyncLocalStorage)
function getActiveCert() {
  const certId = certStore.getStore() || '1';
  
  console.log(`getActiveCert: certId="${certId}"`);
  console.log('Available cert IDs:', Array.from(certsMap.keys()));
  
  // OAuth doesn't use certificates
  if (certId === 'oauth') {
    console.log('OAuth mode selected - no certificate needed');
    return null;
  }
  
  const cert = certsMap.get(certId);
  if (!cert) {
    console.error(`Certificate ${certId} not found in certsMap`);
    console.error('Available certificates:', Array.from(certsMap.entries()).map(([id, c]) => ({ id, name: c.name })));
    // Try to get the first available cert as fallback
    const firstCert = certsMap.values().next().value;
    if (firstCert) {
      console.log(`Using fallback certificate: ${firstCert.name}`);
      return firstCert;
    }
    return null;
  }
  
  console.log(`Using certificate: ${cert.name} (ID: ${cert.id})`);
  return cert;
}

// Middleware: resolve cert selection from x-cert-id header
router.use((req, res, next) => {
  const certId = req.headers['x-cert-id'] || '1';
  console.log(`[${req.method} ${req.path}] x-cert-id header: "${certId}"`);
  certStore.run(certId, next);
});

// GET /api/certs endpoint
router.get('/certs', (req, res) => {
  const certs = [];
  
  // Add loaded certificates from certsMap
  for (const [id, certData] of certsMap.entries()) {
    certs.push({ id, name: certData.name });
  }
  
  // Add OAuth option
  certs.push({ id: 'oauth', name: 'TMS 2 (OAuth)' });
  
  res.json(certs);
});

// AES-256-CBC encryption/decryption for cert-based API payloads
function aesEncrypt(plaintext) {
  const active = getActiveCert();
  if (!active || !active.encryptionKey) {
    throw new Error('Encryption key not configured for the active certificate. OAuth mode does not support encryption.');
  }
  const iv = Buffer.from('SSGAPIInitVector', 'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', active.encryptionKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function aesDecrypt(ciphertext) {
  const active = getActiveCert();
  if (!active || !active.encryptionKey) {
    throw new Error('Decryption key not configured for the active certificate. OAuth mode does not support decryption.');
  }
  const iv = Buffer.from('SSGAPIInitVector', 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', active.encryptionKey, iv);
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// mTLS GET helper — returns { status, body } or throws on network error
function certApiGet(apiPath, queryParams = {}, { apiVersion = 'v1.2', headers: extraHeaders = {} } = {}) {
  const active = getActiveCert();
  if (!active) throw new Error('No certificate configured');
  const url = new URL(apiPath, certApiBase);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      cert: active.cert,
      key: active.key,
      headers: {
        'Accept': 'application/json',
        'x-api-version': apiVersion,
        ...extraHeaders,
      },
    };

    const httpsReq = https.request(reqOptions, (httpsRes) => {
      let data = '';
      httpsRes.on('data', (chunk) => { data += chunk; });
      httpsRes.on('end', () => {
        resolve({ status: httpsRes.statusCode, body: data });
      });
    });

    httpsReq.on('error', reject);
    httpsReq.end();
  });
}

// OAuth GET helper for public APIs (public-api.ssg-wsg.sg)
async function oauthApiGet(apiPath, queryParams = {}, { apiVersion = 'v3.0' } = {}) {
  const token = await getAccessToken();
  const baseUrl = process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';

  const url = new URL(apiPath, baseUrl);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'x-api-version': apiVersion,
    },
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: response.status, body: data };
}

// OAuth helper for public APIs (public-api.ssg-wsg.sg)
async function ssgApiGet(endpoint, queryParams = {}, { apiVersion = 'v1.2', baseUrl: baseUrlOverride } = {}) {
  const token = await getAccessToken();
  const baseUrl = baseUrlOverride || process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';

  const url = new URL(endpoint, baseUrl);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'x-api-version': apiVersion,
    },
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    const error = new Error(`SSG API error: ${response.status}`);
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data;
}

// mTLS POST helper — returns { status, body } or throws on network error
function certApiPost(apiPath, jsonBody, { apiVersion = 'v1.2', headers: extraHeaders = {} } = {}) {
  const active = getActiveCert();
  if (!active) throw new Error('No certificate configured');
  const url = new URL(apiPath, certApiBase);
  const requestBody = JSON.stringify(jsonBody);

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      cert: active.cert,
      key: active.key,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'x-api-version': apiVersion,
        ...extraHeaders,
      },
    };

    const httpsReq = https.request(reqOptions, (httpsRes) => {
      let data = '';
      httpsRes.on('data', (chunk) => { data += chunk; });
      httpsRes.on('end', () => {
        resolve({ status: httpsRes.statusCode, body: data });
      });
    });

    httpsReq.on('error', reject);
    httpsReq.write(requestBody);
    httpsReq.end();
  });
}

// OAuth POST helper for public APIs (public-api.ssg-wsg.sg)
async function ssgApiPost(endpoint, jsonBody, { apiVersion = 'v1.2' } = {}) {
  const token = await getAccessToken();
  const baseUrl = process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';

  const url = new URL(endpoint, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-version': apiVersion,
    },
    body: JSON.stringify(jsonBody),
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    const error = new Error(`SSG API error: ${response.status}`);
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data;
}

// GET /api/training-providers/:uen/trainers — mTLS Certificate with OAuth fallback
router.get('/training-providers/:uen/trainers', async (req, res) => {
  try {
    const { uen } = req.params;
    const { pageSize, page, keyword } = req.query;

    if (!uen) {
      return res.status(400).json({ error: 'UEN is required' });
    }

    const queryParams = {
      pageSize: pageSize || '20',
      page: page || '0',
      ...(keyword ? { keyword } : {}),
    };
    const apiPath = `/trainingProviders/${encodeURIComponent(uen)}/trainers`;

    // Try certificate first
    console.log('Trainers request (cert):', apiPath);
    const result = await certApiGet(apiPath, queryParams, { apiVersion: 'v2.0' });
    console.log('Trainers cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Trainers: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Trainers: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v2.0' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Trainers error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/training-providers/:uen/courses — uses TPG Course Search (mTLS)
router.get('/training-providers/:uen/courses', async (req, res) => {
  try {
    const { uen } = req.params;
    const { pageSize, page, keyword, includeExpiredCourses } = req.query;

    if (!uen) {
      return res.status(400).json({ error: 'UEN is required' });
    }

    const ps = parseInt(pageSize) || 20;
    const pg = parseInt(page) || 0;

    // Use TPG course search endpoint which works via mTLS cert
    const searchBody = {
      uen,
      keyword: keyword || '',
      page: pg,
      pageSize: ps,
      details: 'FULL',
      sortBy: { field: 'updatedDate', order: 'desc' },
      course: {
        meta: {
          updatedDate: {
            from: '2019-01-01',
            to: new Date().toISOString().slice(0, 10),
          },
        },
      },
    };

    console.log('TP Courses search (cert) for UEN:', uen);
    const data = await fetchCourseSearchPage(searchBody, uen);
    res.json(data);
  } catch (err) {
    console.error('TP Courses error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/training-providers/:uen/trainers/:trainerId — mTLS Certificate with OAuth fallback
// Used for both update and delete (determined by trainer.action field)
router.post('/training-providers/:uen/trainers/:trainerId', async (req, res) => {
  try {
    const { uen, trainerId } = req.params;
    const body = req.body;

    if (!uen || !trainerId) {
      return res.status(400).json({ error: 'UEN and trainer ID are required' });
    }
    if (!body.trainer) {
      return res.status(400).json({ error: 'trainer object is required in request body' });
    }

    const apiPath = `/trainingProviders/${encodeURIComponent(uen)}/trainers/${encodeURIComponent(trainerId)}`;

    // Try certificate first
    console.log('Update/Delete trainer request (cert):', apiPath, 'action:', body.trainer.action);
    const result = await certApiPost(apiPath, body, { apiVersion: 'v2.0' });
    console.log('Update/Delete trainer cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Update/Delete trainer: certificate auth succeeded');
      let data;
      try { data = JSON.parse(result.body); } catch { data = result.body; }
      if (typeof data !== 'string') { return res.json(data); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Update/Delete trainer: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiPost(apiPath, body, { apiVersion: 'v2.0' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Update/Delete trainer error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/courses/runs/:runId/sessions/attendance/upload — mTLS + AES (api.ssg-wsg.sg)
router.post('/courses/runs/:runId/sessions/attendance/upload', async (req, res) => {
  try {
    const { runId } = req.params;
    const payload = req.body;

    if (!payload.uen || !payload.course) {
      return res.status(400).json({ error: 'uen and course are required in the request body' });
    }

    // AES-encrypt the JSON payload
    const plaintext = JSON.stringify(payload);
    const encryptedPayload = aesEncrypt(plaintext);
    console.log('Upload attendance: encrypting payload for run', runId);

    const apiPath = `/courses/runs/${encodeURIComponent(runId)}/sessions/attendance`;
    const url = new URL(apiPath, certApiBase);
    const requestBody = JSON.stringify({ payload: encryptedPayload });
    
    const active = getActiveCert();
    if (!active) throw new Error('No certificate configured');

    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        cert: active.cert,
        key: active.key,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          'x-api-version': 'v1.5',
        },
      };

      const httpsReq = https.request(reqOptions, (httpsRes) => {
        let data = '';
        httpsRes.on('data', (chunk) => { data += chunk; });
        httpsRes.on('end', () => {
          resolve({ status: httpsRes.statusCode, body: data });
        });
      });

      httpsReq.on('error', reject);
      httpsReq.write(requestBody);
      httpsReq.end();
    });

    console.log('Upload attendance response status:', result.status);
    console.log('Upload attendance response body:', result.body.substring(0, 500));

    let data;
    try {
      data = JSON.parse(result.body);
    } catch {
      // Response might be AES-encrypted — try decrypting
      try {
        const decrypted = aesDecrypt(result.body.trim());
        data = JSON.parse(decrypted);
      } catch {
        throw Object.assign(
          new Error(`SSG API returned unparseable response (${result.status}): ${result.body.substring(0, 200)}`),
          { status: result.status }
        );
      }
    }

    if (result.status < 200 || result.status >= 300) {
      const error = new Error(`SSG API error: ${result.status}`);
      error.status = result.status;
      error.body = data;
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('Upload attendance error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/runs/:runId/sessions/attendance — mTLS Certificate with OAuth fallback
router.get('/courses/runs/:runId/sessions/attendance', async (req, res) => {
  try {
    const { runId } = req.params;
    const { uen, courseReferenceNumber, sessionId } = req.query;

    if (!uen || !courseReferenceNumber) {
      return res.status(400).json({ error: 'UEN and courseReferenceNumber are required' });
    }

    const queryParams = {
      uen,
      courseReferenceNumber,
      ...(sessionId ? { sessionId } : {}),
    };
    const apiPath = `/courses/runs/${encodeURIComponent(runId)}/sessions/attendance`;

    // Try certificate first
    console.log('Session attendance request (cert):', apiPath);
    const result = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.5' });
    console.log('Session attendance cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Session attendance: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Session attendance: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.5' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Session attendance error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/runs/:runId/sessions — mTLS Certificate with OAuth fallback
router.get('/courses/runs/:runId/sessions', async (req, res) => {
  try {
    const { runId } = req.params;
    const { uen, courseReferenceNumber, sessionMonth, includeExpiredCourses } = req.query;

    if (!uen || !courseReferenceNumber) {
      return res.status(400).json({ error: 'UEN and courseReferenceNumber are required' });
    }

    const queryParams = {
      uen,
      courseReferenceNumber,
      ...(sessionMonth ? { sessionMonth } : {}),
      ...(includeExpiredCourses !== undefined ? { includeExpiredCourses } : {}),
    };
    const apiPath = `/courses/runs/${encodeURIComponent(runId)}/sessions`;

    // Try certificate first
    console.log('Course sessions request (cert):', apiPath);
    const result = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.5' });
    console.log('Course sessions cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Course sessions: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Course sessions: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.5' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Course sessions error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/courses/courseRuns/publish — mTLS Certificate with OAuth fallback
// Publish course run(s) with sessions
router.post('/courses/courseRuns/publish', async (req, res) => {
  try {
    const { includeExpiredCourses } = req.query;
    const body = req.body;

    if (!body.course || !body.course.courseReferenceNumber) {
      return res.status(400).json({ error: 'course.courseReferenceNumber is required in request body' });
    }

    const apiPath = '/courses/courseRuns/publish';
    const queryParams = {
      ...(includeExpiredCourses !== undefined ? { includeExpiredCourses } : { includeExpiredCourses: 'true' }),
    };

    // Try certificate first
    console.log('Publish course run request (cert):', apiPath);
    const certUrl = new URL(apiPath, certApiBase);
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') certUrl.searchParams.set(k, v);
    }
    const requestBody = JSON.stringify(body);
    
    const active = getActiveCert();
    if (!active) throw new Error('No certificate configured');
    
    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: certUrl.hostname,
        port: 443,
        path: certUrl.pathname + certUrl.search,
        method: 'POST',
        cert: active.cert,
        key: active.key,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          'x-api-version': 'v1.2',
        },
      };

      const httpsReq = https.request(reqOptions, (httpsRes) => {
        let data = '';
        httpsRes.on('data', (chunk) => { data += chunk; });
        httpsRes.on('end', () => {
          resolve({ status: httpsRes.statusCode, body: data });
        });
      });

      httpsReq.on('error', reject);
      httpsReq.write(requestBody);
      httpsReq.end();
    });

    console.log('Publish course run cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Publish course run: certificate auth succeeded');
      let data;
      try { data = JSON.parse(result.body); } catch { data = result.body; }
      if (typeof data !== 'string') { return res.json(data); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Publish course run: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiPost(`${apiPath}?${new URLSearchParams(queryParams).toString()}`, body, { apiVersion: 'v1.2' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Publish course run error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/courses/courseRuns/edit/:runId — mTLS Certificate with OAuth fallback
// Update/Delete course run with sessions
router.post('/courses/courseRuns/edit/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const { includeExpiredCourses } = req.query;
    const body = req.body;

    if (!body.course || !body.course.courseReferenceNumber) {
      return res.status(400).json({ error: 'course.courseReferenceNumber is required in request body' });
    }

    const apiPath = `/courses/courseRuns/edit/${encodeURIComponent(runId)}`;
    const queryParams = {
      ...(includeExpiredCourses !== undefined ? { includeExpiredCourses } : { includeExpiredCourses: 'true' }),
    };

    // Try certificate first
    console.log('Edit course run request (cert):', apiPath, 'action:', body.course?.run?.action);
    const certUrl = new URL(apiPath, certApiBase);
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') certUrl.searchParams.set(k, v);
    }
    const requestBody = JSON.stringify(body);
    
    const active = getActiveCert();
    if (!active) throw new Error('No certificate configured');
    
    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: certUrl.hostname,
        port: 443,
        path: certUrl.pathname + certUrl.search,
        method: 'POST',
        cert: active.cert,
        key: active.key,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          'x-api-version': 'v1.2',
        },
      };

      const httpsReq = https.request(reqOptions, (httpsRes) => {
        let data = '';
        httpsRes.on('data', (chunk) => { data += chunk; });
        httpsRes.on('end', () => {
          resolve({ status: httpsRes.statusCode, body: data });
        });
      });

      httpsReq.on('error', reject);
      httpsReq.write(requestBody);
      httpsReq.end();
    });

    console.log('Edit course run cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Edit course run: certificate auth succeeded');
      let data;
      try { data = JSON.parse(result.body); } catch { data = result.body; }
      if (typeof data !== 'string') { return res.json(data); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Edit course run: certificate returned', result.status, '— falling back to OAuth');
    const oauthPath = `${apiPath}?${new URLSearchParams(queryParams).toString()}`;
    const data = await ssgApiPost(oauthPath, body, { apiVersion: 'v1.2' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Edit course run error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/courseRuns/reference — mTLS Certificate with OAuth fallback
// Retrieve course runs based on course reference number
router.get('/courses/courseRuns/reference', async (req, res) => {
  try {
    const { uen, courseReferenceNumber, pageSize, page, tpCode, courseRunStartDate, includeExpiredCourses } = req.query;

    if (!courseReferenceNumber) {
      return res.status(400).json({ error: 'courseReferenceNumber is required' });
    }

    const queryParams = {
      ...(uen ? { uen } : {}),
      courseReferenceNumber,
      pageSize: pageSize || '20',
      page: page || '0',
      ...(tpCode ? { tpCode } : {}),
      ...(courseRunStartDate ? { courseRunStartDate } : {}),
      ...(includeExpiredCourses !== undefined ? { includeExpiredCourses } : { includeExpiredCourses: 'true' }),
    };
    const apiPath = '/courses/courseRuns/reference';

    // Try certificate first
    console.log('Course runs by ref request (cert):', apiPath);
    const result = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
    console.log('Course runs by ref cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Course runs by ref: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Course runs by ref: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Course runs by ref error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/courseRuns/id/:runId — mTLS Certificate with OAuth fallback
// Retrieve course run based on run ID
router.get('/courses/courseRuns/id/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const { includeExpiredCourses } = req.query;
    const queryParams = {
      ...(includeExpiredCourses !== undefined ? { includeExpiredCourses } : { includeExpiredCourses: 'true' }),
    };
    const apiPath = `/courses/courseRuns/id/${encodeURIComponent(runId)}`;

    // Try certificate first
    console.log('Course run by ID request (cert):', apiPath);
    const result = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
    console.log('Course run by ID cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Course run by ID: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Course run by ID: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Course run by ID error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/popular — mTLS Certificate with OAuth fallback
// Must be registered before /courses/:refNo to avoid matching "popular" as a refNo
router.get('/courses/popular', async (req, res) => {
  try {
    const { pageSize, page, taggingCode } = req.query;
    const queryParams = {
      pageSize: pageSize || '20',
      page: page || '0',
      ...(taggingCode ? { taggingCode } : {}),
    };
    const apiPath = '/courses/directory/popular';

    // Try certificate first
    console.log('Popular courses request (cert):', apiPath);
    const result = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    console.log('Popular courses cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Popular courses: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Popular courses: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Popular courses error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/:refNo/quality — mTLS Certificate with OAuth fallback
router.get('/courses/:refNo/quality', async (req, res) => {
  try {
    const { refNo } = req.params;
    const apiPath = `/courses/directory/${encodeURIComponent(refNo)}/quality`;

    // Try certificate first
    console.log('Course quality request (cert):', apiPath);
    const result = await certApiGet(apiPath, {}, { apiVersion: 'v2.0' });
    console.log('Course quality cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Course quality: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Course quality: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, {}, { apiVersion: 'v2.0' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Course quality error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/:refNo/outcome — mTLS Certificate with OAuth fallback
router.get('/courses/:refNo/outcome', async (req, res) => {
  try {
    const { refNo } = req.params;
    const apiPath = `/courses/directory/${encodeURIComponent(refNo)}/outcome`;

    // Try certificate first
    console.log('Course outcome request (cert):', apiPath);
    const result = await certApiGet(apiPath, {}, { apiVersion: 'v2.0' });
    console.log('Course outcome cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Course outcome: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Course outcome: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, {}, { apiVersion: 'v2.0' });
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Course outcome error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/:refNo — mTLS Certificate with OAuth fallback
router.get('/courses/:refNo', async (req, res) => {
  try {
    const { refNo } = req.params;
    const includeExpired = req.query.includeExpired !== 'false';
    const apiPath = `/courses/directory/${encodeURIComponent(refNo)}`;
    const queryParams = { includeExpiredCourses: includeExpired };

    // Try certificate first
    console.log('Course lookup request (cert):', apiPath);
    const result = await certApiGet(apiPath, queryParams);
    console.log('Course lookup cert response status:', result.status);

    if (result.status >= 200 && result.status < 300) {
      console.log('Course lookup: certificate auth succeeded');
      let parsed; try { parsed = JSON.parse(result.body); } catch { parsed = result.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Course lookup: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams);
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    res.json(data);
  } catch (err) {
    console.error('Course lookup error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/courses/details/:refNo — mTLS Certificate (api.ssg-wsg.sg)
router.get('/courses/details/:refNo', async (req, res) => {
  try {
    const { refNo } = req.params;
    const { uen, courseRunStartDate } = req.query;

    if (!uen) {
      return res.status(400).json({ error: 'UEN is required' });
    }

    const apiPath = `/tpg/courses/registry/details/${encodeURIComponent(refNo)}`;
    const url = new URL(apiPath, certApiBase);
    if (courseRunStartDate) {
      url.searchParams.set('courseRunStartDate', courseRunStartDate);
    }

    console.log('Course details request:', url.pathname + url.search);
    
    const active = getActiveCert();
    if (!active) throw new Error('No certificate configured');

    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        cert: active.cert,
        key: active.key,
        headers: {
          'Accept': 'application/json',
          'x-api-version': 'v8.0',
          'UEN': uen,
        },
      };

      const httpsReq = https.request(reqOptions, (httpsRes) => {
        let data = '';
        httpsRes.on('data', (chunk) => { data += chunk; });
        httpsRes.on('end', () => {
          resolve({ status: httpsRes.statusCode, body: data });
        });
      });

      httpsReq.on('error', reject);
      httpsReq.end();
    });

    console.log('Course details response status:', result.status);
    console.log('Course details response body:', result.body.substring(0, 500));

    let data;
    try {
      data = JSON.parse(result.body);
    } catch {
      throw Object.assign(
        new Error(`SSG API returned non-JSON response (${result.status}): ${result.body.substring(0, 200)}`),
        { status: result.status }
      );
    }

    if (result.status < 200 || result.status >= 300) {
      const error = new Error(`SSG API error: ${result.status}`);
      error.status = result.status;
      error.body = data;
      throw error;
    }

    // Normalize: API returns data.course (singular), wrap as data.courses array
    if (data?.data?.course && !data?.data?.courses) {
      data.data.courses = [data.data.course];
      delete data.data.course;
    }

    res.json(data);
  } catch (err) {
    console.error('Course details error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// Helper: single page fetch for course search via mTLS
async function fetchCourseSearchPage(searchBody, uen) {
  const url = new URL('/tpg/courses/registry/search', certApiBase);
  const requestBody = JSON.stringify(searchBody);

  const result = await new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      cert: getActiveCert()?.cert,
      key: getActiveCert()?.key,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': 'v8.0',
        ...(uen ? { 'UEN': uen } : {}),
      },
    };

    const httpsReq = https.request(reqOptions, (httpsRes) => {
      let data = '';
      httpsRes.on('data', (chunk) => { data += chunk; });
      httpsRes.on('end', () => {
        resolve({ status: httpsRes.statusCode, body: data });
      });
    });

    httpsReq.on('error', reject);
    httpsReq.write(requestBody);
    httpsReq.end();
  });

  let data;
  try {
    data = JSON.parse(result.body);
  } catch {
    throw Object.assign(
      new Error(`SSG API returned non-JSON response (${result.status}): ${result.body.substring(0, 200)}`),
      { status: result.status }
    );
  }

  if (result.status < 200 || result.status >= 300) {
    const error = new Error(`SSG API error: ${result.status}`);
    error.status = result.status;
    error.body = data;
    throw error;
  }

  return data;
}

// POST /api/courses/search — mTLS Certificate (api.ssg-wsg.sg)
// SSG API max pageSize is 20, so we fetch multiple pages to fill larger requests
const SSG_MAX_PAGE_SIZE = 20;

router.post('/courses/search', async (req, res) => {
  try {
    const { uen, keyword, pageSize: requestedSize, page: requestedPage, ...body } = req.body;
    const desiredTotal = requestedSize || 20;

    if (desiredTotal <= SSG_MAX_PAGE_SIZE) {
      // Single page fetch — fits within API limit
      const searchBody = { ...body, keyword: keyword || '', pageSize: desiredTotal, page: requestedPage || 0 };
      console.log('Course search request (single page):', JSON.stringify(searchBody));
      const data = await fetchCourseSearchPage(searchBody, uen);
      return res.json(data);
    }

    // Multi-page fetch — need to aggregate multiple API calls
    const pagesToFetch = Math.ceil(desiredTotal / SSG_MAX_PAGE_SIZE);
    console.log(`Course search: fetching ${pagesToFetch} pages (requested ${desiredTotal} courses)`);

    let allCourses = [];
    let totalFromApi = 0;
    let lastStatus = 200;

    for (let i = 0; i < pagesToFetch; i++) {
      const searchBody = { ...body, keyword: keyword || '', pageSize: SSG_MAX_PAGE_SIZE, page: i };
      console.log(`  Fetching page ${i}...`);
      const pageData = await fetchCourseSearchPage(searchBody, uen);

      const courses = pageData?.data?.courses || [];
      totalFromApi = pageData?.meta?.total ?? totalFromApi;
      lastStatus = pageData?.status ?? lastStatus;
      allCourses = allCourses.concat(courses);

      // Stop if we've collected enough or there are no more results
      if (allCourses.length >= desiredTotal || allCourses.length >= totalFromApi) {
        break;
      }
    }

    // Trim to requested size
    allCourses = allCourses.slice(0, desiredTotal);

    res.json({
      status: lastStatus,
      data: { courses: allCourses },
      meta: { total: totalFromApi },
    });
  } catch (err) {
    console.error('Course search error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Grant Calculator APIs
// ─────────────────────────────────────────────────────────────────

// POST /api/grants/baseline — Grant Calculator Baseline Scheme
// mTLS Certificate with OAuth fallback
router.post('/grants/baseline', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/grantCalculators/individual';

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Grant Calculator Baseline: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Grant Calculator Baseline error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/grants/personalised — Grant Calculator Personalised
// mTLS Certificate with OAuth fallback
router.post('/grants/personalised', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/grantCalculators/individual/personalised';

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Grant Calculator Personalised: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Grant Calculator Personalised error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/grants/search — Search Grants (TPG)
// mTLS Certificate with OAuth fallback
router.post('/grants/search', async (req, res) => {
  try {
    const body = req.body;
    const uen = req.headers['uen'] || req.query.uen || '';
    const apiPath = '/tpg/grants/search';

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, {
      apiVersion: 'v1.0',
      headers: uen ? { 'Uen': uen } : {},
    });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Search Grants: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth — need to pass Uen header
    const token = await require('./oauth').getAccessToken();
    const baseUrl = process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';
    const url = new URL(apiPath, baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': 'v1.0',
        ...(uen ? { 'Uen': uen } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!response.ok) {
      return res.status(response.status).json({
        error: `SSG API error: ${response.status}`,
        details: data,
      });
    }
    if (typeof data === 'string') {
      return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) });
    }
    return res.json(data);
  } catch (err) {
    console.error('Search Grants error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/grants/details/:grantRefNo — View Grant Details
// mTLS Certificate with OAuth fallback
router.get('/grants/details/:grantRefNo', async (req, res) => {
  try {
    const { grantRefNo } = req.params;
    const apiPath = `/tpg/grants/details/${encodeURIComponent(grantRefNo)}`;

    // Try certificate first
    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') {
        return res.json(parsed);
      }
      console.log('View Grant: cert returned non-JSON — falling back to OAuth');
    } else {
      console.log(`View Grant: certificate returned ${certResult.status} — falling back to OAuth`);
    }

    // Fall back to OAuth
    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('View Grant error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/grants/codes/fundingComponent — Grants Code Lookup
// mTLS Certificate with OAuth fallback
router.get('/grants/codes/fundingComponent', async (req, res) => {
  try {
    const apiPath = '/tpg/codes/grants/fundingComponent';

    // Try certificate first
    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Grants Code Lookup: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Grants Code Lookup error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// SkillsFuture Credit Pay APIs
// ─────────────────────────────────────────────────────────────────

// GET /api/sf-credits/claims/:claimId — View Claim Details
// mTLS Certificate with OAuth fallback
router.get('/sf-credits/claims/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { nric } = req.query;
    const apiPath = `/skillsFutureCredits/claims/${encodeURIComponent(claimId)}`;

    // Try certificate first
    const certResult = await certApiGet(apiPath, { nric }, { apiVersion: 'v2' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`SF Credit View Claim: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiGet(apiPath, { nric }, { apiVersion: 'v2' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('SF Credit View Claim error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/sf-credits/claims/:claimId/cancel — Cancel Claim
// mTLS Certificate with OAuth fallback
router.post('/sf-credits/claims/:claimId/cancel', async (req, res) => {
  try {
    const { claimId } = req.params;
    const body = req.body;
    const apiPath = `/skillsFutureCredits/claims/${encodeURIComponent(claimId)}`;

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v2' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`SF Credit Cancel Claim: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('SF Credit Cancel Claim error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/sf-credits/claims/:claimId/supportingdocuments — Upload Supporting Documents
// mTLS Certificate with OAuth fallback
router.post('/sf-credits/claims/:claimId/supportingdocuments', async (req, res) => {
  try {
    const { claimId } = req.params;
    const body = req.body;
    const apiPath = `/skillsFutureCredits/claims/${encodeURIComponent(claimId)}/supportingdocuments`;

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v2' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`SF Credit Upload Docs: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('SF Credit Upload Docs error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/sf-credits/claims/encryptRequests — Request Encryption
// mTLS Certificate with OAuth fallback
router.post('/sf-credits/claims/encryptRequests', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/skillsFutureCredits/claims/encryptRequests';

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v2' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`SF Credit Encrypt Request: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('SF Credit Encrypt Request error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/sf-credits/claims/decryptRequests — Request Decryption
// mTLS Certificate with OAuth fallback
router.post('/sf-credits/claims/decryptRequests', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/skillsFutureCredits/claims/decryptRequests';

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v2' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`SF Credit Decrypt Request: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('SF Credit Decrypt Request error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Enrolment APIs
// ─────────────────────────────────────────────────────────────────

// POST /api/enrolments — Create Enrolment
// mTLS Certificate with OAuth fallback
router.post('/enrolments', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/tpg/enrolments';

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Create Enrolment: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Create Enrolment error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/enrolments/details/:enrolmentRefNo — Update/Cancel Enrolment
// mTLS Certificate with OAuth fallback
router.post('/enrolments/details/:enrolmentRefNo', async (req, res) => {
  try {
    const { enrolmentRefNo } = req.params;
    const body = req.body;
    const uen = req.headers['uen'] || req.query.uen || '';
    const apiPath = `/tpg/enrolments/details/${encodeURIComponent(enrolmentRefNo)}`;

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, {
      apiVersion: 'v3.0',
      headers: uen ? { 'uen': uen } : {},
    });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Update/Cancel Enrolment: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth — need to pass uen header
    const token = await require('./oauth').getAccessToken();
    const baseUrl = process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';
    const url = new URL(apiPath, baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-version': 'v3.0',
        ...(uen ? { 'uen': uen } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!response.ok) {
      return res.status(response.status).json({
        error: `SSG API error: ${response.status}`,
        details: data,
      });
    }
    if (typeof data === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: data.substring(0, 200) }); }
    return res.json(data);
  } catch (err) {
    console.error('Update/Cancel Enrolment error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/enrolments/search — Search Enrolments
// mTLS Certificate with OAuth fallback
router.post('/enrolments/search', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/tpg/enrolments/search';

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Search Enrolments: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Search Enrolments error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/enrolments/details/:enrolmentRefNo — View Enrolment
// mTLS Certificate with OAuth fallback
router.get('/enrolments/details/:enrolmentRefNo', async (req, res) => {
  const { enrolmentRefNo } = req.params;
  const apiPath = `/tpg/enrolments/details/${enrolmentRefNo}`;
  
  try {
    const certId = certStore.getStore();
    console.log(`View Enrolment: certId="${certId}", enrolmentRefNo="${enrolmentRefNo}"`);
    
    // Check if OAuth is selected (cert ID 'oauth')
    if (certId === 'oauth') {
      console.log('View Enrolment: using OAuth authentication');
      const result = await oauthApiGet(apiPath, {}, { apiVersion: 'v3.0' });
      
      if (result.status >= 200 && result.status < 300) {
        // OAuth returns plain JSON, no decryption needed
        return res.json(result.body);
      }
      
      return res.status(result.status).json({
        error: 'OAuth authentication failed',
        details: result.body
      });
    }
    
    // Use certificate authentication
    const activeCert = getActiveCert();
    console.log('View Enrolment: using certificate authentication with cert:', activeCert?.name);
    
    if (!activeCert) {
      return res.status(500).json({
        error: 'No certificate configured',
        details: 'Unable to find certificate for authentication'
      });
    }
    
    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v3.0' });
    
    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('View Enrolment: certificate auth succeeded (status', certResult.status + ')');
      try {
        // Certificate responses are AES-encrypted
        const decrypted = aesDecrypt(certResult.body.trim());
        const parsed = JSON.parse(decrypted);
        return res.json(parsed);
      } catch (decErr) {
        console.error('View Enrolment: decryption failed, returning raw response —', decErr.message);
        let parsed;
        try {
          parsed = JSON.parse(certResult.body);
        } catch {
          parsed = certResult.body;
        }
        return res.json(parsed);
      }
    }
    
    // Certificate auth failed
    console.error('View Enrolment: certificate auth failed with status', certResult.status);
    return res.status(certResult.status).json({
      error: 'Certificate authentication failed',
      details: certResult.body
    });
    
  } catch (error) {
    console.error('View Enrolment error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/enrolments/feeCollections/:enrolmentRefNo — Update Enrolment Fee Collection
// mTLS Certificate with OAuth fallback
router.post('/enrolments/feeCollections/:enrolmentRefNo', async (req, res) => {
  try {
    const { enrolmentRefNo } = req.params;
    const body = req.body;
    const apiPath = `/tpg/enrolments/feeCollections/${encodeURIComponent(enrolmentRefNo)}`;

    // Try certificate first
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Fee Collection: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Fee Collection error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/enrolments/codes/sponsorshipType — Enrolment Code Lookup
// mTLS Certificate with OAuth fallback
router.get('/enrolments/codes/sponsorshipType', async (req, res) => {
  try {
    const apiPath = '/tpg/codes/enrolments/sponsorshipType';

    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Enrolment Code Lookup: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Enrolment Code Lookup error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Assessment APIs
// ─────────────────────────────────────────────────────────────────

// POST /api/assessments — Create Assessment
// mTLS Certificate with OAuth fallback
router.post('/assessments', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/tpg/assessments';

    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Create Assessment: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Create Assessment error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/assessments/details/:assessmentRefNo — Update/Void Assessment
router.post('/assessments/details/:assessmentRefNo', async (req, res) => {
  try {
    const { assessmentRefNo } = req.params;
    const body = req.body;
    const apiPath = `/tpg/assessments/details/${encodeURIComponent(assessmentRefNo)}`;

    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Update/Void Assessment: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Update/Void Assessment error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/assessments/search — Search Assessments
router.post('/assessments/search', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/tpg/assessments/search';

    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Search Assessments: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Search Assessments error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/assessments/details/:assessmentRefNo — View Assessment
router.get('/assessments/details/:assessmentRefNo', async (req, res) => {
  try {
    const { assessmentRefNo } = req.params;
    const apiPath = `/tpg/assessments/details/${encodeURIComponent(assessmentRefNo)}`;

    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`View Assessment: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('View Assessment error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/assessments/codes/idType — Assessment Code Lookup
router.get('/assessments/codes/idType', async (req, res) => {
  try {
    const apiPath = '/tpg/codes/assessments/idType';

    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log(`Assessment Code Lookup: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Assessment Code Lookup error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Skills Passport APIs
// ─────────────────────────────────────────────────────────────────

// GET /api/skills-passport/qualifications — Retrieve Qualification codes
// mTLS Certificate with OAuth fallback
router.get('/skills-passport/qualifications', async (req, res) => {
  try {
    const { level } = req.query;
    const apiPath = '/skillsPassport/codes/qualifications';
    const queryParams = level ? { level } : {};

    // Try certificate first
    console.log('Skills Passport Qualifications request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    console.log('Skills Passport Qualifications cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Passport Qualifications: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Skills Passport Qualifications: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Passport Qualifications error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// SEA (Skill Extraction API)
// ─────────────────────────────────────────────────────────────────

// POST /api/skill-extract — Skill Extraction
// mTLS Certificate with OAuth fallback
router.post('/skill-extract', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/skillExtract';

    // Try certificate first
    console.log('Skill Extraction request (cert):', apiPath);
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v1' });
    console.log('Skill Extraction cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skill Extraction: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Skill Extraction: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skill Extraction error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Skills Framework APIs
// ─────────────────────────────────────────────────────────────────

// GET /api/skills-framework/jobs — Retrieve Job Role Details
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/jobs', async (req, res) => {
  try {
    const { jobRoleId } = req.query;
    const apiPath = '/skillsFramework/jobRoles/details';
    const queryParams = {};
    if (jobRoleId) queryParams.jobRoleId = jobRoleId;

    console.log('Skills Framework Job Role Details request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    console.log('Skills Framework Job Role Details cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework Job Role Details: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework Job Role Details: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework Jobs error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/skills — Get Skills Details
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/skills', async (req, res) => {
  try {
    const { page, pageSize, sectorTitle, skillTitle, tscCode, skillType, sfwVersion } = req.query;
    const apiPath = '/sfw/skillsFramework/skills';
    const queryParams = {};
    if (page) queryParams.page = page;
    if (pageSize) queryParams.pageSize = pageSize;
    if (sectorTitle) queryParams.sectorTitle = sectorTitle;
    if (skillTitle) queryParams.skillTitle = skillTitle;
    if (tscCode) queryParams.tscCode = tscCode;
    if (skillType) queryParams.skillType = skillType;
    if (sfwVersion) queryParams.sfwVersion = sfwVersion;

    // Try certificate first
    console.log('Skills Framework Skills request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
    console.log('Skills Framework Skills cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework Skills: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed === 'string') {
        return res.status(500).json({ error: 'Non-JSON response from certificate API', details: parsed.substring(0, 200) });
      }
      return res.json(parsed);
    }

    // Certificate failed — fall back to OAuth
    console.log('Skills Framework Skills: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
    if (typeof oauthResult === 'string') {
      return res.status(500).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) });
    }
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework Skills error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/gsc-codes — Retrieve Generic Skills Competency (GSC) Code
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/gsc-codes', async (req, res) => {
  try {
    const { keyword } = req.query;
    const apiPath = '/skillsFramework/codes/skillsAndCompetencies/generic/autocomplete';
    const queryParams = {};
    if (keyword) queryParams.keyword = keyword;

    console.log('Skills Framework GSC Codes request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    console.log('Skills Framework GSC Codes cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework GSC Codes: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework GSC Codes: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework GSC Codes error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/ccs-details — Retrieve Critical Core Skills (CCS) Details
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/ccs-details', async (req, res) => {
  try {
    const { pageSize, page, retrieveType, lastUpdateDate, gscLevelCode } = req.query;
    const apiPath = '/skillsFramework/codes/skillsAndCompetencies/generic/details';
    const queryParams = {};
    if (pageSize) queryParams.pageSize = pageSize;
    if (page) queryParams.page = page;
    if (retrieveType) queryParams.retrieveType = retrieveType;
    if (lastUpdateDate) queryParams.lastUpdateDate = lastUpdateDate;
    if (gscLevelCode) queryParams.gscLevelCode = gscLevelCode;

    console.log('Skills Framework CCS Details request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    console.log('Skills Framework CCS Details cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework CCS Details: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework CCS Details: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework CCS Details error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/tsc-codes — Retrieve Technical Skills Competency (TSC) Code
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/tsc-codes', async (req, res) => {
  try {
    const { keyword } = req.query;
    const apiPath = '/skillsFramework/codes/skillsAndCompetencies/technical/autocomplete';
    const queryParams = {};
    if (keyword) queryParams.keyword = keyword;

    console.log('Skills Framework TSC Codes request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    console.log('Skills Framework TSC Codes cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework TSC Codes: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework TSC Codes: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework TSC Codes error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/tsc-codes-details — Retrieve TSC Code with Details
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/tsc-codes-details', async (req, res) => {
  try {
    const { keyword } = req.query;
    const apiPath = '/skillsFramework/codes/skillsAndCompetencies/technical/autocomplete/details';
    const queryParams = {};
    if (keyword) queryParams.keyword = keyword;

    console.log('Skills Framework TSC Codes Details request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    console.log('Skills Framework TSC Codes Details cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework TSC Codes Details: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework TSC Codes Details: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework TSC Codes Details error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/job-roles — Retrieve Job Roles
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/job-roles', async (req, res) => {
  try {
    const { pageSize, page, keyword, sector, qualification, fieldOfStudy, track, maxSalary, minSalary, sortby, sortDirection, type } = req.query;
    const apiPath = '/skillsFramework/jobRoles';
    const queryParams = {};
    if (pageSize) queryParams.pageSize = pageSize;
    if (page) queryParams.page = page;
    if (keyword) queryParams.keyword = keyword;
    if (sector) queryParams.sector = sector;
    if (qualification) queryParams.qualification = qualification;
    if (fieldOfStudy) queryParams.fieldOfStudy = fieldOfStudy;
    if (track) queryParams.track = track;
    if (maxSalary) queryParams.maxSalary = maxSalary;
    if (minSalary) queryParams.minSalary = minSalary;
    if (sortby) queryParams.sortby = sortby;
    if (sortDirection) queryParams.sortDirection = sortDirection;
    if (type) queryParams.type = type;

    console.log('Skills Framework Job Roles request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    console.log('Skills Framework Job Roles cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework Job Roles: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework Job Roles: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework Job Roles error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/tsc-details — Retrieve Technical Skills Competency (TSC) Details
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/tsc-details', async (req, res) => {
  try {
    const { pageSize, page, retrieveType, lastUpdateDate, tscLevelCode } = req.query;
    const apiPath = '/skillsFramework/codes/skillsAndCompetencies/technical/details';
    const queryParams = {};
    if (pageSize) queryParams.pageSize = pageSize;
    if (page) queryParams.page = page;
    if (retrieveType) queryParams.retrieveType = retrieveType;
    if (lastUpdateDate) queryParams.lastUpdateDate = lastUpdateDate;
    if (tscLevelCode) queryParams.tscLevelCode = tscLevelCode;

    console.log('Skills Framework TSC Details request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    console.log('Skills Framework TSC Details cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework TSC Details: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework TSC Details: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework TSC Details error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/job-role-profile — Retrieve Job Role Profile
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/job-role-profile', async (req, res) => {
  try {
    const { jobRoleId } = req.query;
    const apiPath = '/skillsFramework/jobRoles/profile';
    const queryParams = {};
    if (jobRoleId) queryParams.jobRoleId = jobRoleId;

    console.log('Skills Framework Job Role Profile request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    console.log('Skills Framework Job Role Profile cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework Job Role Profile: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework Job Role Profile: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework Job Role Profile error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/occupations — Retrieve List of Occupations
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/occupations', async (req, res) => {
  try {
    const { sectorId } = req.query;
    const apiPath = '/skillsFramework/occupations';
    const queryParams = {};
    if (sectorId) queryParams.sectorId = sectorId;

    console.log('Skills Framework Occupations request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    console.log('Skills Framework Occupations cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework Occupations: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework Occupations: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(500).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework Occupations error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/occupations/:occupationId/jobRoles — Retrieve Job Role Codes by Occupation ID
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/occupations/:occupationId/jobRoles', async (req, res) => {
  try {
    const { occupationId } = req.params;
    const apiPath = `/skillsFramework/${encodeURIComponent(occupationId)}/jobRoles`;

    console.log('Skills Framework Job Role Codes request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v1' });
    console.log('Skills Framework Job Role Codes cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework Job Role Codes: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    console.log('Skills Framework Job Role Codes: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework Job Role Codes error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// GET /api/skills-framework/sector-profile/:sectorId — Retrieve Sector Profile
// mTLS Certificate with OAuth fallback
router.get('/skills-framework/sector-profile/:sectorId', async (req, res) => {
  try {
    const { sectorId } = req.params;
    const apiPath = `/skillsFramework/sectors/${sectorId}`;

    console.log('Skills Framework Sector Profile request (cert):', apiPath);
    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v1' });
    console.log('Skills Framework Sector Profile cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skills Framework Sector Profile: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed === 'string') {
        return res.status(500).json({ error: 'Non-JSON response from certificate API', details: parsed.substring(0, 200) });
      }
      return res.json(parsed);
    }

    console.log('Skills Framework Sector Profile: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') {
      return res.status(500).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) });
    }
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skills Framework Sector Profile error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// POST /api/skill-search — Skill Search
// mTLS Certificate with OAuth fallback
router.post('/skill-search', async (req, res) => {
  try {
    const body = req.body;
    const apiPath = '/skillSearch';

    // Try certificate first
    console.log('Skill Search request (cert):', apiPath);
    const certResult = await certApiPost(apiPath, body, { apiVersion: 'v1' });
    console.log('Skill Search cert response status:', certResult.status);

    if (certResult.status >= 200 && certResult.status < 300) {
      console.log('Skill Search: certificate auth succeeded');
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      if (typeof parsed !== 'string') { return res.json(parsed); }
      console.log('Cert returned non-JSON (200) — falling back to OAuth');
    }

    // Certificate failed — fall back to OAuth
    console.log('Skill Search: certificate returned', certResult.status, '— falling back to OAuth');
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
    if (typeof oauthResult === 'string') { return res.status(502).json({ error: 'Non-JSON response from OAuth fallback', details: oauthResult.substring(0, 200) }); }
    return res.json(oauthResult);
  } catch (err) {
    console.error('Skill Search error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────────────────────────

// POST /api/tools/generate-cert — Generate self-signed certificate via OpenSSL
router.post('/tools/generate-cert', (req, res) => {
  const {
    commonName = 'localhost',
    organization = 'My Organization',
    country = 'SG',
    days = '3650',
    keySize = '4096',
  } = req.body;

  // Validate inputs — only allow safe characters
  const safePattern = /^[a-zA-Z0-9 ._\-]+$/;
  for (const [field, value] of Object.entries({ commonName, organization, country })) {
    if (!safePattern.test(value)) {
      return res.status(400).json({ error: `Invalid characters in ${field}` });
    }
  }
  if (!/^\d+$/.test(String(days)) || !/^\d+$/.test(String(keySize))) {
    return res.status(400).json({ error: 'days and keySize must be numeric' });
  }

  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-cert-'));
    const certPath = path.join(tmpDir, 'cert.pem');
    const keyPath = path.join(tmpDir, 'key.pem');

    const subject = `/C=${country}/O=${organization}/CN=${commonName}`;
    const cmd = `openssl req -x509 -newkey rsa:${keySize} -keyout "${keyPath}" -out "${certPath}" -days ${days} -nodes -subj "${subject}"`;

    execSync(cmd, { stdio: 'pipe', timeout: 30000 });

    const certPem = fs.readFileSync(certPath, 'utf8');
    const keyPem = fs.readFileSync(keyPath, 'utf8');

    res.json({
      cert: certPem,
      key: keyPem,
      command: `openssl req -x509 -newkey rsa:${keySize} -keyout key.pem -out cert.pem -days ${days} -nodes -subj "${subject}"`,
    });
  } catch (err) {
    console.error('Certificate generation error:', err.message);
    res.status(500).json({
      error: 'Failed to generate certificate',
      details: err.stderr ? err.stderr.toString() : err.message,
    });
  } finally {
    // Clean up temp files
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    }
  }
});

// POST /api/tools/generate-keypair — Generate RSA key pair and extract public key
router.post('/tools/generate-keypair', (req, res) => {
  const { keySize = '2048' } = req.body;

  if (!/^\d+$/.test(String(keySize))) {
    return res.status(400).json({ error: 'keySize must be numeric' });
  }

  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-keypair-'));
    const keyPath = path.join(tmpDir, 'key.pem');
    const pubPath = path.join(tmpDir, 'public.pem');

    // Generate RSA private key
    execSync(`openssl genrsa -out "${keyPath}" ${keySize}`, { stdio: 'pipe', timeout: 30000 });

    // Extract public key in PEM format
    execSync(`openssl rsa -in "${keyPath}" -outform PEM -pubout -out "${pubPath}"`, { stdio: 'pipe', timeout: 30000 });

    const privateKey = fs.readFileSync(keyPath, 'utf8');
    const publicKeyPem = fs.readFileSync(pubPath, 'utf8');

    // Strip PEM header/footer and newlines to get raw base64
    const publicKeyStripped = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\r?\n/g, '')
      .trim();

    res.json({
      privateKey,
      publicKeyPem,
      publicKeyStripped,
      commands: [
        `openssl genrsa -out key.pem ${keySize}`,
        'openssl rsa -in key.pem -outform PEM -pubout -out public.pem',
      ],
    });
  } catch (err) {
    console.error('Key pair generation error:', err.message);
    res.status(500).json({
      error: 'Failed to generate key pair',
      details: err.stderr ? err.stderr.toString() : err.message,
    });
  } finally {
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    }
  }
});

// POST /api/tools/generate-encryption-key — Generate random encryption key
router.post('/tools/generate-encryption-key', (req, res) => {
  const { bytes = '32' } = req.body;

  if (!/^\d+$/.test(String(bytes))) {
    return res.status(400).json({ error: 'bytes must be numeric' });
  }

  try {
    const output = execSync(`openssl rand -base64 ${bytes}`, { stdio: 'pipe', timeout: 10000 });
    const key = output.toString().trim();

    res.json({
      key,
      command: `openssl rand -base64 ${bytes}`,
    });
  } catch (err) {
    console.error('Encryption key generation error:', err.message);
    res.status(500).json({
      error: 'Failed to generate encryption key',
      details: err.stderr ? err.stderr.toString() : err.message,
    });
  }
});

module.exports = router;
