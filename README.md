# SSG API Portal

A React web app to explore the SSG-WSG (SkillsFuture Singapore) API. Look up course details by reference number, search courses by UEN and keyword, with OAuth 2.0 and mTLS certificate authentication via an Express backend proxy.

![SSG API Portal](ssg-api-portal.png)

## Architecture

```
Browser (React) → /api/courses/:refNo → Express Proxy → SSG API (public-api.ssg-wsg.sg)
                                             ↓
                                      OAuth Token Cache
                                 (client_credentials grant)
```

- **Frontend**: Vite + React + TypeScript
- **Backend**: Express (OAuth token management + mTLS certificate auth + API proxy)
- **APIs**: SSG-WSG Course Directory API v1.2 (OAuth) + Course Registry API v8.0 (mTLS)

## Features

- **Course Lookup** — Search by reference number (e.g. `SCN-198202248E-01-CRS-N-0027685`)
- **Course Search** — Search by UEN, keyword, date range with server-side and client-side filtering
- Option to include/exclude expired courses
- Displays course overview (title, objective, content, cost, duration)
- Training provider details (name, address, contact persons)
- Course runs table (registration dates, schedule, venue, vacancy)
- Metadata tags (mode of training, delivery method, sectors, job roles)

## Prerequisites

- Node.js 18+
- SSG Developer Portal account with OAuth credentials ([register here](https://developer.ssg-wsg.gov.sg))

## Setup

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your SSG credentials:
#   SSG_CLIENT_ID=your_client_id
#   SSG_CLIENT_SECRET=your_client_secret
```

## Development

```bash
npm run dev
```

Starts Express on http://localhost:3001 and Vite on http://localhost:5173.

## Production

```bash
npm run build
npm start
```

Builds the React app and serves everything from Express on port 3001.

## Project Structure

```
├── server/
│   ├── index.js       # Express entry point
│   ├── oauth.js       # OAuth token fetch + cache
│   └── proxy.js       # API proxy routes
└── client/src/
    ├── App.tsx         # Main app orchestrator
    ├── types/          # TypeScript interfaces
    ├── api/            # API client
    ├── hooks/          # React hooks
    └── components/     # UI components
```

## API Reference

This app proxies requests to the [SSG-WSG Course Directory API](https://developer.ssg-wsg.gov.sg/webapp/docs/product/6Gl44K5M46EuDgn7LCsAs2):

```
GET /courses/directory/{courseRefNo}?includeExpiredCourses=true
Headers: x-api-version: v1.2
```
