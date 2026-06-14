import type { Request, Response } from 'express'

export type ClinicalLanguage = 'de' | 'en' | 'fr' | 'es'

const VALID: ClinicalLanguage[] = ['de', 'en', 'fr', 'es']

export function coerceClinicalLanguage(value: unknown): ClinicalLanguage | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase().split('-')[0] as ClinicalLanguage
  return VALID.includes(normalized) ? normalized : null
}

export function resolveLanguageName(lang: ClinicalLanguage): string {
  switch (lang) {
    case 'en':
      return 'English'
    case 'fr':
      return 'French'
    case 'es':
      return 'Spanish'
    default:
      return 'German'
  }
}

/** Resolve UI language from request body field or Accept-Language header. */
export function resolveClinicalLanguage(req: Request, bodyLanguage?: unknown): ClinicalLanguage | null {
  const fromBody = coerceClinicalLanguage(bodyLanguage)
  if (fromBody) return fromBody

  const accept = req.headers['accept-language']
  if (typeof accept === 'string' && accept.trim()) {
    const primary = accept.split(',')[0]?.trim().split('-')[0]
    const fromHeader = coerceClinicalLanguage(primary)
    if (fromHeader) return fromHeader
  }

  return null
}

/** Require explicit client language; responds 400 when missing. */
export function requireClinicalLanguage(
  req: Request,
  res: Response,
  bodyLanguage?: unknown,
): ClinicalLanguage | null {
  const language = resolveClinicalLanguage(req, bodyLanguage)
  if (!language) {
    res.status(400).json({
      error: 'Missing language (send language in request body or Accept-Language header)',
    })
    return null
  }
  return language
}

/** Strong instruction for structured JSON clinical AI responses. */
export function clinicalLanguagePromptInstruction(language: ClinicalLanguage): string {
  const name = resolveLanguageName(language)
  if (language === 'de') {
    return [
      'Antworte vollständig auf Deutsch.',
      'Alle JSON-Feldwerte mit Freitext (z. B. mainRisk, mechanism, monitoring, clinicalManagement, rationale, uncertainties, zusammenhang, recommendation, disclaimer, availabilityNote) müssen auf Deutsch sein — keine englischen Sätze.',
    ].join(' ')
  }
  return `Respond entirely in ${name}. All free-text JSON field values must be in ${name}.`
}
