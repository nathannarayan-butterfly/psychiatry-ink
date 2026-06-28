/**
 * Regression: the in-workspace AI feature panel (lab interpretation / patient
 * education) must NOT spend credits merely by being opened. Generation is now
 * EXPLICIT — the panel mounts in an `idle` state with a Generate button, and the
 * billed `executeAiGeneration` call only fires on the deliberate clinician
 * action.
 *
 * Verified here:
 *  - mounting the panel fires NO billed generation,
 *  - the explicit Generate action fires it exactly once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockExecute = vi.hoisted(() =>
  vi.fn(async () => ({ text: 'Generierter Befundtext', creditsCharged: 1 })),
)
vi.mock('../../../../services/aiGeneration', () => ({ executeAiGeneration: mockExecute }))

vi.mock('../../../../utils/workspaceAi/buildAiSource', () => ({
  buildAufklaerungSource: () => 'Patientenkontext für die Aufklärung.',
  buildLabInterpretationSource: () => 'Laborwerte für die Interpretation.',
}))

vi.mock('../../../../utils/dokumenteArchive', () => ({ appendDokument: vi.fn() }))
vi.mock('../../NotionToast', () => ({ showNotionToast: vi.fn() }))
vi.mock('../../../../utils/estimateCredits', () => ({ estimateGenerationCredits: () => 1 }))

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

import { WorkspaceAiFeaturePanel } from '../WorkspaceAiFeaturePanel'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mountPanel(caseId?: string): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      createElement(WorkspaceAiFeaturePanel, {
        feature: 'lab-interpretation' as const,
        caseId,
        onClose: () => {},
      }),
    )
    await Promise.resolve()
  })
}

async function click(el: Element | null): Promise<void> {
  await act(async () => {
    el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
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

describe('WorkspaceAiFeaturePanel — no auto-AI on mount', () => {
  it('does NOT fire a billed generation merely by opening', async () => {
    await mountPanel('real-case-1')
    expect(mockExecute).not.toHaveBeenCalled()
    // Opens in the idle state with an explicit Generate button.
    expect(container!.querySelector('.wai-btn--primary')).not.toBeNull()
  })

  it('fires the billed generation exactly once on the explicit action', async () => {
    await mountPanel('real-case-2')
    expect(mockExecute).not.toHaveBeenCalled()

    await click(container!.querySelector('.wai-btn--primary'))

    expect(mockExecute).toHaveBeenCalledTimes(1)
  })
})
