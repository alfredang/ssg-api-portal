# CLAUDE.md — Project Conventions for SSG API Portal

## API URL Policy

- **Always use production URLs** for all API endpoints:
  - Certificate (mTLS): `https://api.ssg-wsg.sg`
  - OAuth: `https://public-api.ssg-wsg.sg`
- **Never use mock URLs** (`mock-api.ssg-wsg.sg`, `mock-public-api.ssg-wsg.sg`, or any mock/sandbox URL), even if the example or curl command provided by the user references a mock URL. Always replace with the corresponding production URL.

## Authentication Method Priority

- **Certificate (mTLS) is always the default** authentication method. Every new API route must try the certificate method first.
- **Fall back to OAuth** (Bearer token via `public-api.ssg-wsg.sg`) only when the certificate method returns a non-2xx status code.
- Use the existing helper functions:
  - `certApiGet` / `certApiPost` for certificate (mTLS) requests
  - `ssgApiGet` / `ssgApiPost` for OAuth fallback requests

## Error Handling

- When an error occurs, **show the error code from both the certificate method and the OAuth method** so the developer can see which auth methods were attempted and what each returned.
- Log the certificate response status before falling back to OAuth (e.g., `console.log('... certificate returned', result.status, '— falling back to OAuth')`).
- Return the final error with status code and response body details to the client.

## Known API Issues

The following issues have been encountered when calling SSG production APIs. This section serves as a reference for developers troubleshooting API errors.

### Retrieve Trainer Details

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/trainingProviders/{uen}/trainers` | v2.0 | **403** | `Access to this API has been disallowed` |
| OAuth | `GET public-api.ssg-wsg.sg/trainingProviders/{uen}/trainers` | v2.0 | **403** | `Access to this API has been disallowed` |

### Update/Delete Trainer

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `POST api.ssg-wsg.sg/trainingProviders/{uen}/trainers/{trainerId}` | v2.0 | **400** | `Unable to perform decryption due invalid request` |
| OAuth | `POST public-api.ssg-wsg.sg/trainingProviders/{uen}/trainers/{trainerId}` | v2.0 | **403** | `Access to this API has been disallowed` |

### Retrieve Popular Courses

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/directory/popular` | v1.1 | **403** | `Api Version has expired` |
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/directory/popular` | v2.0 | **403** | `Access to this API has been disallowed` |
| OAuth | `GET public-api.ssg-wsg.sg/courses/directory/popular` | v1.1 | **403** | `Api Version has expired` |

### Retrieve Course Quality

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/directory/{refNo}/quality` | v2.0 | **403** | `Access to this API has been disallowed` |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/directory/{refNo}/quality` | v2.0 | Falls back — response varies |

### Retrieve Course Outcome

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/directory/{refNo}/outcome` | v2.0 | **403** | `Access to this API has been disallowed` |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/directory/{refNo}/outcome` | v2.0 | Falls back — response varies |

### Retrieve Course Sessions

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/runs/{runId}/sessions` | v1.5 | **403** | `Access to this API has been disallowed` |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/runs/{runId}/sessions` | v1.5 | Falls back — response varies |

### Retrieve Session Attendance

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/runs/{runId}/sessions/attendance` | v1.5 | **403** | `Access to this API has been disallowed` |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/runs/{runId}/sessions/attendance` | v1.5 | Falls back — response varies |

### Upload Session Attendance

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) + AES | `POST api.ssg-wsg.sg/courses/runs/{runId}/sessions/attendance` | v1.5 | Varies | No OAuth fallback — cert + AES only |

### Course Lookup by Ref No

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/directory/{refNo}` | v1.2 | **403** | `Access to this API has been disallowed` |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/directory/{refNo}` | v1.2 | **200** | Works via OAuth |

### Course Search (TPG Registry)

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `POST api.ssg-wsg.sg/tpg/courses/registry/search` | v8.0 | **200** | Works via certificate |

### Course Details (TPG Registry)

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/tpg/courses/registry/details/{refNo}` | v8.0 | **200** | Works via certificate |

### Retrieve Course Quality (Updated 2026-02-13)

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/directory/{refNo}/quality` | v2.0 | **403** | Access disallowed |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/directory/{refNo}/quality` | v2.0 | **200** | Works via OAuth fallback |

### Retrieve Course Outcome (Updated 2026-02-13)

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/directory/{refNo}/outcome` | v2.0 | **403** | Access disallowed |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/directory/{refNo}/outcome` | v2.0 | **200** | Works via OAuth fallback |

### Retrieve Course Runs by Reference Number

| Method | URL | API Version | Status | Error Message |
|--------|-----|-------------|--------|---------------|
| Certificate (mTLS) | `GET api.ssg-wsg.sg/courses/courseRuns/reference` | v1.0 | **403** | Access to this API has been disallowed |
| OAuth (fallback) | `GET public-api.ssg-wsg.sg/courses/courseRuns/reference` | v1.0 | **403** | Access to this API has been disallowed |

### Common Error Codes

| Code | Meaning | Likely Cause |
|------|---------|--------------|
| **400** | Bad Request | Malformed payload; cert API may expect AES-encrypted body |
| **403** | Forbidden | Credentials lack permission for this endpoint, or API version expired |
| **404** | Not Found | Endpoint path incorrect or resource does not exist |
| **500** | Internal Server Error | SSG server-side issue or unexpected request format |

## Curl Test Commands (via local proxy)

Test these against `http://localhost:3001/api/` when the server is running.

```bash
# Course Search (TPG Registry) — 200 ✅
curl -s -X POST http://localhost:3001/api/courses/search \
  -H "Content-Type: application/json" \
  -d '{"uen":"T08GB0032G","keyword":"","page":0,"pageSize":1,"details":"FULL","sortBy":{"field":"updatedDate","order":"desc"},"course":{"meta":{"updatedDate":{"from":"2019-01-01","to":"2026-02-13"}}}}'

# Course Lookup by Ref No — 200 ✅ (OAuth fallback)
curl -s "http://localhost:3001/api/courses/TGS-2020001685"

# Course Quality — 200 ✅ (OAuth fallback)
curl -s "http://localhost:3001/api/courses/TGS-2020001685/quality"

# Course Outcome — 200 ✅ (OAuth fallback)
curl -s "http://localhost:3001/api/courses/TGS-2020001685/outcome"

# Trainer Details — 403 ❌
curl -s "http://localhost:3001/api/training-providers/T08GB0032G/trainers?pageSize=5&page=0"

# Popular Courses — 403 ❌ (API version expired)
curl -s "http://localhost:3001/api/courses/popular?pageSize=5&page=0"

# Course Sessions — 403 ❌
curl -s "http://localhost:3001/api/courses/runs/12345/sessions?uen=T08GB0032G&courseReferenceNumber=TGS-2020001685"

# Session Attendance — 403 ❌
curl -s "http://localhost:3001/api/courses/runs/12345/sessions/attendance?uen=T08GB0032G&courseReferenceNumber=TGS-2020001685"

# Course Runs by Ref No — 403 ❌
curl -s "http://localhost:3001/api/courses/courseRuns/reference?courseReferenceNumber=TGS-2020001685&uen=T08GB0032G&pageSize=5&page=0"
```
