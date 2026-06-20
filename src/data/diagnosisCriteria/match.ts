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
 * F41.0 ↔ F41.1 or ICD-11 6C40.1 ↔ 6C40.2):
 *
 * ICD-10
 *  - A disorder anchored on a 3-character stem (e.g. "F32", "F20") matches any
 *    sub-code with that stem (F32, F32.1, F32.9 …).
 *  - A disorder anchored on a specific sub-code (e.g. "F41.1", "F10.2") matches
 *    only that code or a finer extension (prefix at dot boundary), NOT the bare
 *    stem and NOT sibling sub-codes.
 *  - Bare category stems (F07, F10–F18, F60, F78, F79) may fall back to a block
 *    tree when the stem shares an ICD-10 block with an authored anchor — never
 *    for F4x anxiety stems where sibling sub-types must stay distinct.
 *
 * ICD-11 (Chapter 06)
 *  - Exact match always wins.
 *  - Block headers (4 chars, no dot, e.g. "6C40") match any authored anchor in
 *    that block (6C40.2, 6C40.3 …).
 *  - Category extension within a block: 6C40.2 matches 6C40.20/6C40.2Z but NOT
 *    sibling categories 6C40.1. Partial prefixes like "6C4" never match.
 *  - Residual / other-specified codes (.0, .7, .Y, .Z) within a block with
 *    authored coverage fall back to the block tree when no specific anchor exists.
 *  - Anchors include `codingSystems.icd11.code` plus ICD-11 codes cited on the
 *    disorder's native ICD-11 criteria set (e.g. 6A61 on the bipolar tree).
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

function isIcd11(code: string): boolean {
  return /^6[A-E]/i.test(code)
}

/** ICD-11 Chapter 06 block = first four characters (e.g. "6C40.2" → "6C40"). */
function icd11Block(code: string): string {
  return code.slice(0, 4)
}

/**
 * ICD-10 category stems that may resolve to a block tree via shared stem when no
 * stem-anchor disorder exists. Excludes F4x (anxiety) where F41.0/F41.1 must
 * stay distinct.
 */
const ICD10_BLOCK_STEM_FALLBACK = /^F(07|1[0-9]|78|79)$/

/** Residual / other-specified ICD-11 suffixes safe for block-level fallback. */
function isIcd11ResidualCode(code: string): boolean {
  return /\.(Y|Z)$/i.test(code) || /\.0$/i.test(code) || /\.7/i.test(code)
}

/** ICD-10 candidate anchors for a disorder, normalized. */
function icd10Anchors(disorder: Disorder): string[] {
  const anchors = [disorder.code, disorder.crosswalkKey, disorder.codingSystems.icd10?.code]
    .map(normCode)
    .filter((c) => c && isIcd10(c))
  return [...new Set(anchors)]
}

/** ICD-11 candidate anchors: header crosswalk + native ICD-11 criteria citations. */
function icd11Anchors(disorder: Disorder): string[] {
  const anchors = new Set<string>()
  const header = normCode(disorder.codingSystems.icd11?.code)
  if (header && isIcd11(header)) anchors.add(header)

  for (const group of disorder.icd11?.groups ?? []) {
    for (const criterion of group.criteria) {
      for (const cite of criterion.citation ?? []) {
        if (cite.classification !== 'icd11') continue
        const code = normCode(cite.code)
        if (code && isIcd11(code)) anchors.add(code)
      }
    }
  }

  return [...anchors]
}

function matchesIcd10(enteredCode: string, disorder: Disorder): boolean {
  const entered = normCode(enteredCode)
  if (!entered || !isIcd10(entered)) return false

  for (const anchor of icd10Anchors(disorder)) {
    if (anchor.length <= 3) {
      // Stem anchor (F32, F20): match any sub-code sharing the stem.
      if (icd10Stem(entered) === anchor) return true
    } else if (entered === anchor || entered.startsWith(`${anchor}.`)) {
      // Sub-code anchor (F41.1, F10.2): exact or finer extension only.
      return true
    }
  }

  // Category stems with dedicated block trees (before generic F1x fallback).
  if (entered === 'F60') {
    return disorder.id === 'icd11_dimensional_personality_disorder'
  }
  if (entered === 'F78' || entered === 'F79') {
    return icd11Anchors(disorder).some((anchor) => icd11Block(anchor) === '6A00')
  }

  // Bare category stem → block tree when stem shares an authored anchor (F10 → F10.2 …).
  if (ICD10_BLOCK_STEM_FALLBACK.test(entered)) {
    for (const anchor of icd10Anchors(disorder)) {
      if (anchor === entered) return true
      if (icd10Stem(anchor) === entered) return true
    }
  }

  return false
}

/**
 * Conservative ICD-11 match between an entered catalogue code and one anchor.
 * See module header for sibling / partial-prefix guards.
 */
