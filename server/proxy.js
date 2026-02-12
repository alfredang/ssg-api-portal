const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { getAccessToken } = require('./oauth');

const router = express.Router();

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

// mTLS credentials for certificate-authenticated APIs (api.ssg-wsg.sg)
// Support base64-encoded certs via env vars (for Vercel/serverless) or file paths (for local dev)
let cert, key;
if (process.env.CERT_PEM_BASE64 && process.env.CERT_KEY_PEM_BASE64) {
  cert = Buffer.from(process.env.CERT_PEM_BASE64, 'base64');
  key = Buffer.from(process.env.CERT_KEY_PEM_BASE64, 'base64');
} else {
  const certPath = process.env.CERT_PATH || './server/.cert/skilleto_tertiary_cert_v3.pem';
  const keyPath = process.env.CERT_KEY_PATH || './server/.cert/skilleto_private_key_v3.pem';
  cert = fs.readFileSync(path.resolve(certPath));
  key = fs.readFileSync(path.resolve(keyPath));
}
const certApiBase = process.env.SSG_CERT_API_BASE_URL || 'https://api.ssg-wsg.sg';

// AES-256-ECB encryption/decryption for cert-based API payloads
const encryptionKey = process.env.CERT_ENCRYPTION_KEY
  ? Buffer.from(process.env.CERT_ENCRYPTION_KEY, 'base64')
  : null;

function aesEncrypt(plaintext) {
  if (!encryptionKey) throw new Error('CERT_ENCRYPTION_KEY not configured');
  const cipher = crypto.createCipheriv('aes-256-ecb', encryptionKey, null);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function aesDecrypt(ciphertext) {
  if (!encryptionKey) throw new Error('CERT_ENCRYPTION_KEY not configured');
  const decipher = crypto.createDecipheriv('aes-256-ecb', encryptionKey, null);
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// mTLS GET helper — returns { status, body } or throws on network error
function certApiGet(apiPath, queryParams = {}, { apiVersion = 'v1.2', headers: extraHeaders = {} } = {}) {
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
      cert,
      key,
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

  const data = await response.json();

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
  const url = new URL(apiPath, certApiBase);
  const requestBody = JSON.stringify(jsonBody);

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      cert,
      key,
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

  const data = await response.json();

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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Trainers: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v2.0' });
    res.json(data);
  } catch (err) {
    console.error('Trainers error:', err.message);
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
      return res.json(data);
    }

    // Certificate failed — fall back to OAuth
    console.log('Update/Delete trainer: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiPost(apiPath, body, { apiVersion: 'v2.0' });
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

    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        cert,
        key,
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Session attendance: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.5' });
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Course sessions: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.5' });
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
    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: certUrl.hostname,
        port: 443,
        path: certUrl.pathname + certUrl.search,
        method: 'POST',
        cert,
        key,
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
      return res.json(data);
    }

    // Certificate failed — fall back to OAuth
    console.log('Publish course run: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiPost(`${apiPath}?${new URLSearchParams(queryParams).toString()}`, body, { apiVersion: 'v1.2' });
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
    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: certUrl.hostname,
        port: 443,
        path: certUrl.pathname + certUrl.search,
        method: 'POST',
        cert,
        key,
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
      return res.json(data);
    }

    // Certificate failed — fall back to OAuth
    console.log('Edit course run: certificate returned', result.status, '— falling back to OAuth');
    const oauthPath = `${apiPath}?${new URLSearchParams(queryParams).toString()}`;
    const data = await ssgApiPost(oauthPath, body, { apiVersion: 'v1.2' });
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Course runs by ref: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Course run by ID: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.0' });
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Popular courses: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams, { apiVersion: 'v1.1' });
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Course quality: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, {}, { apiVersion: 'v2.0' });
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Course outcome: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, {}, { apiVersion: 'v2.0' });
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
      return res.json(JSON.parse(result.body));
    }

    // Certificate failed — fall back to OAuth
    console.log('Course lookup: certificate returned', result.status, '— falling back to OAuth');
    const data = await ssgApiGet(apiPath, queryParams);
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

    const result = await new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        cert,
        key,
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
      cert,
      key,
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
      return res.json(parsed);
    }

    console.log(`Grant Calculator Baseline: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
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
      return res.json(parsed);
    }

    console.log(`Grant Calculator Personalised: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
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
      return res.json(parsed);
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

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: `SSG API error: ${response.status}`,
        details: data,
      });
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
      return res.json(parsed);
    }

    console.log(`View Grant: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
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
      return res.json(parsed);
    }

    console.log(`Grants Code Lookup: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
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
      return res.json(parsed);
    }

    console.log(`SF Credit View Claim: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiGet(apiPath, { nric }, { apiVersion: 'v2' });
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
      return res.json(parsed);
    }

    console.log(`SF Credit Cancel Claim: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
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
      return res.json(parsed);
    }

    console.log(`SF Credit Upload Docs: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
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
      return res.json(parsed);
    }

    console.log(`SF Credit Encrypt Request: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
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
      return res.json(parsed);
    }

    console.log(`SF Credit Decrypt Request: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v2' });
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
      return res.json(parsed);
    }

    console.log(`Create Enrolment: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
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
      return res.json(parsed);
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

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: `SSG API error: ${response.status}`,
        details: data,
      });
    }
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
      return res.json(parsed);
    }

    console.log(`Search Enrolments: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
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
  try {
    const { enrolmentRefNo } = req.params;
    const apiPath = `/tpg/enrolments/details/${encodeURIComponent(enrolmentRefNo)}`;

    // Try certificate first
    const certResult = await certApiGet(apiPath, {}, { apiVersion: 'v3.0' });
    if (certResult.status >= 200 && certResult.status < 300) {
      let parsed;
      try { parsed = JSON.parse(certResult.body); } catch { parsed = certResult.body; }
      return res.json(parsed);
    }

    console.log(`View Enrolment: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v3.0' });
    return res.json(oauthResult);
  } catch (err) {
    console.error('View Enrolment error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
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
      return res.json(parsed);
    }

    console.log(`Fee Collection: certificate returned ${certResult.status} — falling back to OAuth`);

    // Fall back to OAuth
    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v3.0' });
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
      return res.json(parsed);
    }

    console.log(`Enrolment Code Lookup: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
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
      return res.json(parsed);
    }

    console.log(`Create Assessment: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
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
      return res.json(parsed);
    }

    console.log(`Update/Void Assessment: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
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
      return res.json(parsed);
    }

    console.log(`Search Assessments: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiPost(apiPath, body, { apiVersion: 'v1' });
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
      return res.json(parsed);
    }

    console.log(`View Assessment: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
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
      return res.json(parsed);
    }

    console.log(`Assessment Code Lookup: certificate returned ${certResult.status} — falling back to OAuth`);

    const oauthResult = await ssgApiGet(apiPath, {}, { apiVersion: 'v1' });
    return res.json(oauthResult);
  } catch (err) {
    console.error('Assessment Code Lookup error:', err.message);
    res.status(err.status || 500).json({
      error: err.message,
      details: err.body || null,
    });
  }
});

module.exports = router;
