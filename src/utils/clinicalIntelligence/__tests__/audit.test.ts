import { describe, it, expect } from 'vitest'
import {
  acceptAllPendingDimensions,
  acceptAllPendingMechanisms,
  acceptDimension,
  acceptMechanism,
  appendAuditEntry,
  editDimension,
  editMechanism,
  recordEvidenceBaseMissing,
  recordRunCompleted,
  recordRunFailed,
  recordRunStarted,
  rejectDimension,
  rejectMechanism,
} from '../audit'
import {
  emptyClinicalIntelligenceCaseState,
  type ClinicalIntelligenceCaseState,
  type ClinicalIntelligenceRunResponse,
} from '../../../types/clinicalIntelligence'

function makeRun(): ClinicalIntelligenceRunResponse {
  return {
    builtAt: '2026-06-20T10:00:00.000Z',
    language: 'de',
    dimensional: {
      activeDimensions: [
        {
          dimensionId: 'anxiety-threat-anticipation',
          dimensionName: 'Angst',
          severity: 3,
          confidence: 'moderate',
          longitudinalPattern: 'persistierend',
          supportingEvidenceIds: ['anam-1'],
          contradictingEvidenceIds: [],
          clinicalSummary: 'Anxious anticipation prominent.',
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
      activeMechanisms: [
        {
          mechanismId: 'trauma-limbic-hyperreactivity',
          label: 'Trauma–Limbic Hyperreactivity',
          confidence: 'moderate',
          linkedDimensions: ['anxiety-threat-anticipation'],
          supportingEvidenceIds: ['anam-1'],
          contradictingEvidenceIds: [],
          clinicalImplication: 'Heightened threat processing.',
          treatmentRelevance: 'Consider trauma-focused therapy.',
          uncertainty: '',
          reviewStatus: 'pending',
          source: 'evidence_based',
        },
      ],
      exploratoryInsufficientEvidence: [],
      quarantined: [],
    },
    evidenceItemCount: 1,
    diagnostics: { dimensional: null, mechanism: null },
  }
}

function stateWithRun(): ClinicalIntelligenceCaseState {
  const base = emptyClinicalIntelligenceCaseState('case-1')
  return { ...base, latestRun: makeRun() }
}

describe('audit helpers', () => {
  it('appends a run-started entry to the audit log', () => {
    const state = recordRunStarted(emptyClinicalIntelligenceCaseState('c1'))
    expect(state.audit.length).toBe(1)
    expect(state.audit[0].action).toBe('run-started')
    expect(state.audit[0].targetKind).toBe('run')
    expect(state.audit[0].id).toBeTruthy()
  })

  it('records run-completed with dimension/mechanism counts', () => {
    const start = emptyClinicalIntelligenceCaseState('c1')
    const finished = recordRunCompleted(start, makeRun())
    expect(finished.audit[0].action).toBe('run-completed')
    expect(finished.audit[0].notes).toContain('dimensions=1')
    expect(finished.audit[0].notes).toContain('mechanisms=1')
  })

  it('records run-failed and evidence-base-missing', () => {
    const failed = recordRunFailed(emptyClinicalIntelligenceCaseState('c1'), 'no provider')
    expect(failed.audit[0].action).toBe('run-failed')
    expect(failed.audit[0].notes).toBe('no provider')

    const missing = recordEvidenceBaseMissing(emptyClinicalIntelligenceCaseState('c1'))
    expect(missing.audit[0].action).toBe('evidence-base-missing')
  })

  it('accepting a dimension flips reviewStatus and writes audit', () => {
    const state = stateWithRun()
    const next = acceptDimension(state, 'anxiety-threat-anticipation')
    expect(next.latestRun!.dimensional.activeDimensions[0].reviewStatus).toBe('accepted')
    expect(next.audit[0].action).toBe('dimension-accepted')
    expect(next.audit[0].targetId).toBe('anxiety-threat-anticipation')
  })

  it('editing a dimension sets edited status, patches fields and logs change keys', () => {
    const state = stateWithRun()
    const next = editDimension(state, 'anxiety-threat-anticipation', {
      clinicalSummary: 'Edited summary',
      severity: 4,
    })
    const dim = next.latestRun!.dimensional.activeDimensions[0]
    expect(dim.reviewStatus).toBe('edited')
    expect(dim.clinicalSummary).toBe('Edited summary')
    expect(dim.severity).toBe(4)
    expect(next.audit[0].action).toBe('dimension-edited')
    expect(next.audit[0].notes).toContain('clinicalSummary')
    expect(next.audit[0].notes).toContain('severity')
  })

  it('rejecting a dimension removes it from active and persists to rejectedDimensionIds', () => {
    const state = stateWithRun()
    const next = rejectDimension(state, 'anxiety-threat-anticipation', 'not clinically relevant')
    expect(next.latestRun!.dimensional.activeDimensions).toHaveLength(0)
    expect(next.rejectedDimensionIds).toContain('anxiety-threat-anticipation')
    expect(next.audit[0].action).toBe('dimension-rejected')
    expect(next.audit[0].notes).toBe('not clinically relevant')
  })

  it('rejected dimension id is preserved across subsequent runs', () => {
    const initial = stateWithRun()
    const afterReject = rejectDimension(initial, 'anxiety-threat-anticipation')
    expect(afterReject.rejectedDimensionIds).toContain('anxiety-threat-anticipation')
    // simulate a fresh run replacing latestRun
    const fresh: ClinicalIntelligenceCaseState = {
      ...afterReject,
      latestRun: makeRun(),
    }
    expect(fresh.rejectedDimensionIds).toContain('anxiety-threat-anticipation')
  })

  it('accept/edit/reject mechanism mirrors the dimension behavior', () => {
    const state = stateWithRun()
    const accepted = acceptMechanism(state, 'trauma-limbic-hyperreactivity')
    expect(accepted.latestRun!.mechanism.activeMechanisms[0].reviewStatus).toBe('accepted')
    expect(accepted.audit[0].action).toBe('mechanism-accepted')

    const edited = editMechanism(state, 'trauma-limbic-hyperreactivity', {
      clinicalImplication: 'New implication',
    })
    expect(edited.latestRun!.mechanism.activeMechanisms[0].clinicalImplication).toBe(
      'New implication',
    )
    expect(edited.audit[0].action).toBe('mechanism-edited')

    const rejected = rejectMechanism(state, 'trauma-limbic-hyperreactivity')
    expect(rejected.latestRun!.mechanism.activeMechanisms).toHaveLength(0)
    expect(rejected.rejectedMechanismIds).toContain('trauma-limbic-hyperreactivity')
    expect(rejected.audit[0].action).toBe('mechanism-rejected')
  })

  it('acceptAllPendingDimensions flips only pending findings and writes one bulk audit entry', () => {
    const base = stateWithRun()
    const withExtra: ClinicalIntelligenceCaseState = {
      ...base,
      latestRun: {
        ...base.latestRun!,
        dimensional: {
          ...base.latestRun!.dimensional,
          activeDimensions: [
            // pending → should flip to accepted
            base.latestRun!.dimensional.activeDimensions[0],
            // already accepted → must NOT be touched
            {
              ...base.latestRun!.dimensional.activeDimensions[0],
              dimensionId: 'depressive-inhibition',
              dimensionName: 'Depression',
              reviewStatus: 'accepted',
            },
            // edited → must NOT be flipped to accepted (clinician already touched it)
            {
              ...base.latestRun!.dimensional.activeDimensions[0],
              dimensionId: 'mania-activation',
              dimensionName: 'Mania',
              reviewStatus: 'edited',
            },
          ],
        },
      },
    }
    const { state: next, acceptedIds } = acceptAllPendingDimensions(withExtra)
    expect(acceptedIds).toEqual(['anxiety-threat-anticipation'])
    const statuses = next.latestRun!.dimensional.activeDimensions.map((f) => f.reviewStatus)
    expect(statuses).toEqual(['accepted', 'accepted', 'edited'])
    expect(next.audit.length).toBe(1)
    expect(next.audit[0].action).toBe('dimension-bulk-accepted')
    expect(next.audit[0].targetId).toBe('anxiety-threat-anticipation')
    expect(next.audit[0].notes).toContain('count=1')
  })

  it('acceptAllPendingDimensions is a no-op when nothing is pending', () => {
    const base = stateWithRun()
    const accepted = acceptDimension(base, 'anxiety-threat-anticipation')
    const { state: next, acceptedIds } = acceptAllPendingDimensions(accepted)
    expect(acceptedIds).toHaveLength(0)
    // No new audit entry added beyond the single accept above
    expect(next.audit.length).toBe(accepted.audit.length)
  })

  it('acceptAllPendingMechanisms mirrors dimensions behaviour with mechanism action', () => {
    const base = stateWithRun()
    const { state: next, acceptedIds } = acceptAllPendingMechanisms(base)
    expect(acceptedIds).toEqual(['trauma-limbic-hyperreactivity'])
    expect(next.latestRun!.mechanism.activeMechanisms[0].reviewStatus).toBe('accepted')
    expect(next.audit[0].action).toBe('mechanism-bulk-accepted')
    expect(next.audit[0].targetId).toBe('trauma-limbic-hyperreactivity')
  })

  it('acceptAll* does not include exploratory items (they are not in active*)', () => {
    const base = stateWithRun()
    const withExploratory: ClinicalIntelligenceCaseState = {
      ...base,
      latestRun: {
        ...base.latestRun!,
        dimensional: {
          ...base.latestRun!.dimensional,
          exploratoryInsufficientEvidence: [
            { topic: 'Sleep', rationale: 'no documented history' },
          ],
        },
      },
    }
    const { state: next, acceptedIds } = acceptAllPendingDimensions(withExploratory)
    expect(acceptedIds).toEqual(['anxiety-threat-anticipation'])
    // Exploratory entry preserved untouched (still 1 entry, not part of bulk accept).
    expect(next.latestRun!.dimensional.exploratoryInsufficientEvidence).toHaveLength(1)
  })

  it('audit log preserves chronological order with newest first and caps at 500', () => {
    let state = emptyClinicalIntelligenceCaseState('c1')
    for (let i = 0; i < 510; i++) {
      state = appendAuditEntry(state, {
        action: 'run-started',
        targetKind: 'run',
        notes: String(i),
      })
    }
    expect(state.audit.length).toBe(500)
    expect(state.audit[0].notes).toBe('509')
    expect(state.audit[499].notes).toBe('10')
  })
})
