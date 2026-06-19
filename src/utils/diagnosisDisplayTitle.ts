/**
 * Client-side fallback chain for diagnosis display titles.
 *
 * Priority:
 * 1. WHO/API official title (from server proxy)
 * 2. Bundled criteria / catalog crosswalk label
 * 3. Clinician-entered label — only when `overridden` and materially custom
 * 4. Code only
 *
 * Stored labels are cache/shorthand; legacy migrations may have set `overridden`
 * incorrectly. Prefer official titles when the stored text is redundant shorthand.
 */

function isMaterialClinicianOverride(entered: string, official: string | null | undefined): boolean {
  if (!official) return true
  const e = entered.trim()
  const o = official.trim()
  if (!e || e === o) return false
  if (o.toLowerCase().includes(e.toLowerCase())) return false
  if (o.length > e.length * 1.5) return false
  return true
}

export function resolveDiagnosisDisplayTitle(params: {
  apiTitle?: string | null
  criteriaLabel?: string | null
  enteredLabel?: string | null
  code?: string | null
  overridden?: boolean
}): string {
  const api = params.apiTitle?.trim()
  const criteria = params.criteriaLabel?.trim()
  const entered = params.enteredLabel?.trim()
  const code = params.code?.trim() ?? ''

  if (params.overridden && entered && isMaterialClinicianOverride(entered, criteria)) {
    return entered
  }

  if (api) return api
  if (criteria) return criteria
  if (params.overridden && entered) return entered

  return code
}

export function diagnosisTitleCacheKey(version: string, code: string): string {
  return `${version}:${code.trim().toUpperCase()}`
}
