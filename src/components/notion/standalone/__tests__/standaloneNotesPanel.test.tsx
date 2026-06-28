/**
 * The patient-less workspace Notes / Jot space (#6) must be visible even with
 * zero saved notes, and the quick-note composer must persist a free note via
 * `saveStandaloneNote` (kind `jot`) so it appears in the saved-notes list.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockSave = vi.hoisted(() => vi.fn())
const mockList = vi.hoisted(() => vi.fn(() => [] as unknown[]))
vi.mock('../../../../utils/standaloneNotes', () => ({
  saveStandaloneNote: mockSave,
  listStandaloneNotes: mockList,
  updateStandaloneNote: vi.fn(),
  deleteStandaloneNote: vi.fn(),
}))
vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

import { StandaloneNotesPanel } from '../StandaloneNotesPanel'

let root: Root | null = null
let container: HTMLDivElement | null = null

function setTextareaValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set
  setter?.call(el, value)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockReturnValue([])
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

describe('StandaloneNotesPanel', () => {
  it('renders the jot composer and empty state even with no notes', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root!.render(createElement(StandaloneNotesPanel, { caseId: 'default-storage' }))
      await Promise.resolve()
    })

    // Panel is visible (heading + composer + empty hint), not hidden.
    expect(container.querySelector('.swx-notes')).not.toBeNull()
    expect(container.querySelector('.swx-notes__compose-area')).not.toBeNull()
    expect(container.textContent).toContain('standaloneNotesEmpty')
  })

  it('saves a quick note as a standalone jot note', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root!.render(createElement(StandaloneNotesPanel, { caseId: 'default-storage' }))
      await Promise.resolve()
    })

    const area = container.querySelector<HTMLTextAreaElement>('.swx-notes__compose-area')!
    await act(async () => {
      setTextareaValue(area, 'Kurze Verlaufsnotiz')
      await Promise.resolve()
    })

    const saveBtn = container.querySelector<HTMLButtonElement>('.swx-notes__compose-save')!
    expect(saveBtn.disabled).toBe(false)
    await act(async () => {
      saveBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    const [caseId, input] = mockSave.mock.calls[0]
    expect(caseId).toBe('default-storage')
    expect(input).toMatchObject({ kind: 'jot', content: 'Kurze Verlaufsnotiz' })
  })
})
