<div align="center">

# SSG API Portal

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://ssg-api-portal.vercel.app)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

**A developer tool for exploring SkillsFuture Singapore (SSG-WSG) APIs**

[Live Demo](https://ssg-api-portal.vercel.app) · [Report Bug](https://github.com/alfredang/ssg-api-portal/issues) · [Request Feature](https://github.com/alfredang/ssg-api-portal/issues)

</div>

## Screenshot

![SSG API Portal](ssg-api-portal.png)

## About

SSG API Portal is a React web app for exploring the SSG-WSG (SkillsFuture Singapore) APIs. It provides a clean interface for looking up course details by reference number, searching courses by UEN and keyword, and viewing training provider information — all powered by OAuth 2.0 and mTLS certificate authentication via an Express backend proxy.

### Key Features

| Feature | Description |
|---------|-------------|
| **Course Lookup** | Search by course reference number (e.g. `SCN-198202248E-01-CRS-N-0027685`) |
| **Course Search** | Search by UEN, keyword, and date range with server-side and client-side filtering |
| **Course Details** | View course overview, objectives, content, cost, and duration |
| **Training Providers** | View provider name, address, and contact persons |
| **Course Runs** | Browse registration dates, schedules, venues, and vacancy info |
| **Metadata** | Explore mode of training, delivery method, sectors, and job roles |
| **Dual Auth** | OAuth 2.0 for public APIs + mTLS certificates for registry APIs |

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7 |
| **Backend** | Express 5, Node.js 22 |
| **Authentication** | OAuth 2.0 (client credentials) + mTLS (client certificates) |
| **APIs** | SSG-WSG Course Directory API v1.2 + Course Registry API v8.0 |
| **Deployment** | Vercel (serverless functions + static hosting) |
| **HTTP Client** | Axios (frontend), native `https` (backend mTLS) |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (React)                          │
│                     Vite + TypeScript SPA                       │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                    /api/courses/*
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                     Express Proxy Server                         │
│                                                                  │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐ │
│  │   OAuth Module       │    │   mTLS Module                    │ │
│  │   (client_credentials│    │   (client certificate + key)     │ │
│  │    grant + cache)    │    │                                  │ │
│  └──────────┬──────────┘    └──────────────┬───────────────────┘ │
└─────────────┼──────────────────────────────┼─────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────┐  ┌──────────────────────────────────┐
│  public-api.ssg-wsg.sg  │  │       api.ssg-wsg.sg             │
│  Course Directory v1.2  │  │  Course Registry/Search v8.0     │
│  (OAuth Bearer Token)   │  │  (mTLS Certificate Auth)         │
└─────────────────────────┘  └──────────────────────────────────┘
```

## Project Structure

```
ssg-api-portal/
├── api/
│   └── index.js              # Vercel serverless entry point
├── server/
│   ├── index.js              # Express app (entry point + export)
│   ├── oauth.js              # OAuth token fetch + cache
│   └── proxy.js              # API proxy routes (OAuth + mTLS)
├── client/
│   ├── index.html            # HTML entry point
│   ├── vite.config.ts        # Vite configuration
│   └── src/
│       ├── App.tsx           # Main app orchestrator
│       ├── App.css           # Application styles
│       ├── api/
│       │   └── courseApi.ts  # API client functions
│       ├── components/
│       │   ├── SearchForm.tsx         # Course lookup form
│       │   ├── CourseSearchForm.tsx    # Course search form
│       │   ├── CourseOverview.tsx      # Course details display
│       │   ├── CourseMetadata.tsx      # Metadata tags
│       │   ├── CourseRunsTable.tsx     # Course runs table
│       │   └── TrainingProviderCard.tsx # Provider details
│       ├── hooks/
│       │   └── useApi.ts    # Generic API hook
│       └── types/
│           └── course.ts    # TypeScript interfaces
├── vercel.json               # Vercel deployment config
├── package.json              # Root dependencies
└── .env.example              # Environment variable template
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- SSG Developer Portal account with OAuth credentials ([register here](https://developer.ssg-wsg.gov.sg))
- mTLS client certificate and private key (for Course Search API)

### Installation

```bash
# Clone the repository
git clone https://github.com/alfredang/ssg-api-portal.git
cd ssg-api-portal

# Install dependencies
npm install
cd client && npm install && cd ..

# Configure environment
cp .env.example .env
```

Edit `.env` with your SSG credentials:

```env
# OAuth Authentication (public-api.ssg-wsg.sg)
SSG_API_BASE_URL=https://public-api.ssg-wsg.sg
SSG_CLIENT_ID=your_client_id
SSG_CLIENT_SECRET=your_client_secret

# mTLS Authentication (api.ssg-wsg.sg)
SSG_CERT_API_BASE_URL=https://api.ssg-wsg.sg
CERT_PATH=./server/.cert/your_cert.pem
CERT_KEY_PATH=./server/.cert/your_key.pem
```

### Running Locally

```bash
npm run dev
```

Starts Express on http://localhost:3001 and Vite on http://localhost:5173.

### Production Build

```bash
npm run build
npm start
```

Builds the React app and serves everything from Express on port 3001.

## Deployment

### Vercel

The app is configured for Vercel with serverless functions. The Express API runs as a serverless function and the React SPA is served as static files.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Required environment variables on Vercel:**

| Variable | Description |
|----------|-------------|
| `SSG_CLIENT_ID` | OAuth client ID |
| `SSG_CLIENT_SECRET` | OAuth client secret |
| `SSG_API_BASE_URL` | Public API base URL |
| `SSG_CERT_API_BASE_URL` | Certificate API base URL |
| `CERT_PEM_BASE64` | Base64-encoded client certificate |
| `CERT_KEY_PEM_BASE64` | Base64-encoded private key |
| `CERT_ENCRYPTION_KEY` | AES-256 encryption key |

## API Reference

This app proxies requests to two SSG-WSG APIs:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/courses/:refNo` | GET | OAuth | Lookup course by reference number |
| `/api/courses/details/:refNo` | GET | mTLS | Get detailed course information |
| `/api/courses/search` | POST | mTLS | Search courses by UEN, keyword, date range |

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Developed By

**[Tertiary Infotech Pte Ltd](https://tertiaryinfotech.com)**

## Acknowledgements

- [SkillsFuture Singapore (SSG-WSG)](https://developer.ssg-wsg.gov.sg) for the API platform
- [React](https://react.dev/) + [Vite](https://vite.dev/) for the frontend tooling
- [Express](https://expressjs.com/) for the backend framework
- [Vercel](https://vercel.com/) for hosting and deployment

---

<div align="center">

If you find this project useful, please give it a star!

</div>
