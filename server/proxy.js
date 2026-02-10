const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
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

// OAuth helper for public APIs (public-api.ssg-wsg.sg)
async function ssgApiGet(endpoint, queryParams = {}) {
  const token = await getAccessToken();
  const baseUrl = process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';

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
      'x-api-version': 'v1.2',
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

// GET /api/courses/:refNo — OAuth (public-api.ssg-wsg.sg)
router.get('/courses/:refNo', async (req, res) => {
  try {
    const { refNo } = req.params;
    const includeExpired = req.query.includeExpired !== 'false';

    const data = await ssgApiGet(
      `/courses/directory/${encodeURIComponent(refNo)}`,
      { includeExpiredCourses: includeExpired }
    );

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

module.exports = router;
