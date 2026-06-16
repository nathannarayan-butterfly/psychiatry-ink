/**
 * Write-side fact merge helpers for the CMEA orchestrator.
 *
 * Records store facts from three extractors together. The freshness rules:
 *  - regex facts (Pass A) are regenerated on every save.
 *  - llm facts (Pass B) are regenerated only when content changed / extractor
 *    version bumped; otherwise the cached llm facts are preserved.
 *  - clinician facts (accepted suggestions) are NEVER auto-touched.
 */

import { CMEA_EXTRACTOR_VERSION, type ClinicalFact, type FactExtractor } from '../../types/clinicalMetadata'
import type { ClinicalImprintJob, ClinicalImprintRecord } from '../../types/clinicalImprint'
import { needsLlmEnrichment } from './regexFacts'

const EXTRACTOR_PRIORITY: Record<FactExtractor, number> = {
  clinician: 3,
  llm: 2,
  regex: 1,
}

export function factsByExtractor(
  facts: ClinicalFact[] | undefined,
  extractor: FactExtractor,
): ClinicalFact[] {
  return (facts ?? []).filter((fact) => fact.provenance.extractor === extractor)
}

/** Dedupe facts by id, keeping the highest-priority extractor (clinician > llm > regex). */
export function dedupeFacts(facts: ClinicalFact[]): ClinicalFact[] {
  const byId = new Map<string, ClinicalFact>()
  for (const fact of facts) {
    const existing = byId.get(fact.id)
    if (
      !existing ||
      EXTRACTOR_PRIORITY[fact.provenance.extractor] > EXTRACTOR_PRIORITY[existing.provenance.extractor]
    ) {
      byId.set(fact.id, fact)
    }
  }
  return [...byId.values()]
}

/**
 * Freshness gate: should Pass B (LLM) run for this source? Skips the LLM call
 * when the content hash is unchanged AND the extractor version is current AND
 * cached llm facts already exist — i.e. nothing new to extract.
 */
export function shouldRunLlmEnrichment(
  job: ClinicalImprintJob,
  existing: ClinicalImprintRecord | undefined,
  newContentHash: string,
): boolean {
  if (!needsLlmEnrichment(job)) return false
  if (!existing) return true
  const fresh =
    existing.contentHash === newContentHash &&
    existing.extractorVersion === CMEA_EXTRACTOR_VERSION &&
    factsByExtractor(existing.facts, 'llm').length > 0
  return !fresh
}

/**
 * Combine a record's fresh regex facts with carried-over llm + clinician facts.
 * When the content changed, stale llm facts are dropped (Pass B will refill);
 * clinician facts are always preserved.
 */
export function mergeRecordFacts(input: {
  regexFacts: ClinicalFact[]
  previous: ClinicalImprintRecord | undefined
  contentChanged: boolean
}): ClinicalFact[] {
  const clinician = factsByExtractor(input.previous?.facts, 'clinician')
  const carriedLlm = input.contentChanged ? [] : factsByExtractor(input.previous?.facts, 'llm')
  return dedupeFacts([...input.regexFacts, ...carriedLlm, ...clinician])
}

/** Replace a record's llm facts (for one source) with freshly extracted ones. */
export function applyLlmFacts(
  existingFacts: ClinicalFact[] | undefined,
  llmFacts: ClinicalFact[],
): ClinicalFact[] {
  const nonLlm = (existingFacts ?? []).filter((fact) => fact.provenance.extractor !== 'llm')
  return dedupeFacts([...nonLlm, ...llmFacts])
}
