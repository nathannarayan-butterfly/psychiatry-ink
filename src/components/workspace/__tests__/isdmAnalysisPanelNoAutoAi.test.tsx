/**
 * Regression: the Diagnose tab (Butterfly) must NOT spend credits merely by
 * being opened. The billed `butterfly` passes — criteria extraction and
 * interview-question generation — are now EXPLICIT (clinician-initiated).
 *
 * Verified here:
 *  - mounting the panel fires NEITHER billed call,
 *  - the explicit "Mit Butterfly prüfen" action fires both exactly once,
 *  - a cached criterion suggestion short-circuits the criteria call (no re-bill),
 *  - the demo case never bills, even on explicit click.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ── Guards / flags ────────────────────────────────────────────────────────────
const mockIsDemoCase = vi.hoisted(() => vi.fn<(caseId: string) => boolean>(() => false))
vi.mock('../../../demo/demoReadOnly', () => ({ isDemoCase: mockIsDemoCase }))
vi.mock('../../../utils/featureFlags', () => ({ isCmeaConsumerReadEnabled: () => false }))

// ── Billed API surfaces (must only be called on explicit action) ──────────────
const mockExtract = vi.hoisted(() =>
  vi.fn(async () => ({
    disorderName: 'D',
    model: { provider: 'p', modelId: 'm' },
    mock: false,
    results: [
      {
        id: 'c1',
        status: 'met' as const,
        evidenceQuote: 'q',
        confidence: 0.8,
        provenance: 'pending_clinician_review' as const,
        evidenceStrength: 'inferred' as const,
      },
    ],
    disclaimer: '',
  })),
)
vi.mock('../../../services/butterflyExtractApi', () => ({ extractButterflyCriteria: mockExtract }))

const mockInterview = vi.hoisted(() =>
  vi.fn(async () => ({
    disorderName: 'D',
    model: { provider: 'p', modelId: 'm' },
    mock: false,
    results: [{ criterionId: 'c1', questions: ['Frage?'] }],
    disclaimer: '',
  })),
)
vi.mock('../../../services/interviewQuestionsApi', () => ({ generateInterviewQuestions: mockInterview }))

// ── Translation: echo keys (button is queried by class, not text) ─────────────
vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

// ── Suggestion store (controlled per test) ────────────────────────────────────
let storedSuggestions: Record<string, unknown> = {}
vi.mock('../../../utils/butterfly/aiSuggestions', () => ({
  loadAiSuggestions: () => storedSuggestions,
  saveAiSuggestions: vi.fn(),
  acceptAiSuggestion: vi.fn(),
  dismissAiSuggestion: vi.fn(),
}))

// ── Deterministic / display-only data (free, populate on mount) ───────────────
vi.mock('../../../utils/isdm/storage', () => ({
  loadIsdmAnalysis: () => ({
    phenomenology: {},
    coursePattern: {},
    updatedAt: '2026-06-20T10:00:00.000Z',
  }),
}))
vi.mock('../../../utils/isdm', () => ({ scheduleIsdmRebuild: vi.fn() }))

const DISORDER = {
  id: 'dx1',
  name_de: 'Depressive Episode',
  version: 1,
  groups: [] as unknown[],
  differentials_de: [] as string[],
  sourceRef: 'ICD-10 F32',
  codingSystems: { icd10: { code: 'F32.1', label_de: 'Depression' }, icd11: undefined },
  code: 'F32.1',
}

vi.mock('../../../data/diagnosisCriteria', () => ({
  formatCriterionCitation: () => '',
  getLocalizedDisorder: () => DISORDER,
  matchDisorderToCodes: () => DISORDER,
  resolveDisorderForCodingSystem: () => DISORDER,
  toButterflyIcdVersion: () => 'icd10',
}))
vi.mock('../../../utils/diagnosenCodingSystem', () => ({
  DIAGNOSEN_CODING_SYSTEM_EVENT: 'diagnosen-coding-system',
  loadDiagnosenCodingSystem: () => 'icd10',
}))
vi.mock('../../../utils/diagnosenArchive', () => ({
  getActiveCoding: () => ({ code: 'F32.1', label: 'Depression', overridden: false }),
  hasAnyCodingContent: () => true,
  loadDiagnosen: () => [
    {
      id: 'dx1',
      icd10: { code: 'F32.1', label: 'Depression', overridden: false },
      icd11: { code: '', label: '', overridden: false },
    },
  ],
}))
vi.mock('../../../utils/diagnosisDisplayRequests', () => ({
  buildDiagnosisTitleRequest: ({ key }: { key: string }) => ({ key }),
  codingSystemToTitleVersion: () => 'icd10',
  resolveDiagnosisLabelSync: () => 'Depression',
}))
vi.mock('../../../utils/diagnosisCriteria', () => ({
  buildDisorderAdvice: () => ({ tone: 'insufficient', headline: 'Hinweis' }),
  buildEvaluationContext: () => ({}),
  evaluateDisorder: () => ({
    verdict: 'incomplete',
    perCriterion: [
      {
        criterionId: 'c1',
        status: 'unknown',
        source: 'derived',
        text_de: 'Kriterium 1',
        groupId: 'g1',
        citation: null,
      },
    ],
  }),
}))
vi.mock('../../../utils/butterfly/attestationStorage', () => ({
  loadAttestations: () => ({}),
  setAttestation: vi.fn(),
}))
vi.mock('../../../utils/butterfly/criterionPrompts', () => ({
  selectUnresolvedCriteria: () => [{ id: 'c1', text: 'Kriterium 1' }],
  selectUnresolvedInterviewCriteria: () => [{ id: 'c1', text: 'Kriterium 1' }],
  resolveDeepLinkPage: () => null,
  buildCriterionQuestions: () => [],
  groupCriterionQuestionsByDiagnosis: () => [],
}))
vi.mock('../../../utils/butterfly/interviewQuestionsCache', () => ({
  loadInterviewQuestionCache: () => ({}),
  getCachedInterviewQuestions: () => undefined,
  saveInterviewQuestions: vi.fn(),
}))
vi.mock('../../../utils/clinicalQuestions', () => ({
  clinicalQuestionId: (kind: string, id: string) => `${kind}:${id}`,
  loadClinicalQuestionNoteState: () => ({}),
  setClinicalQuestionNote: vi.fn(),
  clearClinicalQuestionNote: vi.fn(),
  resolutionToAttestation: () => null,
}))
vi.mock('../../../utils/butterfly/factSuggestions', () => ({
  suggestionsFromCaseFacts: () => ({ suggestions: [], residualUnresolved: [{ id: 'c1', text: 'Kriterium 1' }] }),
}))
vi.mock('../../../utils/butterfly/contextPackage', () => ({
  buildButterflyContextPackage: () => ({ context: 'x' }),
  hasButterflyContext: () => true,
}))
vi.mock('../../../hooks/useDiagnosisDisplayTitles', () => ({
  useDiagnosisDisplayTitles: () => ({ titlesByKey: new Map([['dx1', 'Depression']]), loading: false }),
}))

import { IsdmAnalysisPanel } from '../IsdmAnalysisPanel'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mountPanel(caseId: string): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(IsdmAnalysisPanel, { caseId, flat: true }))
    await Promise.resolve()
  })
}

async function click(el: Element | null): Promise<void> {
  await act(async () => {
    el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

/**
 * Expand the (collapsed) "Empfehlungen" section, then the diagnosis card, so the
 * analyse button is rendered, then click it.
 */
