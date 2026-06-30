import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildPatientSafety,
  buildPpbHarmSignals,
  filterElevatedHarmSignals,
  isMeaningfulRiskRawValue,
} from '../patientSafety'
import type { ClinicalImprintRecord } from '../../../types/clinicalImprint'
import type { SafetyRiskSignal } from '../../../components/notion/overview/types'
import type { MedicationEntry } from '../../../types/medicationPlan'
import type {
  CombinationCheckStore,
  PatientCombinationCheckFinding,
} from '../../../types/combinationCheck'

function makeMedication(overrides: Partial<MedicationEntry> & { substance: string }): MedicationEntry {
  const { substance, ...rest } = overrides
  return {
    id: rest.id ?? `med-${substance.toLowerCase()}`,
    substance,
    formulation: 'tablet',
    strength: '100 mg',
    doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: 'mg' },
    doseLineGerman: `${substance} 100-0-0-0 mg`,
    prn: false,
    startDate: '2026-06-01',
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: '2026-06-01T09:00:00.000Z',
    lastChangeAt: '2026-06-01T09:00:00.000Z',
    lastChangeType: 'start',
    history: [],
    ...rest,
  }
}

function seedCombinationFinding(
  caseId: string,
  finding: PatientCombinationCheckFinding,
): void {
  const store: CombinationCheckStore = {
    version: 1,
    caseId,
    updatedAt: new Date().toISOString(),
    findings: [finding],
    aiRuns: [],
  }
  localStorage.setItem(
    `psychiatry-ink:combination-findings:${caseId}`,
    JSON.stringify(store),
  )
}

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

describe('isMeaningfulRiskRawValue', () => {
  it('rejects label echoes and generic suicidality fragments', () => {
    expect(isMeaningfulRiskRawValue('suicidality', 'Suizidale')).toBe(false)
    expect(isMeaningfulRiskRawValue('suicidality', 'Suizidalität')).toBe(false)
    expect(isMeaningfulRiskRawValue('suicidality', 'keine Suizidalität')).toBe(false)
  })

  it('accepts clinically specific suicidality documentation', () => {
    expect(isMeaningfulRiskRawValue('suicidality', 'passive Suizidgedanken')).toBe(true)
  })
})

describe('filterElevatedHarmSignals', () => {
  it('drops calm or meaningless harm axes for the PPB safety strip', () => {
    const signals: SafetyRiskSignal[] = [
      { id: 'suicidality', label: 'Suizidalität', value: 'Suizidale', tone: 'info' },
      {
        id: 'riskSelf',
        label: 'Akute Eigengefährdung',
        value: 'Suizidgedanken mit Plan',
        tone: 'high',
      },
    ]
    expect(filterElevatedHarmSignals(signals)).toHaveLength(1)
    expect(filterElevatedHarmSignals(signals)[0]?.id).toBe('riskSelf')
  })
})

describe('buildPpbHarmSignals', () => {
  it('combines all-negative axes into one calm line', () => {
    const signals = buildPpbHarmSignals({
      language: 'de',
      text: 'Keine Suizidalität. Keine Eigengefährdung. Keine Fremdgefährdung.',
    })
    expect(signals).toHaveLength(1)
    expect(signals[0]?.label).toBe('keine Suizidalität, keine Eigen- oder Fremdgefährdung')
    expect(signals[0]?.tone).toBe('ok')
  })

  it('shows individual axes with clinical detail when elevated', () => {
    const signals = buildPpbHarmSignals({
      language: 'de',
      suicidality: 'passive Suizidgedanken',
      riskSelf: 'keine',
      riskOthers: 'keine',
    })
    expect(signals.length).toBeGreaterThanOrEqual(2)
    const suicide = signals.find((s) => s.id === 'suicidality')
    expect(suicide?.value).toMatch(/suizidgedanken/i)
    expect(signals.some((s) => s.label === 'keine Eigengefährdung')).toBe(true)
  })

  it('localizes harm axis labels in English', () => {
    const signals = buildPpbHarmSignals({
      language: 'en',
      suicidality: 'passive suicidal thoughts',
      riskSelf: 'passive',
      riskOthers: 'none',
    })
    const selfHarm = signals.find((s) => s.id === 'riskSelf')
    expect(selfHarm?.label).toBe('Self-harm risk')
    expect(signals.some((s) => s.label === 'no risk to others')).toBe(true)
  })

  it('defaults missing documentation to negative axes', () => {
    const signals = buildPpbHarmSignals({ language: 'de', text: 'Affekt gedrückt, Antrieb reduziert.' })
    expect(signals).toHaveLength(1)
    expect(signals[0]?.label).toBe('keine Suizidalität, keine Eigen- oder Fremdgefährdung')
  })
})

