import { describe, expect, it } from 'vitest'
import type {
  MedicationEntry,
  MedicationStatus,
} from '../../../types/medicationPlan'
import { computeMedicationInsights } from '../medicationInsights'

function makeEntry(overrides: Partial<MedicationEntry> & { substance: string }): MedicationEntry {
  const status: MedicationStatus = overrides.status ?? 'active'
  return {
    id: overrides.id ?? overrides.substance.toLowerCase(),
    formulation: 'tablet',
    strength: '',
    doseSchedule: { morning: '', noon: '', evening: '', night: '', unit: 'mg' },
    doseLineGerman: overrides.doseLineGerman ?? '',
    prn: false,
    startDate: '2025-01-01',
    indication: '',
    status,
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: '2025-01-01T00:00:00.000Z',
    lastChangeAt: overrides.lastChangeAt ?? '2025-01-01T00:00:00.000Z',
    lastChangeType: 'start',
    history: [],
    ...overrides,
  }
}

describe('computeMedicationInsights', () => {
  it('derives active count, tried antipsychotics, last modified and targeted receptors from real reference data', () => {
    const meds = [
      makeEntry({ substance: 'Haloperidol', status: 'active', lastChangeAt: '2025-03-10T09:00:00.000Z' }),
      makeEntry({ substance: 'Risperidon', status: 'discontinued', lastChangeAt: '2025-02-01T09:00:00.000Z' }),
    ]

    const insights = computeMedicationInsights(meds, 'de')

    expect(insights.activeCount).toBe(1)
    // Risperidon is a discontinued antipsychotic → counts as previously tried.
    expect(insights.triedAntipsychotics).toContain('Risperidon')
    // Haloperidol (still active) must NOT be listed as previously tried.
    expect(insights.triedAntipsychotics).not.toContain('Haloperidol')
    // Most recent change across the whole plan.
    expect(insights.lastModifiedAt).toBe('2025-03-10T09:00:00.000Z')
    expect(insights.lastModifiedSubstances).toEqual(['Haloperidol'])
    // Haloperidol is a potent D2 blocker → D2 is a targeted receptor of the active regimen.
    expect(insights.targetedReceptors.map((r) => r.key)).toContain('d2')
    expect(insights.hasReferenceData).toBe(true)
  })

  it('returns graceful empty aggregates for an empty plan', () => {
    const insights = computeMedicationInsights([], 'de')
    expect(insights.activeCount).toBe(0)
    expect(insights.triedAntipsychotics).toEqual([])
    expect(insights.lastModifiedAt).toBeNull()
    expect(insights.targetedReceptors).toEqual([])
    expect(insights.keySideEffects).toEqual([])
    expect(insights.hasReferenceData).toBe(false)
  })

  it('ignores soft-deleted entries', () => {
    const meds = [
      makeEntry({ substance: 'Haloperidol', status: 'active' }),
      makeEntry({
        substance: 'Olanzapin',
        status: 'active',
        deletedAt: '2025-04-01T00:00:00.000Z',
      }),
    ]
    const insights = computeMedicationInsights(meds, 'de')
    expect(insights.activeCount).toBe(1)
  })

  it('builds a combined receptor fingerprint and flags antipsychotic polypharmacy', () => {
    const meds = [
      makeEntry({ substance: 'Haloperidol', status: 'active' }),
      makeEntry({ substance: 'Olanzapin', status: 'active' }),
    ]
    const insights = computeMedicationInsights(meds, 'de')

    // Two active antipsychotics → combined receptor profile + duplicate-class risk.
    expect(insights.combinedReceptorProfile).not.toBeNull()
    expect(insights.receptorContributors).toBe(2)
    const duplicate = insights.combinationRisks.find((r) => r.kind === 'duplicateClass')
    expect(duplicate).toBeDefined()
    expect(duplicate?.level).toBe('high') // antipsychotic polypharmacy
    expect(insights.combinationRiskLevel).toBe('high')
  })

  it('flags duplicate-class and QTc risks for Benperidol + Olanzapin', () => {
    const meds = [
      makeEntry({ substance: 'Benperidol', status: 'active' }),
      makeEntry({ substance: 'Olanzapin', status: 'active' }),
    ]
    const insights = computeMedicationInsights(meds, 'de')

    const kinds = insights.combinationRisks.map((risk) => risk.kind)
    expect(kinds).toContain('duplicateClass')
    expect(kinds).toContain('qtc')
    expect(
      insights.combinationRisks.every((risk) =>
        risk.drugs.includes('Benperidol') && risk.drugs.includes('Olanzapin'),
      ),
    ).toBe(true)
  })

  it('aggregates a monitoring burden from the active regimen', () => {
    const meds = [makeEntry({ substance: 'Haloperidol', status: 'active' })]
    const insights = computeMedicationInsights(meds, 'de')
    expect(insights.monitoringBurden.length).toBeGreaterThan(0)
    expect(insights.monitoringBurden[0]!.drugs).toContain('Haloperidol')
  })
})
