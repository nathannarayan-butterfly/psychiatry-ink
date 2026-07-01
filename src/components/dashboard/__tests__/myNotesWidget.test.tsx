// @vitest-environment jsdom
/**
 * The dashboard "Meine Notizen" widget lists every user-global note from the
 * shared store, read-only (copy + open in Notizen only — no inline edit/delete,
 * which only live inside the Notizen panel/page), and stays in sync with tool
 * saves and the popup.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const notizenOpen = vi.hoisted(() => vi.fn())

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../contexts/NotizenContext', () => ({
  useNotizen: () => ({ isOpen: false, open: notizenOpen }),
}))

import { MyNotesWidget } from '../MyNotesWidget'
import { saveGlobalNote, listGlobalNotes } from '../../../utils/standaloneNotes'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(MyNotesWidget))
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('MyNotesWidget', () => {
  it('lists every saved global note', async () => {
    saveGlobalNote({ kind: 'jot', title: 'Notiz A', content: 'Inhalt A' })
    saveGlobalNote({ kind: 'jot', title: 'Notiz B', content: '<p><strong>Inhalt B</strong></p>' })
    await mount()
    const titles = Array.from(container!.querySelectorAll('.my-notes__title')).map((n) => n.textContent)
    expect(titles).toContain('Notiz A')
    expect(titles).toContain('Notiz B')
  })

  it('shows the empty state when there are no notes', async () => {
    await mount()
    expect(container!.querySelector('.my-notes__empty')).not.toBeNull()
    expect(container!.querySelectorAll('.my-notes__row')).toHaveLength(0)
  })

  it('does not render edit or delete actions (Dashboard preview is read-only)', async () => {
    saveGlobalNote({ kind: 'jot', title: 'Notiz A', content: 'Inhalt A' })
    await mount()
    expect(container!.querySelector('.notizen-icon-btn--danger')).toBeNull()
    expect(container!.querySelector('.notizen-confirm-btn')).toBeNull()
    expect(listGlobalNotes()).toHaveLength(1)
  })

  it('opens the Notizen popup via the header affordance', async () => {
    await mount()
    const open = container!.querySelector<HTMLButtonElement>('.dashboard-view-all')!
    act(() => open.click())
    expect(notizenOpen).toHaveBeenCalledTimes(1)
  })
})
