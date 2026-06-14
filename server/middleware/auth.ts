import type { Request, Response, NextFunction } from 'express'
import {
  classifySupabaseKey,
  isPlaceholderKey,
  isPlaceholderUrl,
} from '../../shared/supabaseEnv'

const LEGACY_ACCOUNT_ID = 'default'

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
  const env = resolveServerSupabaseEnv()
  if (!env) {
    logConfigWarningOnce()
    return null
  }

  try {
    const response = await fetch(`${env.url.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.key,
      },
    })
    if (!response.ok) return null
    const user = (await response.json()) as { id?: unknown }
    return typeof user.id === 'string' ? user.id : null
  } catch {
    // Network/parse failure → fall back to legacy default account.
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
