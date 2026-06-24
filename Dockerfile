# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Psychiatry.Ink — production image for Google Cloud Run (single-service).
#
# Builds the Vite client and runs the Express/Prisma API in one container. The
# API serves dist/ with SPA fallback so same-origin /api/* works in production.
# Cloud Run injects PORT (default 8080); the server binds API_HOST=0.0.0.0.
#
# Runtime uses `tsx` to execute server TypeScript directly (see npm run start).
# ─────────────────────────────────────────────────────────────────────────────

# ---- Stage 1: dependencies ---------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Stage 2: build ------------------------------------------------------------
FROM deps AS builder

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Stage 3: production runtime -----------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

# Production deps include tsx (start script) and the prisma CLI (entrypoint
# `migrate deploy`) — both are real `dependencies`, so `npm ci --omit=dev`
# installs them. (`npm install --omit=dev tsx prisma` does NOT install dev-listed
# packages, which previously left tsx absent and broke `npm run start`.)
RUN npm ci --omit=dev \
    && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
# `tsx server/index.ts` resolves TS at runtime, and server modules import VALUES
# (not just types) from src/ (e.g. src/types/auditLog AUDIT_ACTIONS, zod schemas,
# src/data/org/*) and from scripts/lib/criteriaDraftGaps. Those trees MUST ship in
# the runtime image or `npm run start` throws ERR_MODULE_NOT_FOUND before binding.
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

USER node

ENV PORT=8080
ENV API_HOST=0.0.0.0
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
