import { describe, expect, it, vi } from 'vitest'
import {
  ClinicalIntelligenceEvidenceMissingError,
  runClinicalIntelligencePipeline,
} from '../pipeline'
import { emptyClinicalIntelligenceCaseState } from '../../../types/clinicalIntelligence'
import * as api from '../api'
import type { CompactEvidencePayload } from '../../../types/clinicalIntelligence'

function makeEvidence(text = 'Patient describes persistent low mood and loss of interest.'): CompactEvidencePayload {
  return {
    caseId: 'case-1',
    builtAt: '2026-06-20T10:00:00.000Z',
    isDeidentified: true,
    patientLabel: 'Patient',
    items: [{ id: 'anam-1', category: 'anamnesis', label: 'Anamnese', text }],
  }
}

describe('runClinicalIntelligencePipeline', () => {
  it('blocks the run when the evidence base is missing/too thin', async () => {
    const result = await runClinicalIntelligencePipeline({
      caseId: 'c1',
      language: 'de',
      state: emptyClinicalIntelligenceCaseState('c1'),
      evidence: { ...makeEvidence(), items: [] },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('evidence_base_missing')
      expect(result.error).toBeInstanceOf(ClinicalIntelligenceEvidenceMissingError)
      expect(result.state.audit[0].action).toBe('evidence-base-missing')
    }
  })

  it('blocks when the evidence is in raw-document shape (not compact)', async () => {
    const raw = {
      ...makeEvidence(),
      documents: [{ id: 'doc-1', body: 'raw PHI content' }],
    } as unknown as CompactEvidencePayload
    const result = await runClinicalIntelligencePipeline({
      caseId: 'c1',
      language: 'de',
      state: emptyClinicalIntelligenceCaseState('c1'),
      evidence: raw,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('evidence_invalid')
      expect(result.state.audit[0].action).toBe('run-failed')
      expect(result.state.audit[0].notes).toContain('raw document shape')
    }
  })

  it('records run-started and run-completed when the API succeeds', async () => {
    const spy = vi.spyOn(api, 'runClinicalIntelligence').mockResolvedValue({
      builtAt: '2026-06-20T10:00:00.000Z',
      language: 'de',
      dimensional: {
        activeDimensions: [
          {
            dimensionId: 'depressive-inhibition',
            dimensionName: 'Depressive Inhibition',
            severity: 3,
            confidence: 'moderate',
            longitudinalPattern: '',
            supportingEvidenceIds: ['anam-1'],
            contradictingEvidenceIds: [],
            clinicalSummary: 'Mood and energy depressed',
            uncertainty: '',
            missingData: '',
            reviewStatus: 'pending',
            source: 'evidence_based',
          },
        ],
        exploratoryInsufficientEvidence: [],
        quarantined: [],
      },
      mechanism: {
        activeMechanisms: [],
        exploratoryInsufficientEvidence: [],
        quarantined: [],
      },
      evidenceItemCount: 1,
      diagnostics: { dimensional: null, mechanism: null },
    })

    const result = await runClinicalIntelligencePipeline({
      caseId: 'c1',
      language: 'de',
      state: emptyClinicalIntelligenceCaseState('c1'),
      evidence: makeEvidence(),
    })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const actions = result.state.audit.map((entry) => entry.action)
      expect(actions).toContain('run-started')
      expect(actions).toContain('run-completed')
      expect(result.state.latestRun?.dimensional.activeDimensions[0].dimensionId).toBe(
        'depressive-inhibition',
      )
    }
    spy.mockRestore()
  })

  it('records run-failed and surfaces api_error when the API throws', async () => {
    const spy = vi
      .spyOn(api, 'runClinicalIntelligence')
      .mockRejectedValue(new Error('upstream 500'))

    const result = await runClinicalIntelligencePipeline({
      caseId: 'c1',
      language: 'de',
      state: emptyClinicalIntelligenceCaseState('c1'),
      evidence: makeEvidence(),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('api_error')
      expect(result.state.audit.some((e) => e.action === 'run-failed')).toBe(true)
    }
    spy.mockRestore()
  })

  it('forwards previously rejected dimension/mechanism ids to the API', async () => {
    const spy = vi.spyOn(api, 'runClinicalIntelligence').mockResolvedValue({
      builtAt: '2026-06-20T10:00:00.000Z',
      language: 'de',
      dimensional: { activeDimensions: [], exploratoryInsufficientEvidence: [], quarantined: [] },
      mechanism: { activeMechanisms: [], exploratoryInsufficientEvidence: [], quarantined: [] },
      evidenceItemCount: 1,
      diagnostics: { dimensional: null, mechanism: null },
    })

    const state = {
      ...emptyClinicalIntelligenceCaseState('c1'),
      rejectedDimensionIds: ['anxiety-threat-anticipation'] as const,
      rejectedMechanismIds: ['trauma-limbic-hyperreactivity'] as const,
    } as unknown as ReturnType<typeof emptyClinicalIntelligenceCaseState>

    await runClinicalIntelligencePipeline({
      caseId: 'c1',
      language: 'de',
      state,
      evidence: makeEvidence(),
    })
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        rejectedDimensionIds: ['anxiety-threat-anticipation'],
        rejectedMechanismIds: ['trauma-limbic-hyperreactivity'],
      }),
    )
    spy.mockRestore()
  })
})
