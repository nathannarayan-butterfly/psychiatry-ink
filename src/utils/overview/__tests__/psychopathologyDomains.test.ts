import { describe, expect, it } from 'vitest'
import type { ClinicalImprintRecord } from '../../../types/clinicalImprint'
import {
  buildPsychopathologyStructuredCues,
  mergePsychopathologyProfiles,
  resolvePsychopathologyGroup,
} from '../psychopathologyDomains'

function makeImprint(overrides: Partial<ClinicalImprintRecord> = {}): ClinicalImprintRecord {
  return {
    imprintKey: 'test:1',
    patientId: 'p1',
    caseId: 'c1',
    sourceType: 'verlauf',
    sourceId: '1',
    sourceDate: '2026-06-01',
    createdAt: '2026-06-01T00:00:00.000Z',
    readableClinicalSentence: 'Test',
    clinicalDomain: 'psychopathology',
    symptoms: [],
    severity: null,
    courseDirection: null,
    affect: null,
    drive: null,
    thoughtForm: null,
    thoughtContent: null,
    perception: null,
    selfDisturbance: null,
    cognition: null,
    sleep: null,
    cooperation: null,
    insight: null,
    riskSelf: null,
    riskOthers: null,
    aggression: null,
    suicidality: null,
    functioning: null,
    socialInteraction: null,
    hygieneSelfCare: null,
    medicationMentioned: [],
    medicationResponse: null,
    sideEffects: null,
    adherence: null,
    diagnosisHints: [],
    differentialDiagnosisHints: [],
    uncertainty: null,
    evidenceStrength: 'direct_observation',
    evidenceText: null,
    evidenceQuoteRange: null,
    analysisEligible: true,
    excludeReason: null,
    ...overrides,
  }
}

describe('resolvePsychopathologyGroup', () => {
  it('maps ICD-10 prefixes to disorder groups', () => {
    expect(resolvePsychopathologyGroup('F20.0')).toBe('psychotic')
    expect(resolvePsychopathologyGroup('f32.1')).toBe('mood')
    expect(resolvePsychopathologyGroup('F41.1')).toBe('anxiety_ocd')
    expect(resolvePsychopathologyGroup('F42.0')).toBe('anxiety_ocd')
    expect(resolvePsychopathologyGroup('F90.0')).toBe('adhd')
    expect(resolvePsychopathologyGroup('F12.2')).toBe('substance')
    expect(resolvePsychopathologyGroup('F60.3')).toBe('personality')
    expect(resolvePsychopathologyGroup('G30.1')).toBeNull()
    expect(resolvePsychopathologyGroup('')).toBeNull()
  })
})

describe('mergePsychopathologyProfiles', () => {
  it('returns generic slots when no mappable ICD codes exist', () => {
    const merged = mergePsychopathologyProfiles(['', 'Z99.9'])
    expect(merged.contextLabel).toBeNull()
    expect(merged.groups).toEqual([])
    expect(merged.slots.map((s) => s.field)).toEqual(['affect', 'drive', 'thoughtContent', 'insight'])
  })

  it('prioritizes primary diagnosis slots then merges secondary without duplicate fields', () => {
    const merged = mergePsychopathologyProfiles(['F20.0', 'F12.2', 'F15.2'], 6)
    expect(merged.contextLabel).toBe('schizophrenes Spektrum')
    expect(merged.groups).toEqual(['psychotic', 'substance'])
    expect(merged.slots.map((s) => s.field)).toEqual([
      'thoughtContent',
      'perception',
      'selfDisturbance',
      'thoughtForm',
      'insight',
      'affect',
    ])
  })

  it('caps merged slots at maxSlots', () => {
    const merged = mergePsychopathologyProfiles(['F20.0'], 4)
    expect(merged.slots).toHaveLength(4)
  })

  it('orders mood before anxiety when mood is primary', () => {
    const merged = mergePsychopathologyProfiles(['F32.1', 'F41.1'], 6)
    expect(merged.contextLabel).toBe('affektive Störung')
    expect(merged.groups).toEqual(['mood', 'anxiety_ocd'])
    expect(merged.slots[0]).toEqual({ field: 'affect', label: 'Affekt' })
  })
})

describe('buildPsychopathologyStructuredCues', () => {
  it('uses generic documented four when no diagnosis mapping applies', () => {
    const imprint = makeImprint({
      affect: 'gedrückt',
      drive: 'vermindert',
      thoughtContent: 'unauffällig',
    })
    const cues = buildPsychopathologyStructuredCues(imprint, [])
    expect(cues).toEqual([
      { label: 'Affekt', value: 'gedrückt' },
      { label: 'Antrieb', value: 'vermindert' },
      { label: 'Denkinhalt', value: 'unauffällig' },
    ])
  })

  it('surfaces psychosis-priority fields for F20 with nicht dokumentiert gaps', () => {
    const imprint = makeImprint({
      thoughtContent: 'wahnhaft-paranoid',
      thoughtForm: 'umständlich',
      insight: 'gering',
    })
    const cues = buildPsychopathologyStructuredCues(imprint, ['F20.0'])
    expect(cues).toEqual([
      { label: 'Denkinhalt', value: 'wahnhaft-paranoid' },
      { label: 'Wahrnehmung', value: 'nicht dokumentiert' },
      { label: 'Ich-Störungen', value: 'nicht dokumentiert' },
      { label: 'Formaler Denkablauf', value: 'umständlich' },
      { label: 'Krankheitseinsicht', value: 'gering' },
    ])
  })

  it('falls back to generic documented cues when profile fields are all empty', () => {
    const imprint = makeImprint({
      thoughtContent: 'wahnhaft',
      cognition: 'orientiert',
    })
    const cues = buildPsychopathologyStructuredCues(imprint, ['F32.1'])
    expect(cues).toEqual([{ label: 'Denkinhalt', value: 'wahnhaft' }])
  })

  it('shows mood-priority slots when mood fields are documented', () => {
    const imprint = makeImprint({
      affect: 'gedrückt',
      drive: 'vermindert',
      sleep: 'Ein- und Durchschlafstörung',
      suicidality: 'passiv',
      insight: 'vorhanden',
    })
    const cues = buildPsychopathologyStructuredCues(imprint, ['F32.1'])
    expect(cues.map((c) => c.label)).toEqual([
      'Affekt',
      'Antrieb',
      'Schlaf',
      'Suizidalität',
      'Krankheitseinsicht',
    ])
  })

  it('returns empty array when imprint is null', () => {
    expect(buildPsychopathologyStructuredCues(null, ['F20.0'])).toEqual([])
  })
})
