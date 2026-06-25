import { createHash } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { decodeJwt } from 'jose'
import {
  classifySupabaseKey,
  isPlaceholderKey,
  isPlaceholderUrl,
} from '../../shared/supabaseEnv'
import { fetchWithTimeout } from '../utils/httpTimeout'

const LEGACY_ACCOUNT_ID = 'default'

/**
 * Short-TTL bearer-token validation cache.
 *
 * Validating every request against GoTrue (`/auth/v1/user`) is a per-request
 * network round-trip to Supabase on the hot path. We keep the SAME security
 * semantics — every token is still verified by GoTrue — but memoize the verified
 * result for a short window, and we locally pre-reject expired or wrong-kind
 * tokens before ever hitting the network. The cache TTL is bounded by the token's
 * own `exp`, so a revoked-by-expiry token can never be served stale past its
 * lifetime, and the window is short (default 60s) to limit the staleness from
 * server-side session revocation.
 *
 * Cache state is in-memory and per-instance; that is fine for token validation
 * (it is purely a latency optimization, never an authority).
 */
interface CachedAuth {
  userId: string | null
  expiresAt: number
}

const tokenCache = new Map<string, CachedAuth>()
const POSITIVE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS ?? 60_000)
const NEGATIVE_TTL_MS = Number(process.env.AUTH_NEG_CACHE_TTL_MS ?? 10_000)
const AUTH_VALIDATION_TIMEOUT_MS = Number(process.env.AUTH_VALIDATION_TIMEOUT_MS ?? 10_000)
const MAX_CACHE_ENTRIES = 5_000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function readCache(key: string): CachedAuth | null {
  const entry = tokenCache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    tokenCache.delete(key)
    return null
  }
  return entry
}

function writeCache(key: string, userId: string | null, ttlMs: number): void {
  if (ttlMs <= 0) return
  // Crude cap to bound memory; on overflow drop the whole map (cheap, rare).
  if (tokenCache.size >= MAX_CACHE_ENTRIES) tokenCache.clear()
  tokenCache.set(key, { userId, expiresAt: Date.now() + ttlMs })
}

/** Local exp (ms) from a JWT without verifying its signature, or null. */
function tokenExpiryMs(token: string): number | null {
  try {
    const exp = decodeJwt(token).exp
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/** Test helper — clear the in-memory token cache. */
export function __resetAuthCacheForTests(): void {
  tokenCache.clear()
}

export function resolveAccountId(req: Request): string {
  return req.authUserId ?? LEGACY_ACCOUNT_ID
}

let configWarningLogged = false

export function isServerAuthConfigured(): boolean {
  return resolveServerSupabaseEnv() !== null
}

function resolveServerSupabaseEnv(): { url: string; key: string } | null {
  const url =
    process.env.SUPABASE_URL?.trim() ??
    process.env.VITE_SUPABASE_URL?.trim() ??
    ''
  const key =
    process.env.SUPABASE_ANON_KEY?.trim() ??
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ??
    ''

  if (!url || !key) return null
  if (isPlaceholderUrl(url) || isPlaceholderKey(key)) return null

  const keyKind = classifySupabaseKey(key)
  if (keyKind === 'secret' || keyKind === 'jwt_service_role') return null

  return { url, key }
}

function logConfigWarningOnce(): void {
  if (configWarningLogged) return
  configWarningLogged = true

  const url =
    process.env.SUPABASE_URL?.trim() ?? process.env.VITE_SUPABASE_URL?.trim() ?? ''
  const key =
    process.env.SUPABASE_ANON_KEY?.trim() ?? process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!url && !key) {
    console.warn(
      '[auth] Supabase nicht konfiguriert — setzen Sie SUPABASE_URL + SUPABASE_ANON_KEY (oder VITE_* Fallback). Auth-Tokens werden nicht validiert.',
    )
    return
  }
  if (!url) {
    console.warn('[auth] SUPABASE_URL fehlt — Bearer-Token-Validierung deaktiviert.')
    return
  }
  if (!key) {
    console.warn('[auth] SUPABASE_ANON_KEY fehlt — Bearer-Token-Validierung deaktiviert.')
    return
  }
  if (isPlaceholderUrl(url)) {
    console.warn('[auth] SUPABASE_URL ist noch ein Platzhalter — Token-Validierung deaktiviert.')
    return
  }
  if (isPlaceholderKey(key)) {
    console.warn('[auth] SUPABASE_ANON_KEY ist noch ein Platzhalter — Token-Validierung deaktiviert.')
    return
  }
  const keyKind = classifySupabaseKey(key)
  if (keyKind === 'secret' || keyKind === 'jwt_service_role') {
    console.warn('[auth] Server-Key darf kein service_role/secret sein — nur anon/publishable.')
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    authUserId?: string
  }
}

/**
 * Validate a Supabase access token via the GoTrue REST endpoint.
 *
 * We intentionally avoid the full `supabase-js` client here: its constructor
 * eagerly initializes a Realtime WebSocket, which throws on Node versions
 * without a global WebSocket (e.g. Node 20) and would crash every
 * token-bearing request. A direct fetch is lighter and crash-free.
 */
async function fetchUserId(token: string): Promise<string | null> {
  // 1. Reject non-user credentials outright: a service_role JWT or an
  //    sb_secret_… key must never be accepted as a user session bearer.
  const kind = classifySupabaseKey(token)
  if (kind === 'jwt_service_role' || kind === 'secret') return null

  // 2. Local pre-checks (no network): drop tokens that are already expired.
  const expMs = tokenExpiryMs(token)
  if (expMs !== null && expMs <= Date.now()) return null

  // 3. Serve a fresh cached verification when available.
  const cacheKey = hashToken(token)
  const cached = readCache(cacheKey)
  if (cached) return cached.userId

  const env = resolveServerSupabaseEnv()
  if (!env) {
    logConfigWarningOnce()
    return null
  }

  // 4. Authoritative verification via GoTrue, bounded by a timeout.
  try {
    const response = await fetchWithTimeout(`${env.url.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.key,
      },
      timeoutMs: AUTH_VALIDATION_TIMEOUT_MS,
      label: 'Supabase token validation',
    })
    if (!response.ok) {
      writeCache(cacheKey, null, NEGATIVE_TTL_MS)
      return null
    }
    const user = (await response.json()) as { id?: unknown }
    const userId = typeof user.id === 'string' ? user.id : null
    // Positive TTL is bounded by the token's own remaining lifetime.
    const ttl = userId
      ? expMs
        ? Math.max(0, Math.min(POSITIVE_TTL_MS, expMs - Date.now()))
        : POSITIVE_TTL_MS
      : NEGATIVE_TTL_MS
    writeCache(cacheKey, userId, ttl)
    return userId
  } catch {
    // Network/timeout/parse failure → treat as unauthenticated (do NOT cache,
    // so a transient outage doesn't pin a negative result).
    return null
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = header.slice(7).trim()
  if (!token) {
    next()
    return
  }

  const userId = await fetchUserId(token)
  if (userId) req.authUserId = userId

  next()
}
