import { beforeEach, describe, expect, it } from 'vitest'
import type { PatientMedicationLabCorrelationFinding } from '../../../types/labMedicationCorrelation'
import {
  filterVisibleLabMedCorrelationFindings,
  loadLabMedCorrelationStore,
  mergeLabMedCorrelationRunResult,
  saveLabMedCorrelationStore,
  shouldPreserveLabMedCorrelationFinding,
} from '../storage'

const CASE_ID = 'case-lab-med-merge-test'

function makeFinding(
  overrides: Partial<PatientMedicationLabCorrelationFinding> & { correlationKey: string },
): PatientMedicationLabCorrelationFinding {
  const now = '2026-06-19T10:00:00.000Z'
  const { correlationKey, ...rest } = overrides
  return {
    id: rest.id ?? `finding-${correlationKey}`,
    caseId: CASE_ID,
    correlationKey,
    labParameter: rest.labParameter ?? 'creatinine',
    labParameterLabel: rest.labParameterLabel ?? 'Kreatinin',
    labValue: rest.labValue ?? '1.4',
    labUnit: rest.labUnit ?? 'mg/dl',
    abnormality: rest.abnormality ?? 'high',
    labDate: rest.labDate ?? '2026-06-01',
    substanceId: rest.substanceId ?? 'lithium',
    substanceName: rest.substanceName ?? 'Lithium',
    zusammenhang: rest.zusammenhang ?? 'Möglicher Zusammenhang',
    recommendation: rest.recommendation ?? 'Monitoring',
    correlationStrength: rest.correlationStrength ?? 'plausible',
    source: rest.source ?? 'ai_suggestion',
    status: rest.status ?? 'pending_clinician_review',
    createdAt: rest.createdAt ?? now,
    updatedAt: rest.updatedAt ?? now,
    ...rest,
  }
}

beforeEach(() => {
  localStorage.clear()
  saveLabMedCorrelationStore({
    version: 1,
    caseId: CASE_ID,
    updatedAt: new Date().toISOString(),
    findings: [],
    aiRuns: [],
  })
})

describe('filterVisibleLabMedCorrelationFindings', () => {
  it('hides rejected and not_relevant findings, including deepseek-rejected rows', () => {
    const visible = filterVisibleLabMedCorrelationFindings([
      makeFinding({ correlationKey: 'a', status: 'pending_clinician_review' }),
      makeFinding({ correlationKey: 'b', status: 'verified_kb' }),
      makeFinding({
        correlationKey: 'c',
        status: 'rejected',
        deepseekRejected: true,
      }),
      makeFinding({ correlationKey: 'd', status: 'not_relevant' }),
      makeFinding({ correlationKey: 'e', status: 'accepted', source: 'clinician_accepted' }),
    ])

    expect(visible.map((f) => f.correlationKey)).toEqual(['a', 'b', 'e'])
  })
})

describe('shouldPreserveLabMedCorrelationFinding', () => {
  it('locks rejected, not_relevant, accepted, and pending review findings', () => {
    expect(
      shouldPreserveLabMedCorrelationFinding(
        makeFinding({ correlationKey: 'a', status: 'rejected', deepseekRejected: true }),
      ),
    ).toBe(true)
    expect(
      shouldPreserveLabMedCorrelationFinding(
        makeFinding({ correlationKey: 'b', status: 'not_relevant' }),
      ),
    ).toBe(true)
    expect(
      shouldPreserveLabMedCorrelationFinding(
        makeFinding({ correlationKey: 'c', status: 'pending_clinician_review' }),
      ),
    ).toBe(true)
    expect(
      shouldPreserveLabMedCorrelationFinding(
        makeFinding({ correlationKey: 'd', status: 'accepted', source: 'clinician_accepted' }),
      ),
    ).toBe(true)
  })
})

describe('mergeLabMedCorrelationRunResult', () => {
  it('does not clobber rejected findings on re-run', () => {
    const key = 'lithium|creatinine'
    saveLabMedCorrelationStore({
      version: 1,
      caseId: CASE_ID,
      updatedAt: new Date().toISOString(),
      findings: [
        makeFinding({
          correlationKey: key,
          status: 'rejected',
          deepseekRejected: true,
          zusammenhang: 'Verworfener KI-Vorschlag',
        }),
      ],
      aiRuns: [],
    })

    const next = mergeLabMedCorrelationRunResult(
      CASE_ID,
      [
        makeFinding({
          correlationKey: key,
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
          zusammenhang: 'Neuer KI-Lauf',
          updatedAt: '2026-06-19T12:00:00.000Z',
        }),
      ],
      [],
    )

    expect(next.findings).toHaveLength(1)
    expect(next.findings[0]?.status).toBe('rejected')
    expect(next.findings[0]?.zusammenhang).toBe('Verworfener KI-Vorschlag')
    expect(filterVisibleLabMedCorrelationFindings(next.findings)).toHaveLength(0)
  })

  it('persists rejected findings across reload', () => {
    const key = 'valproate|alt'
    saveLabMedCorrelationStore({
      version: 1,
      caseId: CASE_ID,
      updatedAt: new Date().toISOString(),
      findings: [
        makeFinding({
          correlationKey: key,
          status: 'rejected',
          deepseekRejected: true,
        }),
      ],
      aiRuns: [],
    })

    const reloaded = loadLabMedCorrelationStore(CASE_ID)
    expect(filterVisibleLabMedCorrelationFindings(reloaded.findings)).toHaveLength(0)
  })
})
