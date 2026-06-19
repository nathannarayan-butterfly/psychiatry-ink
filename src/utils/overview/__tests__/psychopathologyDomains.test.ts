import { describe, expect, it } from 'vitest'
import type { ClinicalImprintRecord } from '../../../types/clinicalImprint'
import {
  amdpOverviewDomainCount,
  buildAmdpOverviewGrid,
  buildAmdpOverviewGridWithMeta,
  buildPsychopathologyStructuredCues,
  dedupeRiskDomainAssessments,
  inferTriStateFromText,
  isMeaningfulDetail,
  mergePsychopathologyProfiles,
  resolvePsychopathologyGroup,
  sanitizePsychopathDomainAssessment,
} from '../psychopathologyDomains'
import {
  PSYCHOPATH_EXTRACT_FIELD_LABELS,
  PSYCHOPATH_OVERVIEW_DOMAIN_ORDER,
} from '../../../schemas/psychopath/extraction'

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

describe('inferTriStateFromText', () => {
  it('maps unremarkable phrases to negative', () => {
    expect(inferTriStateFromText('unauffällig')).toBe('negative')
    expect(inferTriStateFromText('keine Suizidalität')).toBe('negative')
  })

  it('maps ambiguous phrases to unclear', () => {
    expect(inferTriStateFromText('unklar')).toBe('unclear')
  })

  it('maps documented findings to positive', () => {
    expect(inferTriStateFromText('gedrückt')).toBe('positive')
  })
})

describe('isMeaningfulDetail', () => {
  it('rejects domain label echoes and generic keyword fragments', () => {
    expect(isMeaningfulDetail('Gedanken', 'thoughtForm')).toBe(false)
    expect(isMeaningfulDetail('Antrieb', 'drive')).toBe(false)
    expect(isMeaningfulDetail('Suizidale', 'suicidality')).toBe(false)
    expect(isMeaningfulDetail('Kontakt', 'socialInteraction')).toBe(false)
    expect(isMeaningfulDetail('Krankheitseinsicht', 'insight')).toBe(false)
  })

  it('accepts concise clinical qualifiers', () => {
    expect(isMeaningfulDetail('gedämpft', 'thoughtForm')).toBe(true)
    expect(isMeaningfulDetail('reduziert', 'drive')).toBe(true)
    expect(isMeaningfulDetail('Suizidgedanken', 'suicidality')).toBe(true)
    expect(isMeaningfulDetail('zurückgezogen', 'socialInteraction')).toBe(true)
    expect(isMeaningfulDetail('fehlend', 'insight')).toBe(true)
  })
})

describe('sanitizePsychopathDomainAssessment', () => {
  it('downgrades label-echo positives to negative', () => {
    const sanitized = sanitizePsychopathDomainAssessment({
      domainKey: 'drive',
      status: 'positive',
      detail: 'Antrieb',
    })
    expect(sanitized.status).toBe('negative')
    expect(sanitized.detail).toBeNull()
  })

  it('downgrades tri-state status words used as detail', () => {
    for (const detail of ['unklar', 'positiv', 'negativ', 'positive', 'negative']) {
      const sanitized = sanitizePsychopathDomainAssessment({
        domainKey: 'affect',
        status: 'positive',
        detail,
      })
      expect(sanitized.status).toBe('negative')
      expect(sanitized.detail).toBeNull()
    }
  })
})

describe('buildAmdpOverviewGrid detail validation', () => {
  it('never emits positive rows whose detail echoes the domain label', () => {
    const imprint = makeImprint({
      thoughtForm: 'Gedanken',
      drive: 'Antrieb',
      suicidality: 'Suizidale',
      socialInteraction: 'Kontakt',
      insight: 'Krankheitseinsicht',
    })
    const cues = buildAmdpOverviewGrid({ imprint, showAllDomains: true })
    const positiveCues = cues.filter((cue) => cue.status === 'positive')

    for (const cue of positiveCues) {
      const detail = cue.value?.trim() ?? ''
      expect(detail.length).toBeGreaterThanOrEqual(3)
      const label = PSYCHOPATH_EXTRACT_FIELD_LABELS[cue.domainKey!].toLowerCase()
      expect(detail.toLowerCase()).not.toBe(label)
      expect(label.includes(detail.toLowerCase())).toBe(false)
    }

    expect(positiveCues).toHaveLength(0)
  })

  it('keeps clinically meaningful imprint findings', () => {
    const imprint = makeImprint({
      thoughtForm: 'gedämpft',
      drive: 'reduziert',
      affect: 'gedrückt',
    })
    const cues = buildAmdpOverviewGrid({ imprint })
    expect(cues.map((c) => c.domainKey)).toEqual(['thoughtForm', 'affect', 'drive'])
    expect(cues.every((c) => isMeaningfulDetail(c.value ?? null, c.domainKey!))).toBe(true)
  })
})