async function expandCardAndAnalyze(): Promise<void> {
  await click(container!.querySelector('.butterfly-collapsible-toggle'))
  await click(container!.querySelector('.butterfly-card__toggle'))
  await click(container!.querySelector('.butterfly-ai-check'))
}

beforeEach(() => {
  vi.clearAllMocks()
  storedSuggestions = {}
  mockIsDemoCase.mockReturnValue(false)
})

afterEach(async () => {
  if (root) {
    const current = root
    await act(async () => current.unmount())
    root = null
  }
  container?.remove()
  container = null
})

describe('IsdmAnalysisPanel — Diagnose tab does not auto-bill', () => {
  it('does NOT fire either billed butterfly pass on mount', async () => {
    await mountPanel('real-case-isdm-1')
    expect(mockExtract).not.toHaveBeenCalled()
    expect(mockInterview).not.toHaveBeenCalled()
  })

  it('fires both billed passes exactly once on the explicit action', async () => {
    await mountPanel('real-case-isdm-2')
    expect(mockExtract).not.toHaveBeenCalled()

    await expandCardAndAnalyze()

    expect(mockExtract).toHaveBeenCalledTimes(1)
    expect(mockInterview).toHaveBeenCalledTimes(1)
  })

  it('does NOT re-bill the criteria pass when a cached suggestion exists', async () => {
    storedSuggestions = { c1: { criterionId: 'c1', status: 'met', evidenceQuote: 'q', confidence: 0.8 } }
    await mountPanel('real-case-isdm-3')

    await expandCardAndAnalyze()

    expect(mockExtract).not.toHaveBeenCalled()
  })

  it('never bills for the demo case, even on explicit click', async () => {
    mockIsDemoCase.mockReturnValue(true)
    await mountPanel('demo-patient')

    await expandCardAndAnalyze()

    expect(mockExtract).not.toHaveBeenCalled()
    expect(mockInterview).not.toHaveBeenCalled()
  })
})
