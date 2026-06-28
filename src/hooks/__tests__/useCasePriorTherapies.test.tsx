/**
 * useCasePriorTherapies — credit-safety + deterministic-by-default behaviour.
 *
 * Guarantees verified here:
 *  (a) opening a patient does NOT fire the billed LLM extraction on mount,
 *  (b) prior-therapy items are still derived DETERMINISTICALLY (offline, no
 *      network) from the Anamnese free text via the shared heuristic,
 *  (c) the explicit `refineWithAi()` action triggers the billed LLM exactly once,
 *  (d) concurrent triggers for the same case + signature are de-duplicated so a
 *      single billed request is made (no double-billing across surfaces/tabs).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, type FC } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { CasePriorTherapies } from '../useCasePriorTherapies'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const NO_MEDS: MedicationEntry[] = []

// ── Guards / flags: real case, facts path off ────────────────────────────────
vi.mock('../../demo/demoReadOnly', () => ({ isDemoCase: () => false }))
vi.mock('../../utils/featureFlags', () => ({ isCmeaConsumerReadEnabled: () => false }))

// ── Billed API surface (mocked — must only be called on explicit refine) ──────
const mockRunPriorTherapyExtraction = vi.hoisted(() =>
  vi.fn(async () => ({ items: [], mock: false, deidentified: true as const })),
)
const mockRunPriorTherapyFailureAnalysis = vi.hoisted(() =>
  vi.fn(async () => ({ analyses: [], mock: false, deidentified: true as const })),
)
vi.mock('../../services/priorTherapiesApi', () => ({
  runPriorTherapyExtraction: mockRunPriorTherapyExtraction,
  runPriorTherapyFailureAnalysis: mockRunPriorTherapyFailureAnalysis,
}))

// Anamnese free text with a real prior-trial signal — the deterministic
// heuristic (NOT mocked) should surface "Sertralin" without any network call.
vi.mock('../../utils/notionDocumentActions', () => ({
  loadNotionDocumentSnapshot: (doc: string) =>
    doc === 'aufnahme'
      ? {
          sectionContents: {
            'psychiatrische-vorgeschichte':
              'Vorbehandlung mit Sertralin, abgesetzt wegen unzureichendem Ansprechen.',
          },
        }
      : null,
}))
vi.mock('../../utils/verlaufFeed', () => ({ loadVerlaufFeed: () => [] }))
vi.mock('../../utils/laborArchive', () => ({ loadBefunde: () => [] }))
vi.mock('../../components/notion/SpiegelwerteSection', () => ({ extractSpiegelwerte: () => [] }))
vi.mock('../../utils/clinicalMetadata/accessor', () => ({ medicationTrials: () => [] }))
vi.mock('../../utils/medication/priorTherapyFacts', () => ({
  indexTrialFactsBySubstance: () => new Map(),
  medicationTrialFactsToItems: () => [],
}))

import { useCasePriorTherapies } from '../useCasePriorTherapies'

const roots: Root[] = []

/** Mount the hook in a probe; returns the latest hook value + a getter. */
async function mountProbe(caseId: string): Promise<{ get: () => CasePriorTherapies }> {
  const ref: { current: CasePriorTherapies | null } = { current: null }
  const Probe: FC = () => {
    ref.current = useCasePriorTherapies(caseId, NO_MEDS)
    return null
  }
  const container = document.createElement('div')
  const root = createRoot(container)
  roots.push(root)
  await act(async () => {
    root.render(createElement(Probe))
    await Promise.resolve()
  })
  return { get: () => ref.current as CasePriorTherapies }
}

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
})

beforeEach(() => {
  vi.clearAllMocks()
  // Restore the resolving default (a prior test may have set a pending impl).
  mockRunPriorTherapyExtraction.mockImplementation(async () => ({
    items: [],
    mock: false,
    deidentified: true as const,
  }))
  mockRunPriorTherapyFailureAnalysis.mockImplementation(async () => ({
    analyses: [],
    mock: false,
    deidentified: true as const,
  }))
})

describe('mount is deterministic and credit-free', () => {
  it('does NOT call the billed extraction on mount', async () => {
    await mountProbe('case-mount-1')
    expect(mockRunPriorTherapyExtraction).not.toHaveBeenCalled()
    expect(mockRunPriorTherapyFailureAnalysis).not.toHaveBeenCalled()
  })

  it('surfaces deterministic items from the Anamnese text without any network', async () => {
    const probe = await mountProbe('case-mount-2')
    const { items } = probe.get()
    expect(items.some((item) => item.substance === 'Sertralin')).toBe(true)
    // It is advisory (free-text derived), and no billed call was made for it.
    expect(items.find((item) => item.substance === 'Sertralin')?.inferred).toBe(true)
    expect(mockRunPriorTherapyExtraction).not.toHaveBeenCalled()
  })
})

describe('explicit refineWithAi triggers the billed LLM once', () => {
  it('fires runPriorTherapyExtraction exactly once on explicit refine', async () => {
    const probe = await mountProbe('case-refine-1')
    expect(mockRunPriorTherapyExtraction).not.toHaveBeenCalled()

    await act(async () => {
      probe.get().refineWithAi()
      await Promise.resolve()
    })

    expect(mockRunPriorTherapyExtraction).toHaveBeenCalledTimes(1)
  })
})

describe('in-flight dedupe prevents double-billing', () => {
  it('shares ONE billed request across two concurrent surfaces for the same case', async () => {
    // A pending (never-resolving) request keeps both triggers within the same
    // in-flight window, so dedupe can collapse them into a single billed call.
    mockRunPriorTherapyExtraction.mockImplementation(
      () => new Promise(() => {}) as Promise<never>,
    )

    const caseId = 'case-dedupe-1'
    const a = await mountProbe(caseId)
    const b = await mountProbe(caseId)

    await act(async () => {
      a.get().refineWithAi()
      b.get().refineWithAi()
      await Promise.resolve()
    })

    expect(mockRunPriorTherapyExtraction).toHaveBeenCalledTimes(1)
  })
})
