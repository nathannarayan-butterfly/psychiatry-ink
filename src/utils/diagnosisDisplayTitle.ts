/**
 * Client-side fallback chain for diagnosis display titles.
 *
 * When `overridden` is true (clinician-edited), the stored label wins.
 * Otherwise:
 * 1. WHO/API official title (from server proxy)
 * 2. Criteria crosswalk label (`codingSystems.*.label_de`)
 * 3. Code only — stored labels are not used (they may be stale shorthand)
 */

export function resolveDiagnosisDisplayTitle(params: {
  apiTitle?: string | null
  criteriaLabel?: string | null
  enteredLabel?: string | null
  code?: string | null
  overridden?: boolean
}): string {
  if (params.overridden) {
    const entered = params.enteredLabel?.trim()
    if (entered) return entered
  }

  const api = params.apiTitle?.trim()
  if (api) return api

  const criteria = params.criteriaLabel?.trim()
  if (criteria) return criteria

  return params.code?.trim() ?? ''
}

export function diagnosisTitleCacheKey(version: string, code: string): string {
  return `${version}:${code.trim().toUpperCase()}`
}
