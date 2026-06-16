import { describe, expect, it } from 'vitest'
import {
  applyLlmFacts,
  dedupeFacts,
  factsByExtractor,
  mergeRecordFacts,
  shouldRunLlmEnrichment,
} from '../mergeFacts'
import { CMEA_EXTRACTOR_VERSION, type ClinicalFact, type FactExtractor } from '../../../types/clinicalMetadata'
import type { ClinicalImprintJob, ClinicalImprintRecord } from '../../../types/clinicalImprint'

function symptom(id: string, extractor: FactExtractor): ClinicalFact {
  return {
    id,
    kind: 'symptom',
    caseId: 'c',
    label: id,
    domain: null,
    severity: null,
    onset: null,
    durationDays: null,
    negated: false,
    provenance: {
      sourceType: 'anamnesis',
      sourceId: 'aufnahme:document',
      sourceDate: '2024-01-01T00:00:00.000Z',
      evidenceStrength: 'inferred',
      evidenceQuote: null,
      confidence: 0.5,
      extractor,
      extractorVersion: CMEA_EXTRACTOR_VERSION,
    },
  }
}

const JOB: ClinicalImprintJob = {
  caseId: 'c',
  sourceType: 'anamnesis',
  sourceId: 'aufnahme:document',
  text: 'a'.repeat(200),
}

function record(facts: ClinicalFact[], contentHash: string): ClinicalImprintRecord {
  return {
    imprintKey: 'anamnesis:aufnahme:document',
    contentHash,
    extractorVersion: CMEA_EXTRACTOR_VERSION,
    facts,
  } as unknown as ClinicalImprintRecord
}

describe('CMEA fact merge + freshness', () => {
  it('dedupes by id keeping clinician > llm > regex', () => {
    const merged = dedupeFacts([symptom('x', 'regex'), symptom('x', 'llm'), symptom('x', 'clinician')])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.provenance.extractor).toBe('clinician')
  })

  it('factsByExtractor filters correctly', () => {
    const facts = [symptom('a', 'regex'), symptom('b', 'llm'), symptom('c', 'clinician')]
    expect(factsByExtractor(facts, 'llm')).toHaveLength(1)
    expect(factsByExtractor(undefined, 'regex')).toEqual([])
  })

  it('mergeRecordFacts carries llm + clinician facts when content unchanged', () => {
    const previous = record([symptom('old-regex', 'regex'), symptom('llm-1', 'llm'), symptom('clin-1', 'clinician')], 'hash1')
    const merged = mergeRecordFacts({
      regexFacts: [symptom('new-regex', 'regex')],
      previous,
      contentChanged: false,
    })
    const ids = merged.map((f) => f.id).sort()
    expect(ids).toEqual(['clin-1', 'llm-1', 'new-regex'])
  })

  it('mergeRecordFacts drops stale llm but keeps clinician when content changed', () => {
    const previous = record([symptom('llm-1', 'llm'), symptom('clin-1', 'clinician')], 'hash1')
    const merged = mergeRecordFacts({
      regexFacts: [symptom('new-regex', 'regex')],
      previous,
      contentChanged: true,
    })
    const ids = merged.map((f) => f.id).sort()
    expect(ids).toEqual(['clin-1', 'new-regex'])
  })

  it('shouldRunLlmEnrichment skips when content unchanged, version current, and llm facts exist', () => {
    const existing = record([symptom('llm-1', 'llm')], 'hashA')
    expect(shouldRunLlmEnrichment(JOB, existing, 'hashA')).toBe(false)
  })

  it('shouldRunLlmEnrichment runs when content changed', () => {
    const existing = record([symptom('llm-1', 'llm')], 'hashA')
    expect(shouldRunLlmEnrichment(JOB, existing, 'hashB')).toBe(true)
  })

  it('shouldRunLlmEnrichment runs for a never-enriched fresh record', () => {
    const existing = record([symptom('r', 'regex')], 'hashA')
    expect(shouldRunLlmEnrichment(JOB, existing, 'hashA')).toBe(true)
  })

  it('shouldRunLlmEnrichment returns false for non-enrichable sources', () => {
    expect(shouldRunLlmEnrichment({ ...JOB, sourceType: 'lab' }, undefined, 'h')).toBe(false)
  })

  it('applyLlmFacts replaces previous llm facts but keeps regex + clinician', () => {
    const merged = applyLlmFacts(
      [symptom('regex-1', 'regex'), symptom('old-llm', 'llm'), symptom('clin', 'clinician')],
      [symptom('new-llm', 'llm')],
    )
    const ids = merged.map((f) => f.id).sort()
    expect(ids).toEqual(['clin', 'new-llm', 'regex-1'])
  })
})
