import { beforeEach, describe, expect, it } from 'vitest'
import type { PatientCombinationCheckFinding } from '../../../types/combinationCheck'
import {
  dedupeIncomingCombinationFindings,
  loadCombinationCheckStore,
  mergeCombinationCheckRunResult,
  mergeCombinationFindingPair,
  saveCombinationCheckStore,
  shouldPreserveCombinationFinding,
} from '../storage'

const CASE_ID = 'case-combo-merge-test'

function makeFinding(
  overrides: Partial<PatientCombinationCheckFinding> & { combinationKey: string },
): PatientCombinationCheckFinding {
  const now = '2026-06-19T10:00:00.000Z'
  const { combinationKey, ...rest } = overrides
  return {
    id: rest.id ?? `finding-${combinationKey}`,
    caseId: CASE_ID,
    combinationKey,
    substanceAName: rest.substanceAName ?? 'Lithium',
    substanceBName: rest.substanceBName ?? 'Ibuprofen',
    interactionType: rest.interactionType ?? 'pharmacodynamic',
    severity: rest.severity ?? 'moderate',
    mainRisk: rest.mainRisk ?? 'Nierenfunktion',
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
    updatedAt: nowIso(),
    findings: [],
    aiRuns: [],
  })
})

function nowIso(): string {
  return new Date().toISOString()
}

describe('shouldPreserveCombinationFinding', () => {
  it('locks accepted, pending review, and annotated findings', () => {
    expect(
      shouldPreserveCombinationFinding(
        makeFinding({ status: 'accepted', combinationKey: 'a|b' }),
      ),
    ).toBe(true)
    expect(
      shouldPreserveCombinationFinding(
        makeFinding({
          combinationKey: 'a|b',
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
        }),
      ),
    ).toBe(true)
    expect(
      shouldPreserveCombinationFinding(
        makeFinding({ combinationKey: 'a|b', clinicianNote: 'Klinisch irrelevant' }),
      ),
    ).toBe(true)
  })
})

describe('dedupeIncomingCombinationFindings', () => {
  it('prefers the AI review row over a duplicate KB row for the same pair', () => {
    const key = 'lithium|ibuprofen'
    const deduped = dedupeIncomingCombinationFindings([
      makeFinding({ combinationKey: key, status: 'verified_kb', mainRisk: 'KB-Risiko' }),
      makeFinding({
        combinationKey: key,
        status: 'pending_clinician_review',
        source: 'ai_suggestion',
        mainRisk: 'KI-Risiko',
        updatedAt: '2026-06-19T10:00:01.000Z',
      }),
    ])

    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.status).toBe('pending_clinician_review')
    expect(deduped[0]?.mainRisk).toBe('KI-Risiko')
  })
})

describe('mergeCombinationFindingPair', () => {
  it('carries clinician notes forward when the incoming run omits them', () => {
    const merged = mergeCombinationFindingPair(
      makeFinding({ combinationKey: 'a|b', clinicianNote: 'Bitte engmaschig kontrollieren' }),
      makeFinding({
        combinationKey: 'a|b',
        status: 'pending_clinician_review',
        source: 'ai_suggestion',
        mainRisk: 'Neuer KI-Vorschlag',
        updatedAt: '2026-06-19T11:00:00.000Z',
      }),
    )

    expect(merged.mainRisk).toBe('Neuer KI-Vorschlag')
    expect(merged.clinicianNote).toBe('Bitte engmaschig kontrollieren')
  })

  it('keeps stable ids and accepted clinician text when the pair was already accepted', () => {
    const merged = mergeCombinationFindingPair(
      makeFinding({
        combinationKey: 'benperidol::olanzapin',
        id: 'stable-id',
        status: 'accepted',
        source: 'clinician_accepted',
        mainRisk: 'Eigene Formulierung',
        clinicianNote: 'bewusst beibehalten',
      }),
      makeFinding({
        combinationKey: 'benperidol::olanzapin',
        id: 'incoming-id',
        status: 'pending_clinician_review',
        source: 'ai_suggestion',
        mainRisk: 'KI überschreibt alles',
      }),
    )

    expect(merged.id).toBe('stable-id')
    expect(merged.mainRisk).toBe('Eigene Formulierung')
    expect(merged.clinicianNote).toBe('bewusst beibehalten')
    expect(merged.status).toBe('accepted')
  })
})

