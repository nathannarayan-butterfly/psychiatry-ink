/**
 * Match a clinician-entered diagnosis (ICD-10 / ICD-11 codes) to an authored
 * Butterfly criteria set.
 *
 * Butterfly only verifies criteria for diagnoses the clinician has actually
 * entered — it never goes fishing across the whole library. This module is the
 * single source of truth for that mapping, used by both the engine
 * (`buildDiagnosticMappings`) and the Butterfly panel.
 *
 * Matching rules (conservative, to avoid cross-matching neighbours like
 * F41.0 ↔ F41.1):
 *  - A disorder anchored on a 3-character ICD-10 stem (e.g. "F32", "F20")
 *    matches any sub-code with that stem (F32, F32.1, F32.9 …).
 *  - A disorder anchored on a specific sub-code (e.g. "F41.1", "F10.2")
 *    matches only that code or a finer extension of it (prefix), NOT the bare
 *    stem and NOT sibling sub-codes.
 *  - ICD-11 codes match on exact / prefix in either direction.
 */

import type { Disorder } from './schema'
import { DISORDER_CRITERIA } from './index'

function normCode(code: string | undefined | null): string {
  return (code ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

/** ICD-10 stem = characters before the dot (e.g. "F32.1" → "F32"). */
function icd10Stem(code: string): string {
  return code.split('.')[0] ?? code
}

function isIcd10(code: string): boolean {
  return /^[A-Z]\d/.test(code)
}

/** ICD-10 candidate anchors for a disorder, normalized. */
function icd10Anchors(disorder: Disorder): string[] {
  const anchors = [disorder.code, disorder.crosswalkKey, disorder.codingSystems.icd10?.code]
    .map(normCode)
    .filter((c) => c && isIcd10(c))
  return [...new Set(anchors)]
}

function matchesIcd10(enteredCode: string, disorder: Disorder): boolean {
  const entered = normCode(enteredCode)
  if (!entered || !isIcd10(entered)) return false
  for (const anchor of icd10Anchors(disorder)) {
    if (anchor.length <= 3) {
      // Stem anchor (F32, F20): match any sub-code sharing the stem.
      if (icd10Stem(entered) === anchor) return true
    } else if (entered === anchor || entered.startsWith(anchor)) {
      // Sub-code anchor (F41.1, F10.2): exact or finer extension only.
      return true
    }
  }
  return false
}

function matchesIcd11(enteredCode: string, disorder: Disorder): boolean {
  const entered = normCode(enteredCode)
  const anchor = normCode(disorder.codingSystems.icd11?.code)
  if (!entered || !anchor) return false
  return entered === anchor || entered.startsWith(anchor) || anchor.startsWith(entered)
}

/** Find the authored disorder matching an entered diagnosis by code, or undefined. */
export function matchDisorderToCodes(
  icd10Code: string | undefined | null,
  icd11Code?: string | undefined | null,
): Disorder | undefined {
  const icd10 = normCode(icd10Code)
  const icd11 = normCode(icd11Code)
  return DISORDER_CRITERIA.find(
    (disorder) =>
      (icd10 && matchesIcd10(icd10, disorder)) || (icd11 && matchesIcd11(icd11, disorder)),
  )
}
