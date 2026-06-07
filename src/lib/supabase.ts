import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  classifySupabaseKey,
  describeKeyForLog,
  getUrlHostname,
  isPlaceholderKey,
  isPlaceholderUrl,
  keyExistsForLog,
  type SupabaseKeyKind,
} from '../../shared/supabaseEnv'

/**
 * Browser Supabase client — reads ONLY Vite-injected vars (never .env.example).
 *
 * Vite precedence: .env.local overrides .env for the same key.
 * Put real credentials in .env.local, or keep placeholders only in .env.example.
 * Restart `npm run dev` after env changes.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
// Accept both VITE_SUPABASE_ANON_KEY (canonical) and VITE_SUPABASE_PUBLISHABLE_KEY (alias).
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()) ??
  ''

export type { SupabaseKeyKind }

export interface SupabaseEnvDiagnostics {
  urlHost: string | null
  urlIsPlaceholder: boolean
  keyKind: SupabaseKeyKind
  keyPresent: boolean
  keyPrefix: string
}

export function getSupabaseEnvDiagnostics(): SupabaseEnvDiagnostics {
  const urlHost = getUrlHostname(url)
  const keyInfo = keyExistsForLog(anonKey)

  return {
    urlHost,
    urlIsPlaceholder: isPlaceholderUrl(url),
    keyKind: classifySupabaseKey(anonKey),
    keyPresent: keyInfo.present,
    keyPrefix: keyInfo.prefix,
  }
}

function formatEnvHint(): string {
  return 'Prüfen Sie .env und .env.local — .env.local überschreibt .env. Nach Änderungen: Dev-Server neu starten (npm run dev).'
}

function formatDiagnosticsHint(): string {
  const d = getSupabaseEnvDiagnostics()
  const parts: string[] = []

  if (d.urlHost) {
    parts.push(`Geladene URL: ${d.urlHost}${d.urlIsPlaceholder ? ' (Platzhalter)' : ''}`)
  } else {
    parts.push('Geladene URL: fehlt')
  }

  if (!d.keyPresent) {
    parts.push('Geladener Key (VITE_SUPABASE_ANON_KEY): fehlt')
  } else {
    parts.push(`Geladener Key: ${describeKeyForLog(anonKey)}`)
  }

  return parts.join(' · ')
}

export function getSupabaseConfigError(): string | null {
  if (!url && !anonKey) {
    return `Supabase ist nicht konfiguriert. Setzen Sie VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local. ${formatEnvHint()}`
  }
  if (!url) {
    return `VITE_SUPABASE_URL fehlt. ${formatEnvHint()}`
  }
  if (!anonKey) {
    return `VITE_SUPABASE_ANON_KEY fehlt. Der Publishable Key (sb_publishable_…) gehört in dieselbe Variable. ${formatEnvHint()}`
  }

  if (isPlaceholderUrl(url)) {
    const host = getUrlHostname(url) ?? url
    return `VITE_SUPABASE_URL enthält noch einen Platzhalter (${host}). Ersetzen Sie ihn in .env.local durch die Projekt-URL aus dem Supabase-Dashboard (Settings → API). ${formatEnvHint()}`
  }

  if (isPlaceholderKey(anonKey)) {
    return `VITE_SUPABASE_ANON_KEY enthält noch einen Platzhalter. Tragen Sie den anon Key (eyJ…) oder Publishable Key (sb_publishable_…) aus dem Supabase-Dashboard ein. ${formatEnvHint()}`
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return `VITE_SUPABASE_URL ist keine gültige URL. ${formatDiagnosticsHint()}`
  }

  if (parsed.protocol !== 'https:') {
    return 'VITE_SUPABASE_URL muss mit https:// beginnen.'
  }
  if (!parsed.hostname.endsWith('.supabase.co')) {
    return 'VITE_SUPABASE_URL muss auf .supabase.co enden (z. B. https://<projekt-ref>.supabase.co).'
  }

  const keyKind = classifySupabaseKey(anonKey)
  if (keyKind === 'secret') {
    return 'Der Secret Key (sb_secret_…) gehört nur auf den Server — im Browser VITE_SUPABASE_ANON_KEY mit dem anon- oder Publishable Key setzen.'
  }
  if (keyKind === 'jwt_service_role') {
    return 'Der service_role Key darf nicht im Browser stehen. Verwenden Sie den anon Key (eyJ…) oder Publishable Key (sb_publishable_…).'
  }
  if (keyKind === 'unknown') {
    return 'Unbekanntes Key-Format in VITE_SUPABASE_ANON_KEY. Verwenden Sie den anon Key (eyJ…) oder Publishable Key (sb_publishable_…) aus dem Supabase-Dashboard (Settings → API).'
  }

  return null
}

export const isSupabaseConfigured = getSupabaseConfigError() === null

export function mapSupabaseAuthError(message: string | undefined): string | null {
  if (!message) return null
  const lower = message.toLowerCase()
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    const configError = getSupabaseConfigError()
    if (configError) return configError
    const d = getSupabaseEnvDiagnostics()
    const host = d.urlHost ?? 'unbekannt'
    return `Verbindung zu Supabase fehlgeschlagen (${host}). Prüfen Sie die Projekt-URL, ob das Projekt pausiert ist, und die Site URL / Redirect URLs für http://localhost:5173 im Supabase-Dashboard (Authentication → URL Configuration). ${formatEnvHint()}`
  }
  return message
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export function getSupabaseConfigDiagnostics(): string {
  const error = getSupabaseConfigError()
  if (error) return `${error}\n\n${formatDiagnosticsHint()}`
  return formatDiagnosticsHint()
}

if (import.meta.env.DEV) {
  const d = getSupabaseEnvDiagnostics()
  const urlLabel = d.urlHost ?? '(missing)'
  const urlFlag = d.urlIsPlaceholder ? ' placeholder!' : d.urlHost ? ' ok' : ''
  const keyLabel = d.keyPresent ? d.keyPrefix : 'missing'
  console.log(`[supabase] url: ${urlLabel}${urlFlag} | key: ${keyLabel}`)
}
