# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Psychiatry.Ink — production image (single-service topology).
#
# Builds the Vite client and runs the Express/Prisma API in one container. The
# API serves the built dist/ with SPA fallback, so same-origin /api/* works in
# production. For a split deploy, point VITE_API_BASE_URL at this service at
# BUILD time and host the client separately.
#
# The server runs TypeScript directly via `tsx` (no separate JS emit step), so
# the runtime image keeps the full dependency set plus the source tree.
# ─────────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build ----------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# OpenSSL is required by the Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install deps with the schema present so the `postinstall` prisma generate works.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Build the client. VITE_API_BASE_URL can be injected here for a split deploy;
# leave it unset for the default same-origin single-service topology.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY . .
RUN npm run build

# ---- Stage 2: runtime --------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy installed deps (incl. generated Prisma client + tsx + prisma CLI) and the
# source the server transpiles at runtime.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/src ./src
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

# Drop root.
USER node

ENV API_PORT=3001
ENV API_HOST=0.0.0.0
EXPOSE 3001

# Liveness probe hits the cheap health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
