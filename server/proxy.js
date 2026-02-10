const express = require('express');
const { getAccessToken } = require('./oauth');

const router = express.Router();

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

// GET /api/courses/:refNo
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

module.exports = router;
