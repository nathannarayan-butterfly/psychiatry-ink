// @vitest-environment jsdom
/**
 * KB notes are ENTRY-SCOPED: a note taken on one entry (drug) must not appear on
 * another entry, and must never leak into the user-global notes pile. Sibling
 * surfaces bound to the same entry (inline rail notepad ↔ the Notizen bubble)
 * stay live via the same-window change event.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'tester' } }),
}))

import { useKnowledgeBaseNotes } from '../useKnowledgeBaseNotes'
import { listGlobalNotes } from '../../utils/standaloneNotes'

const captured: { html: string; setHtml: (h: string) => void } = { html: '', setHtml: () => {} }
function Harness({ id }: { id: string }) {
  const { html, setHtml } = useKnowledgeBaseNotes(id)
  captured.html = html
  captured.setHtml = setHtml
  return null
}

const slots: Record<string, { html: string; setHtml: (h: string) => void }> = {}
function SyncHarness({ id, slot }: { id: string; slot: string }) {
  const { html, setHtml } = useKnowledgeBaseNotes(id)
  slots[slot] = { html, setHtml }
  return null
}

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('useKnowledgeBaseNotes — entry scoping', () => {
  it('keeps a note scoped to its entry and out of the global pile', async () => {
    await act(async () => {
      root!.render(createElement(Harness, { id: 'drugA' }))
      await Promise.resolve()
    })
    expect(captured.html).toBe('')

    await act(async () => {
      captured.setHtml('<p>Notiz zu A</p>')
      await Promise.resolve()
    })
    expect(captured.html).toBe('<p>Notiz zu A</p>')

    // A different entry sees nothing of A's note.
    await act(async () => {
      root!.render(createElement(Harness, { id: 'drugB' }))
      await Promise.resolve()
    })
    expect(captured.html).toBe('')

    // The KB note never lands in the user-global notes list.
    expect(listGlobalNotes()).toHaveLength(0)

    // Returning to A restores its note.
    await act(async () => {
      root!.render(createElement(Harness, { id: 'drugA' }))
      await Promise.resolve()
    })
    expect(captured.html).toBe('<p>Notiz zu A</p>')
  })

  it('live-syncs the same entry across two mounted surfaces', async () => {
    await act(async () => {
      root!.render(
        createElement('div', null, [
          createElement(SyncHarness, { id: 'drugX', slot: 'a', key: 'a' }),
          createElement(SyncHarness, { id: 'drugX', slot: 'b', key: 'b' }),
        ]),
      )
      await Promise.resolve()
    })

    await act(async () => {
      slots.a!.setHtml('<p>Live</p>')
      await Promise.resolve()
    })

    expect(slots.b!.html).toBe('<p>Live</p>')
  })
})
