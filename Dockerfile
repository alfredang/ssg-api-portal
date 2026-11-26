# ── Stage 1: build the React/TypeScript client ───────────────────
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: runtime (Express server + built static client) ───────
FROM node:22-alpine AS runtime
WORKDIR /app

# openssl CLI is required by the keypair / encryption-key tools in server/proxy.js
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3001

# Install server (production) dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Server code + the client build output served as static files
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
COPY scripts/portal-data.cjs ./scripts/portal-data.cjs

# All portal data shares this folder. The deployment must reattach the SAME
# existing volume here on every update; VOLUME alone does not ensure reuse.
ENV DATA_DIR=/app/server/data
RUN mkdir -p /app/server/data
VOLUME ["/app/server/data"]

EXPOSE 3001
CMD ["node", "server/index.js"]
