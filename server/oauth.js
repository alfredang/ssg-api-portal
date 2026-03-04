'use strict';
const https = require('https');

let cachedToken = null;
let tokenExpiresAt = 0;

// Placeholder patterns — if the env var matches these, credentials aren't set.
const PLACEHOLDER_PATTERNS = ['your_client_id', 'your_client_secret', 'your-client', 'placeholder'];

function isPlaceholder(value) {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some(p => value.toLowerCase().includes(p));
}

// Log a startup warning if OAuth credentials are missing or placeholder.
function checkOAuthCredentials() {
  const clientId = process.env.SSG_CLIENT_ID;
  const clientSecret = process.env.SSG_CLIENT_SECRET;
  if (!clientId || !clientSecret || isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    console.warn('⚠️  SSG_CLIENT_ID / SSG_CLIENT_SECRET are not set or are placeholder values.');
    console.warn('   All "Certificate + OAuth" endpoints will fail with 403 until real credentials are set.');
    console.warn('   Get your credentials from the SSG Developer Portal and set them in .env:');
    console.warn('     SSG_CLIENT_ID=<your real client ID>');
    console.warn('     SSG_CLIENT_SECRET=<your real client secret>');
  } else {
    console.log('✅ SSG_CLIENT_ID / SSG_CLIENT_SECRET are set.');
  }
}

// Export the checker so proxy.js can call it at startup.
checkOAuthCredentials();

/**
 * Fetch an OAuth access token from SSG's /dp-oauth/oauth/token endpoint.
 * Sends the active mTLS client certificate alongside the Basic auth credentials,
 * since SSG's auth gateway validates both.
 * 
 * The active certificate is read lazily at call time (not at module load) so it
 * is always current even if the user switches certs.
 */
async function getAccessToken(certBundle) {
  // Return cached token if still valid (60s buffer before expiry)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.SSG_CLIENT_ID;
  const clientSecret = process.env.SSG_CLIENT_SECRET;

  if (!clientId || !clientSecret || isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    throw new Error(
      'OAuth credentials not configured. Set SSG_CLIENT_ID and SSG_CLIENT_SECRET in .env with real values from the SSG Developer Portal. ' +
      'Placeholder values ("your_client_id_here" etc.) are not accepted.'
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const baseUrl = process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';
  const tokenUrl = new URL('/dp-oauth/oauth/token', baseUrl);
  const body = 'grant_type=client_credentials';

  // Use https.request so we can attach the mTLS client certificate.
  // SSG's API gateway may require the cert to match the registered client.
  const requestOptions = {
    hostname: tokenUrl.hostname,
    port: 443,
    path: tokenUrl.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  // Attach the mTLS cert if one is available (cert bundle passed from proxy)
  if (certBundle && certBundle.cert && certBundle.key) {
    requestOptions.cert = certBundle.cert;
    requestOptions.key = certBundle.key;
  }

  const text = await new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  if (text.statusCode !== 200) {
    throw new Error(
      `OAuth token request failed (${text.statusCode}): ${text.body}\n` +
      'Check that SSG_CLIENT_ID and SSG_CLIENT_SECRET in .env match the credentials registered in the SSG Developer Portal.'
    );
  }

  let data;
  try {
    data = JSON.parse(text.body);
  } catch {
    throw new Error(`OAuth token endpoint returned non-JSON: ${text.body.substring(0, 200)}`);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  console.log('OAuth token fetched, expires in', data.expires_in, 'seconds');
  return cachedToken;
}

// Invalidate cached token (call this if a 401 is received from the API)
function invalidateToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

module.exports = { getAccessToken, invalidateToken, checkOAuthCredentials };
