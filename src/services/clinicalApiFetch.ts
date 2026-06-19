import type { UiLanguage } from '../types/settings'
import { clinicalAcceptLanguage, loadStoredUiLanguage } from '../utils/clinicalLanguage'
import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'

let organisationIdResolver: (() => string | undefined) | null = null
let languageResolver: (() => UiLanguage) | null = null

/** Register active organisation id (from OrganisationProvider). */
export function registerClinicalOrganisationIdResolver(resolver: () => string | undefined): void {
  organisationIdResolver = resolver
}

/** Register active UI language (from TranslationProvider). */
export function registerClinicalLanguageResolver(resolver: () => UiLanguage): void {
  languageResolver = resolver
}

export function getClinicalApiLanguage(): UiLanguage {
  return languageResolver?.() ?? loadStoredUiLanguage()
}

function mergeClinicalLanguageBody(init?: RequestInit): BodyInit | null | undefined {
  const language = getClinicalApiLanguage()
  const method = (init?.method ?? 'GET').toUpperCase()
  if (!['POST', 'PUT', 'PATCH'].includes(method)) return init?.body

  if (init?.body == null || init.body === '') {
    return JSON.stringify({ language })
  }

  if (typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body) as Record<string, unknown>
      if (parsed.language == null) {
        return JSON.stringify({ ...parsed, language })
      }
      return init.body
    } catch {
      return init.body
    }
  }

  return init.body
}

export async function clinicalApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  const organisationId = organisationIdResolver?.()?.trim()
  const language = getClinicalApiLanguage()
  return fetch(`${API_BASE}${path}`, {
    ...init,
    body: mergeClinicalLanguageBody(init),
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': clinicalAcceptLanguage(language),
      ...authHeaders,
      ...(organisationId ? { 'X-Organisation-Id': organisationId } : {}),
      ...init?.headers,
    },
  })
}

const ERROR_DE: Record<string, string> = {
  'Authentication required': 'Anmeldung erforderlich',
  'Anmeldung erforderlich': 'Anmeldung erforderlich',
  'Permission denied': 'Keine Berechtigung für diese Aktion',
  'Keine Berechtigung für KI in diesem Fall': 'Keine Berechtigung für KI in diesem Fall',
  'Keine Berechtigung für Medikationsdaten': 'Keine Berechtigung für Medikationsdaten',
  'Keine Berechtigung für Medikations- oder Labordaten': 'Keine Berechtigung für Medikations- oder Labordaten',
  'Ihr monatliches KI-Kontingent ist aufgebraucht. Bitte wenden Sie sich an die Praxisleitung.':
    'Ihr monatliches KI-Kontingent ist aufgebraucht. Bitte wenden Sie sich an die Praxisleitung.',
  'Combination check failed': 'Kombinationscheck fehlgeschlagen',
  'Lab medication correlation failed': 'Korrelationsprüfung fehlgeschlagen',
  'Prep AI check failed': 'Verfügbarkeitsprüfung fehlgeschlagen',
  'Not found': 'Nicht gefunden',
  'Server KI deaktiviert — ENABLE_PSYCHOPATH_EXTRACT_AI auf API-Server setzen und neu starten':
    'Server KI deaktiviert — ENABLE_PSYCHOPATH_EXTRACT_AI auf API-Server setzen und neu starten',
  'Generation failed': 'KI-Generierung fehlgeschlagen',
}

function localizeClinicalApiError(message: string): string {
  return ERROR_DE[message] ?? message
}

export async function parseClinicalApiError(response: Response, fallback: string): Promise<never> {
  const detail = (await response.json().catch(() => null)) as { error?: string } | null
  const reason = localizeClinicalApiError(detail?.error ?? `${fallback} (${response.status})`)
  throw new Error(`KI-Anfrage fehlgeschlagen: ${reason}`)
}
