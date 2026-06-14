import type { Request } from 'express'
import {
  classifySupabaseKey,
  isPlaceholderKey,
  isPlaceholderUrl,
} from '../../shared/supabaseEnv'

export interface AuthUser {
  id: string
  email: string | null
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

export async function fetchAuthUserFromToken(token: string): Promise<AuthUser | null> {
  const env = resolveServerSupabaseEnv()
  if (!env) return null

  try {
    const response = await fetch(`${env.url.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.key,
      },
    })
    if (!response.ok) return null
    const user = (await response.json()) as { id?: unknown; email?: unknown }
    if (typeof user.id !== 'string') return null
    return {
      id: user.id,
      email: typeof user.email === 'string' ? user.email : null,
    }
  } catch {
    return null
  }
}

export async function resolveAuthUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  if (!token) return null
  return fetchAuthUserFromToken(token)
}
