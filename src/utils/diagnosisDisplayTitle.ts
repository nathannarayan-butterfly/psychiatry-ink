import type { IcdTitleVersion } from '../../shared/icdTitle'

/**
 * Client-side fallback chain for diagnosis display titles.
 *
 * Priority:
 * 1. Clinician-entered label — only when `overridden` and materially custom
 * 2. Bundled ICD-10-GM / criteria label for `icd10` (locale-aligned catalogue)
 * 3. WHO/API official title (from server proxy)
 * 4. Bundled criteria / catalog crosswalk label (icd11, dsm, or icd10 without bundled hit)
 * 5. Clinician-entered label when overridden but not materially custom
 * 6. Code only
 *
 * WHO ICD-10 uses the international release and often returns English category
 * titles even when Accept-Language is German. Bundled ICD-10-GM labels therefore
 * take precedence for `icd10` whenever present.
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
  version?: IcdTitleVersion
}): string {
  const api = params.apiTitle?.trim()
  const criteria = params.criteriaLabel?.trim()
  const entered = params.enteredLabel?.trim()
  const code = params.code?.trim() ?? ''

  if (params.overridden && entered && isMaterialClinicianOverride(entered, criteria || api)) {
    return entered
  }

  if (params.version === 'icd10' && criteria) return criteria

  if (api) return api
  if (criteria) return criteria
  if (params.overridden && entered) return entered

  return code
}

export function diagnosisTitleCacheKey(version: string, code: string): string {
  return `${version}:${code.trim().toUpperCase()}`
}
