// @vitest-environment jsdom
/**
 * The Notizen panel is CONTEXT-AWARE of the active Knowledge-Base entry: while a
 * KB drug is being read (a KB-pharma comments registration is present) the panel
 * scopes to that entry's notepad (by entry id) instead of the user-global notes
 * list; with no entry active it shows the global notes pile as before.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mockRegistration: { medicationId: string; medicationName: string; language: string } | null = null

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../contexts/KbPharmaCommentsContext', () => ({
  useOptionalKbPharmaComments: () => (mockRegistration ? { registration: mockRegistration } : null),
}))
vi.mock('../../dashboard/KnowledgeBaseNotes', () => ({
  KnowledgeBaseNotes: (props: { medicationId: string; embedded?: boolean }) =>
    createElement('div', {
      'data-testid': 'kb-notes',
      'data-med': props.medicationId,
      'data-embedded': String(Boolean(props.embedded)),
    }),
}))
vi.mock('../NotesRichEditor', () => ({
  NotesRichEditor: () => createElement('div', { 'data-testid': 'rte' }),
}))
vi.mock('../../../utils/standaloneNotes', () => ({
  GLOBAL_NOTES_CASE_ID: 'default',
  listGlobalNotes: () => [],
  saveGlobalNote: () => undefined,
  updateGlobalNote: () => undefined,
  deleteGlobalNote: () => undefined,
}))

import { NotizenPanel } from '../NotizenPanel'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(NotizenPanel, { variant: 'floating', headerActions: null }))
    await Promise.resolve()
  })
}

beforeEach(() => {
  mockRegistration = null
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('NotizenPanel — context-aware entry scoping', () => {
  it('shows the global notes list when no KB entry is active', async () => {
    mockRegistration = null
    await mount()
    expect(container!.querySelector('.notizen-list__toolbar')).not.toBeNull()
    expect(container!.querySelector('.notizen-entry')).toBeNull()
    expect(container!.querySelector('[data-testid="kb-notes"]')).toBeNull()
  })

  it('scopes to the active KB entry notepad (not the global pile)', async () => {
    mockRegistration = { medicationId: 'drugA', medicationName: 'Aripiprazol', language: 'de' }
    await mount()
    const entry = container!.querySelector('.notizen-entry')
    const kbNotes = container!.querySelector('[data-testid="kb-notes"]')
    expect(entry).not.toBeNull()
    expect(kbNotes).not.toBeNull()
    expect(kbNotes!.getAttribute('data-med')).toBe('drugA')
    expect(kbNotes!.getAttribute('data-embedded')).toBe('true')
    // The global notes list must NOT be rendered in entry mode.
    expect(container!.querySelector('.notizen-list__toolbar')).toBeNull()
    // The entry name is surfaced in the header.
    expect(container!.querySelector('.notizen-scope-name')!.textContent).toBe('Aripiprazol')
  })

  it('re-scopes when the active entry changes (A → B)', async () => {
    mockRegistration = { medicationId: 'drugA', medicationName: 'Aripiprazol', language: 'de' }
    await mount()
    expect(container!.querySelector('[data-testid="kb-notes"]')!.getAttribute('data-med')).toBe('drugA')

    mockRegistration = { medicationId: 'drugB', medicationName: 'Quetiapin', language: 'de' }
    await act(async () => {
      root!.render(createElement(NotizenPanel, { variant: 'floating', headerActions: null }))
      await Promise.resolve()
    })
    expect(container!.querySelector('[data-testid="kb-notes"]')!.getAttribute('data-med')).toBe('drugB')
  })
})
