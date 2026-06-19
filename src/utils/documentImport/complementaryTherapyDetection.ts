/**
 * Detect complementary-therapy mentions in ward Verlauf / therapy text and emit
 * reviewable `complementaryTherapy` candidates so accepted imports upsert the
 * matching Therapien chart entry.
 */
import type { ClinicalImportCandidate, ImportSourceLocation } from '../../schemas/documentImport/envelope'
import { DEFAULT_COMPLEMENTARY_THERAPY_TYPES } from '../../types/complementaryTherapy'
import { makeCandidate } from './candidateFactory'
export const DETECTABLE_COMPLEMENTARY_THERAPY_IDS = [
  ...DEFAULT_COMPLEMENTARY_THERAPY_TYPES,
  'physiotherapie',
] as const

export type DetectableComplementaryTherapyId = (typeof DETECTABLE_COMPLEMENTARY_THERAPY_IDS)[number]

/** Keyword / phrase patterns per therapy type (German clinical wording). */
const THERAPY_MENTION_PATTERNS: { id: DetectableComplementaryTherapyId; pattern: RegExp }[] = [
  { id: 'ergotherapie', pattern: /\bergotherapie\b/i },
  { id: 'sporttherapie', pattern: /\bsporttherapie\b/i },
  { id: 'musiktherapie', pattern: /\bmusiktherapie\b/i },
  { id: 'kunsttherapie', pattern: /\bkunsttherapie\b/i },
  { id: 'skillgruppe', pattern: /\bskill\s*gruppe\b|\bskills?\s*training\b/i },
  { id: 'fokusgruppe', pattern: /\bfokus\s*gruppe\b/i },
  { id: 'psychoedukation', pattern: /\bpsycho\s*edukation\b/i },
  { id: 'suchtgruppe', pattern: /\bsucht\s*gruppe\b/i },
  { id: 'entspannungstraining', pattern: /\bentspannungs?\s*training\b|\bprogressive\s*muskelrelaxation\b/i },
  { id: 'arbeitstherapie', pattern: /\barbeits\s*therapie\b/i },
  { id: 'gruppentherapien', pattern: /\bgruppen\s*therapie\b|\bgruppentherapie\b/i },
  { id: 'physiotherapie', pattern: /\bphysiotherapie\b/i },
]

function existingComplementaryTypeIds(candidates: ClinicalImportCandidate[]): Set<string> {
  const ids = new Set<string>()
  for (const candidate of candidates) {
    if (candidate.module === 'complementaryTherapy') {
      ids.add(candidate.data.therapyTypeId)
    }
  }
  return ids
}

function excerptAroundMatch(text: string, pattern: RegExp, maxLen = 160): string {
  const match = pattern.exec(text)
  if (!match || match.index === undefined) return text.trim().slice(0, maxLen)
  const start = Math.max(0, match.index - 40)
  const end = Math.min(text.length, match.index + match[0].length + 80)
  const slice = text.slice(start, end).trim()
  return slice.length > maxLen ? `${slice.slice(0, maxLen - 1)}…` : slice
}

/** Return therapy type ids mentioned in free text (deduplicated, stable order). */
export function detectComplementaryTherapyMentions(text: string): DetectableComplementaryTherapyId[] {
  const found: DetectableComplementaryTherapyId[] = []
  const seen = new Set<string>()
  for (const { id, pattern } of THERAPY_MENTION_PATTERNS) {
    if (pattern.test(text) && !seen.has(id)) {
      seen.add(id)
      found.push(id)
    }
  }
  return found
}

function isTherapyMentionSource(candidate: ClinicalImportCandidate): boolean {
  return candidate.module === 'verlauf' || candidate.module === 'therapy'
}

/**
 * Append complementary-therapy candidates for therapies mentioned inside ward
 * Verlauf / therapy notes. Skips types already represented by dedicated
 * Ergotherapieverlauf-style candidates in the same batch.
 */
export function appendComplementaryTherapyCandidatesFromMentions(
  candidates: ClinicalImportCandidate[],
): ClinicalImportCandidate[] {
  const alreadyPresent = existingComplementaryTypeIds(candidates)
  const derived: ClinicalImportCandidate[] = []

  for (const candidate of candidates) {
    if (!isTherapyMentionSource(candidate)) continue

    const text =
      candidate.module === 'therapy'
        ? `${candidate.data.title}\n${candidate.data.text}`
        : candidate.module === 'verlauf'
          ? candidate.data.text
          : ''
    if (!text) continue
    const mentions = detectComplementaryTherapyMentions(text)

    for (const therapyTypeId of mentions) {
      if (alreadyPresent.has(therapyTypeId)) continue
      alreadyPresent.add(therapyTypeId)

      const pattern = THERAPY_MENTION_PATTERNS.find((entry) => entry.id === therapyTypeId)?.pattern
      const excerpt = pattern ? excerptAroundMatch(text, pattern) : text.slice(0, 120)
      const location: ImportSourceLocation = {
        ...candidate.sourceLocation,
        section: candidate.sourceLocation.section
          ? `${candidate.sourceLocation.section} → ${therapyTypeId}`
          : therapyTypeId,
      }

      derived.push(
        makeCandidate({
          module: 'complementaryTherapy',
          confidence: 'medium',
          sourceLocation: location,
          rawText: excerpt,
          data: {
            therapyTypeId,
            date: 'date' in candidate.data ? candidate.data.date : undefined,
            text: excerpt,
          },
        }),
      )
    }
  }

  return derived.length > 0 ? [...candidates, ...derived] : candidates
}

/** @internal test helper */
export function therapyMentionPattern(id: DetectableComplementaryTherapyId): RegExp | undefined {
  return THERAPY_MENTION_PATTERNS.find((entry) => entry.id === id)?.pattern
}
