import { beforeEach, describe, expect, it } from 'vitest'
import type { CombinationRisk } from '../../medication/medicationInsights'
import { buildCombinationKeyFromNames } from '../combinationKey'
import {
  filterCombinationRisksByClinicianDecisions,
  groupCombinationRisksByDrugSet,
  resolveCombinationRisksForDisplay,
} from '../combinationRiskDisplay'
import { saveCombinationCheckStore } from '../storage'
import type { PatientCombinationCheckFinding } from '../../../types/combinationCheck'

const CASE_ID = 'case-combo-display-test'

function makeRisk(
  overrides: Partial<CombinationRisk> & Pick<CombinationRisk, 'kind' | 'drugs'>,
): CombinationRisk {
  return {
    level: 'high',
    ...overrides,
  }
}

function makeFinding(
  overrides: Partial<PatientCombinationCheckFinding> & { combinationKey: string },
): PatientCombinationCheckFinding {
  const now = '2026-06-19T10:00:00.000Z'
  const { combinationKey, ...rest } = overrides
  return {
    id: rest.id ?? `finding-${combinationKey}`,
    caseId: CASE_ID,
    combinationKey,
    substanceAName: rest.substanceAName ?? 'Benperidol',
    substanceBName: rest.substanceBName ?? 'Olanzapin',
    interactionType: rest.interactionType ?? 'pharmacodynamic',
    severity: rest.severity ?? 'high',
    mainRisk: rest.mainRisk ?? 'Polypharmazie',
    source: rest.source ?? 'knowledge_base',
    status: rest.status ?? 'verified_kb',
    createdAt: rest.createdAt ?? now,
    updatedAt: rest.updatedAt ?? now,
    ...rest,
  }
}

beforeEach(() => {
  localStorage.clear()
  saveCombinationCheckStore({
    version: 1,
    caseId: CASE_ID,
    updatedAt: new Date().toISOString(),
    findings: [],
    aiRuns: [],
  })
})

describe('groupCombinationRisksByDrugSet', () => {
  it('groups Mehrfachtherapie and QTc for the same Benperidol + Olanzapin pair', () => {
    const grouped = groupCombinationRisksByDrugSet([
      makeRisk({
        kind: 'duplicateClass',
        drugs: ['Benperidol', 'Olanzapin'],
        detail: 'Antipsychotikum (FGA)',
      }),
      makeRisk({
        kind: 'qtc',
        drugs: ['Benperidol', 'Olanzapin'],
      }),
    ])

    expect(grouped).toHaveLength(1)
    expect(grouped[0]?.drugs).toEqual(['Benperidol', 'Olanzapin'])
    expect(grouped[0]?.risks.map((risk) => risk.kind)).toEqual(['duplicateClass', 'qtc'])
  })
})

describe('filterCombinationRisksByClinicianDecisions', () => {
  it('hides auto-derived risks after the pair was marked not relevant in Kombinationscheck', () => {
    const pairKey = buildCombinationKeyFromNames('Benperidol', 'Olanzapin')
    saveCombinationCheckStore({
      version: 1,
      caseId: CASE_ID,
      updatedAt: new Date().toISOString(),
      findings: [
        makeFinding({
          combinationKey: pairKey,
          status: 'not_relevant',
          substanceAName: 'Benperidol',
          substanceBName: 'Olanzapin',
        }),
      ],
      aiRuns: [],
    })

    const filtered = filterCombinationRisksByClinicianDecisions(
      [
        makeRisk({ kind: 'duplicateClass', drugs: ['Benperidol', 'Olanzapin'] }),
        makeRisk({ kind: 'qtc', drugs: ['Benperidol', 'Olanzapin'] }),
      ],
      CASE_ID,
    )

    expect(filtered).toHaveLength(0)
  })
})

describe('resolveCombinationRisksForDisplay', () => {
  it('returns one grouped row for Benperidol + Olanzapin with both risk types', () => {
    const rows = resolveCombinationRisksForDisplay(
      [
        makeRisk({
          kind: 'duplicateClass',
          drugs: ['Benperidol', 'Olanzapin'],
          detail: 'Antipsychotikum (FGA)',
        }),
        makeRisk({ kind: 'qtc', drugs: ['Benperidol', 'Olanzapin'] }),
      ],
      CASE_ID,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.risks).toHaveLength(2)
  })
})