function matchesIcd11Anchor(entered: string, anchor: string): boolean {
  if (!entered || !anchor) return false
  if (entered === anchor) return true

  // Block header entered (6C40): any anchor in that block.
  if (entered.length === 4 && !entered.includes('.')) {
    return icd11Block(anchor) === entered
  }

  // Block-level anchor (6C40, 6A00): any code in that block.
  if (anchor.length === 4 && !anchor.includes('.')) {
    return icd11Block(entered) === anchor
  }

  // Residual codes in a covered block (.0 / .7 / .Y / .Z) → block fallback.
  if (isIcd11ResidualCode(entered) && icd11Block(entered) === icd11Block(anchor)) {
    return true
  }

  // Finer codes must share the same four-character block.
  if (icd11Block(entered) !== icd11Block(anchor)) return false

  // Category extension within block (6C40.2 → 6C40.20; 6C40.1 → 6C40.10).
  // Guard: next char after shared prefix must continue this category (digit/letter/dot),
  // never a sibling category digit after the dot (6C40.1 vs 6C40.2 handled by unequal prefix).
  if (entered.startsWith(anchor)) {
    if (entered.length === anchor.length) return true
    const next = entered[anchor.length]
    if (next === '.' || /[\dA-Z]/i.test(next)) return true
  }

  if (anchor.startsWith(entered)) {
    if (anchor.length === entered.length) return true
    const next = anchor[entered.length]
    if (next === '.' || /[\dA-Z]/i.test(next)) return true
  }

  return false
}

function matchesIcd11(enteredCode: string, disorder: Disorder): boolean {
  const entered = normCode(enteredCode)
  if (!entered || !isIcd11(entered)) return false
  return icd11Anchors(disorder).some((anchor) => matchesIcd11Anchor(entered, anchor))
}

/** Prefer the most specific anchor match (longest shared prefix). */
function matchSpecificity(
  enteredIcd10: string,
  enteredIcd11: string,
  disorder: Disorder,
): number {
  let best = 0
  const icd10 = normCode(enteredIcd10)
  const icd11 = normCode(enteredIcd11)

  if (icd10 && matchesIcd10(icd10, disorder)) {
    for (const anchor of icd10Anchors(disorder)) {
      if (anchor === icd10) {
        best = Math.max(best, 200 + anchor.length)
      } else if (anchor.length <= 3 && icd10Stem(icd10) === anchor) {
        best = Math.max(best, 100 + anchor.length)
      } else if (icd10 === anchor || icd10.startsWith(`${anchor}.`)) {
        best = Math.max(best, 150 + anchor.length)
      } else if (ICD10_BLOCK_STEM_FALLBACK.test(icd10) && icd10Stem(anchor) === icd10) {
        best = Math.max(best, 40 + anchor.length)
      }
    }
    if (icd10 === 'F60' && disorder.id === 'icd11_dimensional_personality_disorder') {
      best = Math.max(best, 200)
    }
    if ((icd10 === 'F78' || icd10 === 'F79') && icd11Anchors(disorder).some((a) => icd11Block(a) === '6A00')) {
      best = Math.max(best, 45)
    }
  }

  if (icd11 && matchesIcd11(icd11, disorder)) {
    for (const anchor of icd11Anchors(disorder)) {
      if (!matchesIcd11Anchor(icd11, anchor)) continue
      if (icd11 === anchor) {
        best = Math.max(best, 100 + anchor.length)
      } else if (icd11.startsWith(anchor)) {
        best = Math.max(best, 100 + anchor.length)
      } else if (anchor.startsWith(icd11)) {
        best = Math.max(best, 100 + icd11.length)
      } else if (icd11Block(icd11) === icd11Block(anchor)) {
        best = Math.max(best, 50 + anchor.length)
      } else {
        best = Math.max(best, 10)
      }
    }
  }

  return best
}

/** Find the authored disorder matching an entered diagnosis by code, or undefined. */
export function matchDisorderToCodes(
  icd10Code: string | undefined | null,
  icd11Code?: string | undefined | null,
): Disorder | undefined {
  const icd10 = normCode(icd10Code)
  const icd11 = normCode(icd11Code)
  if (!icd10 && !icd11) return undefined

  let best: Disorder | undefined
  let bestScore = 0

  for (const disorder of DISORDER_CRITERIA) {
    const icd10Hit = icd10 && matchesIcd10(icd10, disorder)
    const icd11Hit = icd11 && matchesIcd11(icd11, disorder)
    if (!icd10Hit && !icd11Hit) continue

    let score = matchSpecificity(icd10, icd11, disorder)
    if (score === 0) score = 1
    if (score > bestScore) {
      bestScore = score
      best = disorder
    }
  }

  return best
}