describe('mergeCombinationCheckRunResult', () => {
  it('does not clobber clinician-annotated findings on re-run', () => {
    const key = 'lithium|ibuprofen'
    saveCombinationCheckStore({
      version: 1,
      caseId: CASE_ID,
      updatedAt: nowIso(),
      findings: [
        makeFinding({
          combinationKey: key,
          clinicianNote: 'Eigene Einschätzung',
          mainRisk: 'Bestehendes Risiko',
        }),
      ],
      aiRuns: [],
    })

    const next = mergeCombinationCheckRunResult(
      CASE_ID,
      [
        makeFinding({
          combinationKey: key,
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
          mainRisk: 'KI überschreibt alles',
          updatedAt: '2026-06-19T12:00:00.000Z',
        }),
      ],
      [],
    )

    expect(next.findings).toHaveLength(1)
    expect(next.findings[0]?.mainRisk).toBe('Bestehendes Risiko')
    expect(next.findings[0]?.clinicianNote).toBe('Eigene Einschätzung')
  })

  it('does not clobber pending clinician review on a routine re-run', () => {
    const key = 'benperidol::olanzapin'
    saveCombinationCheckStore({
      version: 1,
      caseId: CASE_ID,
      updatedAt: nowIso(),
      findings: [
        makeFinding({
          combinationKey: key,
          substanceAName: 'Benperidol',
          substanceBName: 'Olanzapin',
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
          mainRisk: 'Offener KI-Vorschlag',
        }),
      ],
      aiRuns: [],
    })

    const next = mergeCombinationCheckRunResult(
      CASE_ID,
      [
        makeFinding({
          combinationKey: key,
          substanceAName: 'Benperidol',
          substanceBName: 'Olanzapin',
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
          mainRisk: 'Neuer KI-Lauf',
          updatedAt: '2026-06-19T12:00:00.000Z',
        }),
      ],
      [],
    )

    expect(next.findings).toHaveLength(1)
    expect(next.findings[0]?.mainRisk).toBe('Offener KI-Vorschlag')
  })

  it('replaces pending review only for an explicit thorough re-run', () => {
    const key = 'benperidol::olanzapin'
    saveCombinationCheckStore({
      version: 1,
      caseId: CASE_ID,
      updatedAt: nowIso(),
      findings: [
        makeFinding({
          combinationKey: key,
          substanceAName: 'Benperidol',
          substanceBName: 'Olanzapin',
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
          mainRisk: 'Offener KI-Vorschlag',
          id: 'stable-pending-id',
        }),
      ],
      aiRuns: [],
    })

    const next = mergeCombinationCheckRunResult(
      CASE_ID,
      [
        makeFinding({
          combinationKey: key,
          substanceAName: 'Benperidol',
          substanceBName: 'Olanzapin',
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
          mainRisk: 'Gründlicher KI-Vorschlag',
          updatedAt: '2026-06-19T12:00:00.000Z',
        }),
      ],
      [
        {
          id: 'run-thorough',
          caseId: CASE_ID,
          combinationKey: key,
          status: 'pending_clinician_review',
          thorough: true,
          result: {
            combinationKey: key,
            substanceAName: 'Benperidol',
            substanceBName: 'Olanzapin',
            interactionType: 'pharmacodynamic',
            severity: 'high',
            mainRisk: 'Gründlicher KI-Vorschlag',
          },
          createdAt: '2026-06-19T12:00:00.000Z',
        },
      ],
    )

    expect(next.findings).toHaveLength(1)
    expect(next.findings[0]?.mainRisk).toBe('Gründlicher KI-Vorschlag')
    expect(next.findings[0]?.id).toBe('stable-pending-id')
  })

  it('merges a fresh run into an untouched pair', () => {
    const key = 'quetiapin|lorazepam'
    const next = mergeCombinationCheckRunResult(
      CASE_ID,
      [
        makeFinding({
          combinationKey: key,
          status: 'pending_clinician_review',
          source: 'ai_suggestion',
          mainRisk: 'Sedierung',
        }),
      ],
      [],
    )

    expect(loadCombinationCheckStore(CASE_ID).findings[0]?.mainRisk).toBe('Sedierung')
    expect(next.findings[0]?.combinationKey).toBe(key)
  })
})
