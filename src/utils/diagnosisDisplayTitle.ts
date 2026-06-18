/**
 * Client-side fallback chain for diagnosis display titles.
 *
 * Priority:
 * 1. WHO/API official title (from server proxy)
 * 2. Criteria crosswalk label (`codingSystems.*.label_de`)
 * 3. Clinician-entered freetext label
 * 4. Code only
 */

export function resolveDiagnosisDisplayTitle(params: {
  apiTitle?: string | null
  criteriaLabel?: string | null
  enteredLabel?: string | null
  code?: string | null
}): string {
  const api = params.apiTitle?.trim()
  if (api) return api

  const criteria = params.criteriaLabel?.trim()
  if (criteria) return criteria

  const entered = params.enteredLabel?.trim()
  if (entered) return entered

  return params.code?.trim() ?? ''
}

export function diagnosisTitleCacheKey(version: string, code: string): string {
  return `${version}:${code.trim().toUpperCase()}`
}
