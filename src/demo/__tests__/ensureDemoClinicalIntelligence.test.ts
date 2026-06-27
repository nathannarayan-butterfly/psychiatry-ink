import { describe, it, expect, beforeEach } from 'vitest'
import { buildDemoClinicalIntelligenceState } from '../buildDemoClinicalIntelligence'
import { DEMO_CASE_ID } from '../constants'
import {
  ensureDemoClinicalIntelligenceForCase,
  hasClinicianConductedClinicalIntelligence,
} from '../ensureDemoClinicalIntelligence'
import { emptyClinicalIntelligenceCaseState } from '../../types/clinicalIntelligence'
import {
  clinicalIntelligenceStorageKey,
  loadClinicalIntelligenceState,
  saveClinicalIntelligenceState,
} from '../../utils/clinicalIntelligence/storage'

describe('ensureDemoClinicalIntelligenceForCase', () => {
  beforeEach(() => {
    localStorage.removeItem(clinicalIntelligenceStorageKey(DEMO_CASE_ID))
  })

  it('restores pre-baked demo CI when local state is empty', () => {
    const repaired = ensureDemoClinicalIntelligenceForCase(DEMO_CASE_ID)
    expect(repaired.latestRun?.dimensional.activeDimensions.length).toBeGreaterThan(0)
    expect(repaired.latestRun?.diagnostics.dimensional?.provider).toBe('demo')

    const loaded = loadClinicalIntelligenceState(DEMO_CASE_ID)
    expect(loaded.latestRun?.dimensional.activeDimensions.length).toBeGreaterThan(0)
  })

  it('does not overwrite a clinician live run', () => {
    const liveRun = buildDemoClinicalIntelligenceState().latestRun!
    const liveState = {
      ...emptyClinicalIntelligenceCaseState(DEMO_CASE_ID),
      latestRun: {
        ...liveRun,
        diagnostics: {
          dimensional: {
            ...liveRun.diagnostics.dimensional!,
            provider: 'anthropic',
          },
          mechanism: {
            ...liveRun.diagnostics.mechanism!,
            provider: 'anthropic',
          },
        },
      },
      audit: [
        {
          id: 'live-run',
          timestamp: '2026-06-20T10:00:00.000Z',
          action: 'run-completed' as const,
          actor: 'clinician',
          targetKind: 'run' as const,
          targetId: '2026-06-20T10:00:00.000Z',
          notes: 'Live pipeline run',
        },
      ],
    }
    saveClinicalIntelligenceState(liveState)

    const repaired = ensureDemoClinicalIntelligenceForCase(DEMO_CASE_ID)
    expect(repaired.latestRun?.diagnostics.dimensional?.provider).toBe('anthropic')
    expect(hasClinicianConductedClinicalIntelligence(liveState)).toBe(true)
  })

  it('preserves clinician comment when repairing empty demo state', () => {
    const empty = emptyClinicalIntelligenceCaseState(DEMO_CASE_ID)
    saveClinicalIntelligenceState({
      ...empty,
      clinicianComment: 'Custom review note',
    })

    const repaired = ensureDemoClinicalIntelligenceForCase(DEMO_CASE_ID)
    expect(repaired.clinicianComment).toBe('Custom review note')
    expect(repaired.latestRun?.dimensional.activeDimensions.length).toBeGreaterThan(0)
  })
})
