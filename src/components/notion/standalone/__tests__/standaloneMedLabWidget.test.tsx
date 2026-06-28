/**
 * Patient-less medication ⇄ lab correlation tool. Verifies it works on PURE
 * ad-hoc input: comma free-text drug entry (off-database names badged), an entered
 * lab value surfaces the deterministic correlation finding, and saving routes the
 * summary through the standalone notes path (no patient-case I/O).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockSave = vi.hoisted(() => vi.fn())
vi.mock('../../../../utils/standaloneNotes', () => ({
  saveStandaloneNote: mockSave,
  listStandaloneNotes: vi.fn(() => []),
  updateStandaloneNote: vi.fn(),
  deleteStandaloneNote: vi.fn(),
}))
vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../../hooks/useKnowledgeBaseDrugs', () => ({
  useKnowledgeBaseDrugs: () => ({ drugs: [] }),
}))
vi.mock('../../../medication/MedicationDrugSuggest', () => ({
  MedicationDrugSuggest: () => null,
}))
vi.mock('../../../therapy/CombinationCheckPanel', () => ({
  CombinationCheckPanel: () => null,
}))

import { StandaloneMedLabWidget } from '../StandaloneMedLabWidget'

let root: Root | null = null
let container: HTMLDivElement | null = null

function setValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto =
    el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
}

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(StandaloneMedLabWidget, { caseId: 'default-storage', onClose: () => {} }))
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

describe('StandaloneMedLabWidget', () => {
  it('parses comma free-text into off-database drug chips and correlates against entered labs', async () => {
    await mount()
    const free = container!.querySelector<HTMLTextAreaElement>('.swx-field__textarea')!
    await act(async () => {
      setValue(free, 'Citalopram, Lithium')
      await Promise.resolve()
    })
    const addBtn = container!.querySelector<HTMLButtonElement>('.wai-btn--ghost')!
    await act(async () => {
      addBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    // Both comma-separated tokens become drug chips.
    expect(container!.querySelectorAll('.swx-chip').length).toBe(2)

    // Enter a low potassium → torsades correlation appears.
    const paramInput = container!.querySelector<HTMLInputElement>('.swx-lab-row input')!
    const valueInput = container!.querySelectorAll<HTMLInputElement>('.swx-lab-row input')[1]!
    await act(async () => {
      setValue(paramInput, 'Kalium')
      setValue(valueInput, '3.1')
      await Promise.resolve()
    })
    expect(container!.textContent).toContain('standaloneMedLabFindingQtTorsades')
  })

  it('saves the correlation summary through the standalone notes result panel', async () => {
    await mount()
    const free = container!.querySelector<HTMLTextAreaElement>('.swx-field__textarea')!
    await act(async () => {
      setValue(free, 'Clozapin')
      await Promise.resolve()
    })
    const addBtn = container!.querySelector<HTMLButtonElement>('.wai-btn--ghost')!
    await act(async () => {
      addBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const saveBtn = container!.querySelector<HTMLButtonElement>('.wai-panel__footer .wai-btn--primary')!
    await act(async () => {
      saveBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    // Now in the result phase: a save-to-notes control exists and writes a note
    // under the patient-less caseId (never a patient case).
    const notesSaveBtn = Array.from(container!.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.includes('standaloneSaveToNotes'),
    )
    expect(notesSaveBtn).toBeTruthy()
    await act(async () => {
      notesSaveBtn!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(mockSave).toHaveBeenCalledTimes(1)
    const [caseId, input] = mockSave.mock.calls[0]
    expect(caseId).toBe('default-storage')
    expect(input).toMatchObject({ kind: 'med-lab-correlation', category: 'laborbefunde' })
  })
})
