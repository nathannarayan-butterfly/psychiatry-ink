import { describe, it, expect, beforeEach } from 'vitest'
import { buildDemoClinicalIntelligenceState } from '../../../demo/buildDemoClinicalIntelligence'
import { DEMO_CASE_ID } from '../../../demo/constants'
import {
  clinicalIntelligenceStorageKey,
  loadClinicalIntelligenceState,
  salvageClinicalIntelligenceStateFromRaw,
} from '../storage'

describe('clinical intelligence storage salvage', () => {
  beforeEach(() => {
    localStorage.removeItem(clinicalIntelligenceStorageKey(DEMO_CASE_ID))
  })

  it('loads salvaged latestRun from invalid persisted envelope', () => {
    const demo = buildDemoClinicalIntelligenceState()
    localStorage.setItem(
      clinicalIntelligenceStorageKey(DEMO_CASE_ID),
      JSON.stringify({
        version: 99,
        caseId: DEMO_CASE_ID,
        latestRun: demo.latestRun,
      }),
    )

    const loaded = loadClinicalIntelligenceState(DEMO_CASE_ID)
    expect(loaded.latestRun?.dimensional.activeDimensions.length).toBeGreaterThan(0)
  })

  it('returns null salvage when latestRun is invalid', () => {
    expect(
      salvageClinicalIntelligenceStateFromRaw(DEMO_CASE_ID, {
        version: 1,
        caseId: DEMO_CASE_ID,
        latestRun: { builtAt: 'bad' },
      }),
    ).toBeNull()
  })
})
