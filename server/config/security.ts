/**
 * Production security middleware configuration: CORS allowlist, Helmet (incl. a
 * CSP suited to the served SPA), and rate limiters.
 *
 * NOTE on rate limiting: `express-rate-limit`'s default store is in-memory and
 * therefore PER-INSTANCE. It is correct for a single instance but does NOT share
 * counters across a horizontally scaled deployment. Before running more than one
 * API instance, swap in a shared store (e.g. `rate-limit-redis`) — see
 * docs/cloud-deployment.md.
 */

import type { CorsOptions, CorsOptionsDelegate, CorsRequest } from 'cors'
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'
import helmet from 'helmet'
import type { RequestHandler } from 'express'

const LOCALHOST_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https?:\/\/\[::1\](:\d+)?$/i,
]

function isDevLike(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/** Parse the comma/semicolon/space-separated CORS_ALLOWED_ORIGINS allowlist. */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

export function isOriginAllowed(origin: string, allowlist: string[]): boolean {
  const normalized = origin.replace(/\/+$/, '')
  if (allowlist.includes(normalized)) return true
  // localhost is always permitted in non-production to keep dev frictionless.
  if (isDevLike() && LOCALHOST_PATTERNS.some((re) => re.test(normalized))) return true
  return false
}

/**
 * True when the browser `Origin` points at the request's own host — i.e. a
 * same-origin request. Browsers send an `Origin` header on every non-GET/HEAD
 * request (e.g. `fetch` POSTs) *even when it is same-origin*, so the presence of
 * an `Origin` header alone does NOT make a request cross-origin. In the
 * single-service Cloud Run topology the SPA and the `/api/*` routes share one
 * origin, so these same-origin POSTs must be allowed regardless of the
 * `CORS_ALLOWED_ORIGINS` allowlist (which only governs true cross-origin calls).
 */
export function isSameOriginRequest(origin: string, hostHeader: string | undefined): boolean {
  if (!hostHeader) return false
  // `Host` / `X-Forwarded-Host` may be a proxy-chained, comma-separated list.
  const requestHost = hostHeader.split(',')[0]?.trim()
  if (!requestHost) return false
  try {
    return new URL(origin).host === requestHost
  } catch {
    return false
  }
}

/**
 * Env-driven CORS delegate. Replaces the previous `cors({ origin: true })` which
 * reflected any origin. Requests are permitted when they are non-browser (no
 * `Origin` header), same-origin (the single-service topology), or match the
 * `CORS_ALLOWED_ORIGINS` allowlist (split deploys). All other cross-origin
 * browser requests are rejected.
 */
export function buildCorsDelegate(): CorsOptionsDelegate<CorsRequest> {
  const allowlist = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS)

  if (allowlist.length === 0 && !isDevLike()) {
    console.warn(
      '[cors] CORS_ALLOWED_ORIGINS is empty in production — cross-origin browser ' +
        'requests will be rejected. Same-origin requests (the single-service ' +
        'topology) are still allowed. Set it to your web origin(s) for split deploys.',
    )
  }

  return (req, callback) => {
    const origin = req.headers.origin
    const base: CorsOptions = { credentials: true }

    // No Origin header → same-origin navigation, curl, server-to-server, health
    // checks. These are not subject to the browser CORS allowlist.
    if (!origin) {
      callback(null, { ...base, origin: true })
      return
    }

    const forwardedHost = req.headers['x-forwarded-host']
    const hostHeader =
      (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ?? req.headers.host

    if (isSameOriginRequest(origin, hostHeader) || isOriginAllowed(origin, allowlist)) {
      callback(null, { ...base, origin: true })
      return
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`))
  }
}

/**
 * Helmet with a CSP appropriate for the bundled Vite SPA. `'unsafe-inline'` is
 * permitted for styles (Tailwind injects a small runtime style tag) but NOT for
 * scripts. `connect-src` includes the configured API base and Supabase so the
 * client can reach auth + storage. Tighten `connect-src` further per deployment.
 */
export function buildHelmet(): RequestHandler {
  const connectSrc = new Set<string>(["'self'"])
  const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim()
  if (supabaseUrl) {
    connectSrc.add(supabaseUrl)
    connectSrc.add(supabaseUrl.replace(/^http/i, 'ws'))
  }
  const apiBase = process.env.VITE_API_BASE_URL?.trim()
  if (apiBase) connectSrc.add(apiBase)
  for (const extra of parseAllowedOrigins(process.env.CSP_CONNECT_SRC_EXTRA)) {
    connectSrc.add(extra)
  }

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: Array.from(connectSrc),
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        // Allow web workers / blob URLs used by pdf.js and client-side parsing.
        workerSrc: ["'self'", 'blob:'],
      },
    },
    // The SPA + PDF tooling occasionally opens blob/data resources; keep COEP
    // off to avoid breaking those while retaining the rest of Helmet's defaults.
    crossOriginEmbedderPolicy: false,
  })
}

function envInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Global limiter applied to every /api route. Generous; a coarse abuse cap. */
export function buildGlobalLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: envInt('RATE_LIMIT_WINDOW_MS', 60_000),
    limit: envInt('RATE_LIMIT_GLOBAL_MAX', 300),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
  })
}

/**
 * Tight limiter for expensive / abuse-prone routes (AI generation, transcription,
 * auth-bearing credit mutations). Lower ceiling, same window.
 */
export function buildSensitiveLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: envInt('RATE_LIMIT_WINDOW_MS', 60_000),
    limit: envInt('RATE_LIMIT_SENSITIVE_MAX', 30),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded for this operation. Try again shortly.' },
  })
}
