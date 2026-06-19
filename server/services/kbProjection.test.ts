import { describe, expect, it } from 'vitest'
import { projectKbSubstanceDetailToDrug } from './kbProjection'
import type { KbSubstanceDetail } from '../../src/types/kbNormalized'
import { getPharmacokinetics, sectionHasStructuredData } from '../../src/types/knowledgeBase'

function minimalDetail(overrides: Partial<KbSubstanceDetail> = {}): KbSubstanceDetail {
  const now = '2026-06-19T12:00:00.000Z'
  return {
    id: 'sub-1',
    genericName: 'Testdrug',
    normalizedGenericName: 'testdrug',
    substanceClass: 'Test class',
    category: 'Antipsychotika',
    primaryPsychiatricUses: ['Schizophrenie'],
    mechanismSummary: 'Mechanism',
    pharmacodynamicProfile: null,
    clinicalPearls: null,
    uncertaintyNotes: null,
    pregnancyLactationCaution: null,
    geriatricCaution: null,
    hepaticRenalCaution: null,
    contraindications: [],
    severeRisks: [],
    substanceClassDe: 'Testklasse',
    mechanismSummaryDe: 'Mechanismus DE',
    pharmacodynamicProfileDe: null,
    clinicalPearlsDe: null,
    uncertaintyNotesDe: null,
    pregnancyLactationCautionDe: null,
    geriatricCautionDe: null,
    hepaticRenalCautionDe: null,
    primaryPsychiatricUsesDe: ['Schizophrenie'],
    contraindicationsDe: [],
    severeRisksDe: [],
    translationStatus: 'complete',
    translatedAt: now,
    status: 'published',
    reviewStatus: 'approved',
    sourceQuality: 'ai_generated_unverified',
    needsClinicalReview: true,
    countryDefault: 'DE',
    createdAt: now,
    updatedAt: now,
    tradeNames: [],
    receptorAffinities: [],
    sideEffects: [],
    monitoring: [],
    dosageGuidance: [],
    pharmacokinetics: null,
    interactions: [],
    sources: [],
    countryPreparations: [],
    latestGeneration: null,
    ...overrides,
  }
}

describe('projectKbSubstanceDetailToDrug — pharmacokinetics', () => {
  it('projects German PK prose and structured pk block', () => {
    const detail = minimalDetail({
      pharmacokinetics: {
        id: 'pk-1',
        substanceId: 'sub-1',
        summary: 'English PK summary',
        summaryDe: 'Deutsche Pharmakokinetik mit HWZ 24 h.',
        halfLifeHours: 24,
        halfLifeNote: null,
        halfLifeNoteDe: 'aktiver Metabolit 9-OH',
        tmaxHours: 4,
        timeToSteadyStateDays: 7,
        bioavailabilityPercent: 70,
        proteinBindingPercent: 90,
        tdmLow: 20,
        tdmHigh: 60,
        tdmUnit: 'ng/ml',
        tdmNote: null,
        tdmNoteDe: 'Erhaltungstherapie',
        isEstimated: true,
        sourceNote: 'Fachinformation — verify',
      },
    })

    const drug = projectKbSubstanceDetailToDrug(detail)
    const pkSection = drug.sections.find((s) => s.key === 'pharmakokinetik')
    expect(pkSection).toBeDefined()
    expect(pkSection?.content).toBe('Deutsche Pharmakokinetik mit HWZ 24 h.')
    expect(pkSection?.kind).toBe('pk')
    expect(sectionHasStructuredData(pkSection!)).toBe(true)

    const pk = getPharmacokinetics(pkSection!)
    expect(pk?.halfLifeHours).toBe(24)
    expect(pk?.halfLifeNote).toBe('aktiver Metabolit 9-OH')
    expect(pk?.tdm?.lowNgMl).toBe(20)
    expect(pk?.tdm?.highNgMl).toBe(60)
  })

  it('leaves pharmakokinetik empty when no PK row exists', () => {
    const drug = projectKbSubstanceDetailToDrug(minimalDetail())
    const pkSection = drug.sections.find((s) => s.key === 'pharmakokinetik')
    expect(pkSection?.content).toBe('')
    expect(sectionHasStructuredData(pkSection!)).toBe(false)
  })
})
