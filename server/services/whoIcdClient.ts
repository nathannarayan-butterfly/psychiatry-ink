/**
 * WHO ICD-API client (OAuth2 client credentials).
 *
 * Required env vars for live WHO lookup:
 * - WHO_ICD_CLIENT_ID — from https://icd.who.int/icdapi (View API access key)
 * - WHO_ICD_CLIENT_SECRET
 *
 * Optional:
 * - WHO_ICD11_RELEASE (default 2026-01 — includes German prerelease)
 * - WHO_ICD10_RELEASE (default 2016)
 */

import { fetchWithTimeout, withRetry } from '../utils/httpTimeout'

const TOKEN_ENDPOINT = 'https://icdaccessmanagement.who.int/connect/token'
const API_BASE = 'https://id.who.int'
const WHO_TIMEOUT_MS = Number(process.env.WHO_ICD_TIMEOUT_MS ?? 30_000)

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

function whoCredentialsConfigured(): boolean {
  return Boolean(process.env.WHO_ICD_CLIENT_ID?.trim() && process.env.WHO_ICD_CLIENT_SECRET?.trim())
}

function icd11Release(): string {
  return process.env.WHO_ICD11_RELEASE?.trim() || '2026-01'
}

function icd10Release(): string {
  return process.env.WHO_ICD10_RELEASE?.trim() || '2016'
}

function normalizeLanguage(raw: string | undefined): string {
  const lang = (raw ?? 'de').trim().toLowerCase()
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('es')) return 'es'
  return 'en'
}

function extractWhoTitle(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>

  const readTitleField = (value: unknown): string | null => {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed || null
    }
    if (value && typeof value === 'object') {
      const nested = (value as Record<string, unknown>)['@value']
      if (typeof nested === 'string') {
        const trimmed = nested.trim()
        return trimmed || null
      }
    }
    return null
  }

  return (
    readTitleField(record.title) ||
    readTitleField(record.prefLabel) ||
    readTitleField(record.label) ||
    null
  )
}

async function getAccessToken(): Promise<string | null> {
  if (!whoCredentialsConfigured()) return null

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken
  }

  const clientId = process.env.WHO_ICD_CLIENT_ID!.trim()
  const clientSecret = process.env.WHO_ICD_CLIENT_SECRET!.trim()

  const response = await fetchWithTimeout(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'icdapi_access',
      grant_type: 'client_credentials',
    }),
    timeoutMs: WHO_TIMEOUT_MS,
    label: 'WHO ICD token',
  })

  if (!response.ok) {
    console.warn('[who-icd] token request failed', response.status)
    return null
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  const accessToken = data.access_token?.trim()
  if (!accessToken) return null

  const expiresIn = Number(data.expires_in ?? 3600)
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  }
  return accessToken
}

async function whoGet(path: string, language: string): Promise<unknown | null> {
  const token = await getAccessToken()
  if (!token) return null

  // Read-only lookup → safe to retry once on a timeout/transport blip.
  const response = await withRetry(() =>
    fetchWithTimeout(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Accept-Language': language,
        'API-Version': 'v2',
      },
      timeoutMs: WHO_TIMEOUT_MS,
      label: 'WHO ICD lookup',
    }),
  )

  if (!response.ok) {
    return null
  }

  return response.json()
}

function toHttpsUri(uri: string): string {
  return uri.replace(/^http:\/\//i, 'https://')
}

async function fetchIcd10WhoTitle(code: string, language: string): Promise<string | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  const release = icd10Release()
  const data = await whoGet(
    `/icd/release/10/${encodeURIComponent(release)}/${encodeURIComponent(normalized)}`,
    language,
  )
  return extractWhoTitle(data)
}

async function fetchIcd11WhoTitle(code: string, language: string): Promise<string | null> {
  const normalized = code.trim()
  if (!normalized) return null

  const release = icd11Release()
  const encodedCode = encodeURIComponent(normalized)

  const describe = await whoGet(
    `/icd/release/11/${encodeURIComponent(release)}/mms/describe?code=${encodedCode}`,
    language,
  )
  const describeTitle = extractWhoTitle(describe)
  if (describeTitle) return describeTitle

  const codeInfo = (await whoGet(
    `/icd/release/11/${encodeURIComponent(release)}/mms/codeinfo/${encodedCode}`,
    language,
  )) as { stemId?: string } | null

  const stemId = typeof codeInfo?.stemId === 'string' ? codeInfo.stemId : null
  if (!stemId) return null

  const entityPath = toHttpsUri(stemId).replace(API_BASE, '')
  const entity = await whoGet(entityPath, language)
  return extractWhoTitle(entity)
}

/** Returns an official WHO title when credentials and lookup succeed. */
export async function fetchWhoIcdTitle(
  code: string,
  version: 'icd10' | 'icd11',
  languageRaw?: string,
): Promise<string | null> {
  if (!whoCredentialsConfigured()) return null

  const language = normalizeLanguage(languageRaw)
  const trimmed = code.trim()
  if (!trimmed) return null

  try {
    if (version === 'icd10') {
      return await fetchIcd10WhoTitle(trimmed, language)
    }
    return await fetchIcd11WhoTitle(trimmed, language)
  } catch (error) {
    console.warn('[who-icd] title lookup failed', { version, code: trimmed, error })
    return null
  }
}

/** Test helper — reset OAuth token cache. */
export function resetWhoIcdClientForTests(): void {
  tokenCache = null
}
