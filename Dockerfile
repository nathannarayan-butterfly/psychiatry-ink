# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Psychiatry.Ink — production image for Google Cloud Run (single-service).
#
# Builds the Vite client and runs the Express API (supabase-js data layer) in one
# container. The
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
RUN npm ci

# ---- Stage 2: build ------------------------------------------------------------
FROM deps AS builder

# Vite INLINES VITE_* vars at `vite build` time — they must be present in THIS stage,
# not merely at Cloud Run runtime. If they are missing the client bundle ships with an
# unconfigured Supabase client; the app then shows the login page (never an
# authenticated account — the dev no-auth entry is compile-time disabled in prod).
# The anon/publishable key is a public client credential and is safe to inline in the
# browser bundle. NEVER pass the service_role / secret key as a VITE_* build arg.
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_SUPABASE_PUBLISHABLE_KEY=""
ARG VITE_API_BASE_URL=""
# Canonical public app origin used as the Supabase `emailRedirectTo` for signup
# confirmation + resend emails (src/utils/authEmailRedirect.ts). Optional: when
# empty the client falls back to window.location.origin, which is already correct
# in production on app.psychiatry.ink. Set it to pin links to the app front door.
ARG VITE_PUBLIC_APP_URL=""
# Clinical Intelligence V1 client gate. Vite inlines this at build time, so it
# must be present in THIS stage (Cloud Run runtime env is too late for VITE_*).
# Defaults to "true" so production builds ship the CI section's AI run path
# enabled; the cost-bearing run is still independently gated server-side by
# CLINICAL_INTELLIGENCE_V1_ENABLED on the Cloud Run service.
ARG VITE_CLINICAL_INTELLIGENCE_V1_ENABLED="true"
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_APP_URL=$VITE_PUBLIC_APP_URL
ENV VITE_CLINICAL_INTELLIGENCE_V1_ENABLED=$VITE_CLINICAL_INTELLIGENCE_V1_ENABLED

COPY . .
RUN npm run build

# ---- Stage 3: production runtime -----------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Production deps include tsx (the `start` script runs server TypeScript via tsx)
# — a real `dependency`, so `npm ci --omit=dev` installs it.
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
# `tsx server/index.ts` resolves TS at runtime, and server modules import VALUES
# (not just types) from src/ (e.g. src/types/auditLog AUDIT_ACTIONS, zod schemas,
# src/data/org/*) and from scripts/lib/criteriaDraftGaps. Those trees MUST ship in
# the runtime image or `npm run start` throws ERR_MODULE_NOT_FOUND before binding.
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
# Diagnosis reference JSON consumed by the db:seed-* scripts (moved out of the
# removed prisma/ tree). Ships so seed/import ops can run inside the image.
COPY --from=builder /app/data ./data
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
