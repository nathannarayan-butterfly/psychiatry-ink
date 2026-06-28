/**
 * Regression: viewing/scrolling the synthetic Demo Patient must NEVER fire a
 * live, credit-charging AI call. The demo case is pre-baked and read-only.
 *
 * These tests render the two hooks that previously auto-ran billed AI work on
 * mount for the Übersicht / Diagnose surfaces:
 *   - usePsychopathAiExtract  (psychopathology structured extraction)
 *   - useCasePriorTherapies   (prior-therapy free-text extraction)
 *
 * For a demo caseId the underlying AI client must not be called; for a real
 * caseId (control) it still runs, proving the guard — not the mocks — is what
 * suppresses the call.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, type FC } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { MedicationEntry } from '../../types/medicationPlan'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Stable identity — a fresh array literal per render would churn the hook's
// memoised derivations; that is orthogonal to what we are testing here.
const NO_MEDS: MedicationEntry[] = []

// ── Shared demo guard mock (controlled per test) ──────────────────────────────
const mockIsDemoCase = vi.hoisted(() => vi.fn<(caseId: string) => boolean>())
vi.mock('../../demo/demoReadOnly', () => ({ isDemoCase: mockIsDemoCase }))

// ── Feature flags: both auto-run features fully enabled ───────────────────────
vi.mock('../../utils/featureFlags', () => ({
  isPsychopathExtractAiEnabled: () => true,
  isCmeaConsumerReadEnabled: () => false,
}))

// ── usePsychopathAiExtract deps ───────────────────────────────────────────────
const mockRunPsychopathAiExtract = vi.hoisted(() => vi.fn(async () => ({})))
vi.mock('../../utils/overview/psychopathAiExtract', () => ({
  runPsychopathAiExtract: mockRunPsychopathAiExtract,
  isPsychopathAiStructuredStale: () => true,
  hashPsychopathSourceText: () => 'source-hash',
}))
vi.mock('../../utils/overview/psychopathFindingOps', () => ({
  resolveOverviewPsychopathologyText: () => ({
    text: 'Affekt gedrückt, Antrieb deutlich reduziert, Schlaf gestört.',
  }),
}))
vi.mock('../../utils/overview/psychopathFindingStorage', () => ({
  loadPsychopathFindingState: () => ({ aiStructured: null }),
  subscribePsychopathFinding: () => () => {},
}))
vi.mock('../useCaseRegistry', () => ({ getCaseMeta: () => ({}) }))

// ── useCasePriorTherapies deps ────────────────────────────────────────────────
const mockRunPriorTherapyExtraction = vi.hoisted(() => vi.fn(async () => ({ items: [], mock: false })))
vi.mock('../../services/priorTherapiesApi', () => ({
  runPriorTherapyExtraction: mockRunPriorTherapyExtraction,
  runPriorTherapyFailureAnalysis: vi.fn(async () => ({ analyses: [], mock: false })),
}))
vi.mock('../../utils/notionDocumentActions', () => ({
  loadNotionDocumentSnapshot: () => ({
    sectionContents: {
      'psychiatrische-vorgeschichte':
        'Vorbehandlung mit Sertralin, abgesetzt wegen fehlender Wirksamkeit.',
    },
  }),
}))
vi.mock('../../utils/verlaufFeed', () => ({ loadVerlaufFeed: () => [] }))
vi.mock('../../utils/laborArchive', () => ({ loadBefunde: () => [] }))
vi.mock('../../components/notion/SpiegelwerteSection', () => ({ extractSpiegelwerte: () => [] }))
vi.mock('../../utils/clinicalMetadata/accessor', () => ({ medicationTrials: () => [] }))
vi.mock('../../utils/medication/priorTherapyFacts', () => ({
  indexTrialFactsBySubstance: () => new Map(),
  medicationTrialFactsToItems: () => [],
}))

import { usePsychopathAiExtract } from '../usePsychopathAiExtract'
import { useCasePriorTherapies } from '../useCasePriorTherapies'

let root: Root | null = null

async function renderHook(Probe: FC): Promise<void> {
  const container = document.createElement('div')
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(Probe))
    await Promise.resolve()
  })
}

afterEach(async () => {
  if (root) {
    const current = root
    await act(async () => {
      current.unmount()
    })
    root = null
  }
})

describe('usePsychopathAiExtract — demo case never auto-runs billed AI', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does NOT call the extraction API for the demo case', async () => {
    mockIsDemoCase.mockReturnValue(true)
    const Probe: FC = () => {
      usePsychopathAiExtract({ caseId: 'demo-patient', language: 'de' })
      return null
    }
    await renderHook(Probe)
    expect(mockRunPsychopathAiExtract).not.toHaveBeenCalled()
  })

  it('DOES auto-run for a real case (control)', async () => {
    mockIsDemoCase.mockReturnValue(false)
    const Probe: FC = () => {
      usePsychopathAiExtract({ caseId: 'real-case-1', language: 'de' })
      return null
    }
    await renderHook(Probe)
    expect(mockRunPsychopathAiExtract).toHaveBeenCalledTimes(1)
  })
})

describe('useCasePriorTherapies — demo case never auto-runs billed AI', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does NOT call the prior-therapy extraction API for the demo case', async () => {
    mockIsDemoCase.mockReturnValue(true)
    const Probe: FC = () => {
      useCasePriorTherapies('demo-patient', NO_MEDS)
      return null
    }
    await renderHook(Probe)
    expect(mockRunPriorTherapyExtraction).not.toHaveBeenCalled()
  })

  it('DOES auto-run extraction for a real case with source text (control)', async () => {
    mockIsDemoCase.mockReturnValue(false)
    const Probe: FC = () => {
      useCasePriorTherapies('real-case-1', NO_MEDS)
      return null
    }
    await renderHook(Probe)
    expect(mockRunPriorTherapyExtraction).toHaveBeenCalledTimes(1)
  })
})
