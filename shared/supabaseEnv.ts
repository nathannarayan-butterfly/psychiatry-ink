/**
 * Shared Supabase env validation (Vite client + vite.config.ts startup).
 *
 * Vite load order (higher wins): .env.local > .env — never reads .env.example at runtime.
 * Server (dotenv): same order in server/index.ts — .env then .env.local with override.
 */

const PLACEHOLDER_URL_HOSTS = new Set([
  'your-project-id.supabase.co',
  'xxxxxxxx.supabase.co',
  'abcdefgh.supabase.co',
])

const PLACEHOLDER_KEY_PATTERNS = [
  /your[_-]?anon[_-]?key/i,
  /your[_-]?project/i,
  /your[_-]?key/i,
  /replace[_-]?me/i,
  /changeme/i,
  /insert[_-]?here/i,
  /^x{4,}$/i,
  /^\.{3,}$/,
  /^<.*>$/,
]

export function getUrlHostname(url: string | undefined): string | null {
  if (!url?.trim()) return null
  try {
    return new URL(url.trim()).hostname
  } catch {
    return null
  }
}

export function isPlaceholderUrl(url: string | undefined): boolean {
  const host = getUrlHostname(url)
  if (!host) return false
  return (
    PLACEHOLDER_URL_HOSTS.has(host) ||
    host.startsWith('your-') ||
    host.includes('your-project') ||
    host.includes('example')
  )
}

export function isPlaceholderKey(key: string | undefined): boolean {
  const trimmed = key?.trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()
  if (lower === 'your_anon_key' || lower === 'your-anon-key') return true
  return PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(trimmed))
}

export type SupabaseKeyKind =
  | 'jwt_anon'
  | 'jwt_service_role'
  | 'publishable'
  | 'secret'
  | 'unknown'
  | 'missing'

function decodeJwtRole(key: string): string | null {
  if (!key.startsWith('eyJ')) return null
  const parts = key.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as { role?: unknown }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

export function classifySupabaseKey(key: string | undefined): SupabaseKeyKind {
  const trimmed = key?.trim()
  if (!trimmed) return 'missing'
  if (trimmed.startsWith('sb_publishable_')) return 'publishable'
  if (trimmed.startsWith('sb_secret_')) return 'secret'
  if (trimmed.startsWith('eyJ')) {
    const role = decodeJwtRole(trimmed)
    if (role === 'service_role') return 'jwt_service_role'
    if (role === 'anon') return 'jwt_anon'
    return 'jwt_anon'
  }
  return 'unknown'
}

/** Safe key label for logs — never returns the full secret. */
export function describeKeyForLog(key: string | undefined): string {
  if (!key?.trim()) return '(nicht gesetzt)'
  const trimmed = key.trim()
  if (isPlaceholderKey(trimmed)) return '(Platzhalter)'
  if (trimmed.startsWith('eyJ')) return 'eyJ… (JWT)'
  if (trimmed.startsWith('sb_publishable_')) return 'sb_publishable_…'
  if (trimmed.startsWith('sb_secret_')) return 'sb_secret_… ⚠ nur Server'
  return '(unbekanntes Format)'
}

export function describeUrlForLog(url: string | undefined): string {
  if (!url?.trim()) return '(nicht gesetzt)'
  const host = getUrlHostname(url)
  if (!host) return '(ungültige URL)'
  if (isPlaceholderUrl(url)) return `${host} ⚠ Platzhalter`
  return host
}

export function keyExistsForLog(key: string | undefined): { present: boolean; prefix: string } {
  const trimmed = key?.trim()
  if (!trimmed || isPlaceholderKey(trimmed)) {
    return { present: false, prefix: '(missing)' }
  }
  if (trimmed.startsWith('eyJ')) return { present: true, prefix: 'eyJ' }
  if (trimmed.startsWith('sb_publishable_')) return { present: true, prefix: 'sb_publishable' }
  if (trimmed.startsWith('sb_secret_')) return { present: true, prefix: 'sb_secret' }
  return { present: true, prefix: 'unknown' }
}