describe('dedupeRiskDomainAssessments', () => {
  it('drops overlapping riskSelf when suicidality carries the same phrase', () => {
    const deduped = dedupeRiskDomainAssessments([
      { domainKey: 'suicidality', status: 'negative', detail: 'keine Suizidalität' },
      { domainKey: 'riskSelf', status: 'negative', detail: 'keine Suizidalität' },
      { domainKey: 'affect', status: 'positive', detail: 'gedrückt' },
    ])
    expect(deduped.find((d) => d.domainKey === 'riskSelf')?.status).toBe('negative')
    expect(deduped.find((d) => d.domainKey === 'riskSelf')?.detail).toBeNull()
  })
})

describe('amdpOverviewDomainCount', () => {
  it('covers the complete AMDP overview domain set', () => {
    expect(amdpOverviewDomainCount()).toBe(PSYCHOPATH_OVERVIEW_DOMAIN_ORDER.length)
    expect(amdpOverviewDomainCount()).toBe(23)
  })
})

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
})

describe('buildAmdpOverviewGrid', () => {
  it('returns only positive or unclear domains by default', () => {
    const imprint = makeImprint({
      affect: 'gedrückt',
      drive: 'vermindert',
      thoughtContent: 'unauffällig',
    })
    const cues = buildAmdpOverviewGrid({ imprint })
    expect(cues.map((c) => c.domainKey)).toEqual(['affect', 'drive'])
    expect(cues.every((c) => c.status !== 'negative')).toBe(true)
  })

  it('shows all AMDP subheadings when showAllDomains is true', () => {
    const imprint = makeImprint({ affect: 'gedrückt' })
    const cues = buildAmdpOverviewGrid({ imprint, showAllDomains: true })
    expect(cues).toHaveLength(20)
    expect(cues.filter((c) => c.status === 'positive')).toHaveLength(1)
    expect(cues.find((c) => c.domainKey === 'affect')?.value).toBe('gedrückt')
    expect(cues.find((c) => c.domainKey === 'drive')?.status).toBe('negative')
  })

  it('merges legacy cognition into attention and prefers AI field values', () => {
    const imprint = makeImprint({ cognition: 'konzentriert' })
    const cues = buildAmdpOverviewGrid({
      imprint,
      aiFields: { memory: 'Kurzzeit gestört', consciousness: 'wach' },
    })
    expect(cues.find((c) => c.domainKey === 'consciousness')?.value).toBe('wach')
    expect(cues.find((c) => c.domainKey === 'attention')?.value).toBe('konzentriert')
    expect(cues.find((c) => c.domainKey === 'memory')?.value).toBe('Kurzzeit gestört')
  })

  it('never emits nicht dokumentiert placeholders', () => {
    const cues = buildAmdpOverviewGrid({
      imprint: makeImprint({ thoughtContent: 'wahnhaft' }),
      showAllDomains: true,
    })
    expect(cues.some((c) => c.value === 'nicht dokumentiert')).toBe(false)
  })

  it('flags unremarkable domains for summary sentence', () => {
    const meta = buildAmdpOverviewGridWithMeta({
      imprint: makeImprint({ affect: 'gedrückt', thoughtContent: 'unauffällig' }),
    })
    expect(meta.cues).toHaveLength(1)
    expect(meta.hasUnremarkableDomains).toBe(true)
  })

  it('excludes risk domains from the compact overview grid', () => {
    const meta = buildAmdpOverviewGridWithMeta({
      imprint: makeImprint({
        affect: 'gedrückt',
        suicidality: 'Suizidgedanken passiv',
        riskSelf: 'keine akute Selbstgefährdung',
      }),
      showAllDomains: true,
    })
    expect(meta.cues.some((c) => c.domainKey === 'suicidality')).toBe(false)
    expect(meta.cues.some((c) => c.domainKey === 'riskSelf')).toBe(false)
    expect(meta.cues.find((c) => c.domainKey === 'affect')?.value).toBe('gedrückt')
  })
})

describe('buildPsychopathologyStructuredCues', () => {
  it('delegates to the AMDP grid builder', () => {
    const imprint = makeImprint({ affect: 'labil', insight: 'vorhanden' })
    const cues = buildPsychopathologyStructuredCues(imprint, ['F32.1'], null, { showAllDomains: true })
    expect(cues).toHaveLength(20)
    expect(cues.find((c) => c.domainKey === 'affect')?.value).toBe('labil')
  })

  it('returns empty array when imprint is null and no AI fields', () => {
    expect(buildPsychopathologyStructuredCues(null, ['F20.0'])).toEqual([])
  })
})
