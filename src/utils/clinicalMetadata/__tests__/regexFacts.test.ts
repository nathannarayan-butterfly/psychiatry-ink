import { describe, expect, it } from 'vitest'
import { extractClinicalImprint } from '../../clinicalImprint/extract'
import { buildRegexFacts, computeContentHash, needsLlmEnrichment } from '../regexFacts'
import { CMEA_EXTRACTOR_VERSION, CMEA_SCHEMA_VERSION } from '../../../types/clinicalMetadata'
import type { ClinicalImprintJob } from '../../../types/clinicalImprint'

const JOB: ClinicalImprintJob = {
  caseId: 'case-1',
  sourceType: 'manual_note',
  sourceId: 'aufnahme:document',
  text:
    'Patient berichtet über ausgeprägte Angst und Schlafstörung. ' +
    'Unter Olanzapin keine Besserung, daher abgesetzt. Aktuell Raucher. ' +
    'Akute Suizidgedanken werden verneint, jedoch Verdacht auf F32.1.',
  sourceDate: '2024-05-01T00:00:00.000Z',
  documentTypeId: 'aufnahme',
}

describe('CMEA Pass A regex facts', () => {
  it('attaches versioned facts + contentHash to the canonical metadata', () => {
    const metadata = extractClinicalImprint(JOB)
    expect(metadata).not.toBeNull()
    expect(metadata?.schemaVersion).toBe(CMEA_SCHEMA_VERSION)
    expect(metadata?.extractorVersion).toBe(CMEA_EXTRACTOR_VERSION)
    expect(metadata?.contentHash).toMatch(/^[0-9a-f]{8}$/)
    expect(Array.isArray(metadata?.facts)).toBe(true)
    expect((metadata?.facts.length ?? 0)).toBeGreaterThan(0)
  })

  it('every fact carries provenance with an extractor + sourceId (anti-fabrication)', () => {
    const facts = buildRegexFacts(JOB, extractClinicalImprint(JOB)!)
    for (const fact of facts) {
      expect(fact.provenance.extractor).toBe('regex')
      expect(fact.provenance.sourceId).toBe('aufnahme:document')
      expect(fact.provenance.confidence).toBeGreaterThan(0)
      expect(fact.id.startsWith('aufnahme:document:')).toBe(true)
    }
  })

  it('extracts symptom, medication_trial and lifestyle facts from free text', () => {
    const facts = buildRegexFacts(JOB, extractClinicalImprint(JOB)!)
    const symptom = facts.find((f) => f.kind === 'symptom')
    expect(symptom).toBeTruthy()

    const trial = facts.find((f) => f.kind === 'medication_trial')
    expect(trial && trial.kind === 'medication_trial' ? trial.substance : null).toBe('Olanzapin')
    expect(trial && trial.kind === 'medication_trial' ? trial.outcome : null).toBe('no_response')

    const smoking = facts.find((f) => f.kind === 'lifestyle')
    expect(smoking && smoking.kind === 'lifestyle' ? smoking.status : null).toBe('present')
  })

  it('produces a diagnosis_hint fact with an ICD code', () => {
    const facts = buildRegexFacts(JOB, extractClinicalImprint(JOB)!)
    const hint = facts.find((f) => f.kind === 'diagnosis_hint' && f.code === 'F32.1')
    expect(hint).toBeTruthy()
  })

  it('computeContentHash is stable + whitespace-insensitive', () => {
    expect(computeContentHash('a b  c')).toBe(computeContentHash('a   b c'))
    expect(computeContentHash('a b c')).not.toBe(computeContentHash('a b d'))
  })

  it('needsLlmEnrichment gates by source type + length', () => {
    expect(needsLlmEnrichment({ ...JOB, sourceType: 'anamnesis' })).toBe(true)
    // documentTypeId drives narrative detection even when type is generic.
    expect(needsLlmEnrichment({ ...JOB, sourceType: 'manual_note' })).toBe(true)
    expect(needsLlmEnrichment({ ...JOB, sourceType: 'lab', documentTypeId: undefined })).toBe(false)
    expect(
      needsLlmEnrichment({ ...JOB, sourceType: 'anamnesis', documentTypeId: undefined, text: 'kurz' }),
    ).toBe(false)
  })
})
