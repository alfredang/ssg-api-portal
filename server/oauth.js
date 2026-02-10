let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  // Return cached token if still valid (60s buffer before expiry)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.SSG_CLIENT_ID;
  const clientSecret = process.env.SSG_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SSG_CLIENT_ID and SSG_CLIENT_SECRET must be set in .env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const baseUrl = process.env.SSG_API_BASE_URL || 'https://public-api.ssg-wsg.sg';

  const response = await fetch(`${baseUrl}/dp-oauth/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  console.log('OAuth token fetched, expires in', data.expires_in, 'seconds');
  return cachedToken;
}

module.exports = { getAccessToken };