describe('buildPatientSafety risk signals', () => {
  it('does not emit suicidality signals for imprint label echoes', () => {
    const safety = buildPatientSafety({
      medications: [],
      language: 'de',
      imprints: [makeImprint({ suicidality: 'Suizidale' })],
    })
    expect(safety.risk?.signals ?? []).toHaveLength(0)
  })

  it('emits elevated suicidality when clinically documented', () => {
    const safety = buildPatientSafety({
      medications: [],
      language: 'de',
      imprints: [makeImprint({ suicidality: 'aktive Suizidgedanken mit Plan' })],
    })
    const suicide = safety.risk?.signals?.find((s) => s.id === 'suicidality')
    expect(suicide?.tone).toBe('high')
    expect(suicide?.value).toMatch(/suizidgedanken/i)
  })

  it('localizes risk self-harm label in English', () => {
    const safety = buildPatientSafety({
      medications: [],
      language: 'en',
      imprints: [makeImprint({ riskSelf: 'passive' })],
    })
    const selfHarm = safety.risk?.signals?.find((s) => s.id === 'riskSelf')
    expect(selfHarm?.label).toBe('Self-harm risk')
  })

  it('localizes negated allergy alert in English', () => {
    const safety = buildPatientSafety({
      medications: [],
      language: 'en',
      imprints: [],
      allergyText: 'No known drug allergies.',
    })
    const allergy = safety.alerts.find((a) => a.category === 'allergy')
    expect(allergy?.title).toBe('No known allergies')
    expect(allergy?.tone).toBe('ok')
  })

  it('keeps German risk labels when language is German', () => {
    const safety = buildPatientSafety({
      medications: [],
      language: 'de',
      imprints: [makeImprint({ riskSelf: 'passive' })],
    })
    const selfHarm = safety.risk?.signals?.find((s) => s.id === 'riskSelf')
    expect(selfHarm?.label).toBe('Eigengefährdung')
  })
})

describe('buildPatientSafety — pair-name dedupe across KB and AI sources', () => {
  // Findings live in module-level cache inside combinationCheck/storage so we
  // use a fresh case id per test to avoid bleed and clear storage between runs.
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('emits exactly one row for a (Lithium, Sertralin) pair flagged by both KB and AI, preferring the KB severity', () => {
    const caseId = 'case-pair-dedupe-1'
    const aiFinding: PatientCombinationCheckFinding = {
      id: 'finding-ai-li-sert',
      caseId,
      // AI surfaced the same pair in the OPPOSITE order with LOWER severity —
      // proving the pair-name key is order-insensitive AND that the KB row
      // (not the AI row) is the one that survives.
      combinationKey: 'sertralin|lithium',
      substanceAName: 'Sertralin',
      substanceBName: 'Lithium',
      interactionType: 'pharmacodynamic',
      severity: 'low',
      mainRisk: 'AI: marginal serotonergic interaction',
      source: 'ai_suggestion',
      status: 'pending_clinician_review',
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
    }
    seedCombinationFinding(caseId, aiFinding)

    // Reference-data interactions are ASYMMETRIC: `findInteraction(a, b)` only
    // checks `a.interactions` for `b`'s names. Sertralin's reference entry
    // lists "Lithium" → moderate, so we order the medications so Sertralin
    // comes first to guarantee the KB cross-interaction row fires.
    const safety = buildPatientSafety({
      medications: [
        makeMedication({ substance: 'Sertralin' }),
        makeMedication({ substance: 'Lithium' }),
      ],
      language: 'de',
      imprints: [],
      caseId,
    })

    const pairAlerts = safety.alerts.filter(
      (a) =>
        a.category === 'interaction' &&
        /lithium/i.test(a.title) &&
        /sertralin/i.test(a.title),
    )
    expect(pairAlerts, 'duplicate Lithium × Sertralin rows must be merged').toHaveLength(1)
    // KB cross-interactions emit `ix:A:B`; AI findings emit `cc:<uuid>`. The
    // kept row must be the KB row (id prefix `ix:`), which carries the higher
    // severity and the curated clinical note instead of the AI free-text.
    expect(pairAlerts[0]?.id).toMatch(/^ix:/)
    expect(pairAlerts[0]?.tone).toBe('moderate')
    expect(pairAlerts[0]?.detail).not.toContain('AI:')
  })

  it('keeps AI findings for pairs the KB does not cover', () => {
    const caseId = 'case-pair-dedupe-2'
    const aiFinding: PatientCombinationCheckFinding = {
      id: 'finding-ai-novel',
      caseId,
      combinationKey: 'lithium|novel-substance',
      substanceAName: 'Lithium',
      substanceBName: 'Novel-Substance',
      interactionType: 'pharmacodynamic',
      severity: 'moderate',
      mainRisk: 'AI: hypothetical risk',
      source: 'ai_suggestion',
      status: 'pending_clinician_review',
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
    }
    seedCombinationFinding(caseId, aiFinding)

    const safety = buildPatientSafety({
      medications: [makeMedication({ substance: 'Lithium' })],
      language: 'de',
      imprints: [],
      caseId,
    })

    const aiRow = safety.alerts.find((a) => a.id.startsWith('cc:'))
    expect(aiRow, 'AI finding for a non-KB pair must survive dedupe').toBeDefined()
    expect(aiRow?.title).toContain('Lithium')
    expect(aiRow?.title).toContain('Novel-Substance')
  })
})
