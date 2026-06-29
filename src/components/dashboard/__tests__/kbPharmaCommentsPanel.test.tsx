// @vitest-environment jsdom
/**
 * The floating Kommentare bubble must be a clean, single-purpose comments
 * surface — NOT the legacy tabbed reading panel. These tests pin that contract:
 *  - `mode="comments"` renders comments only: no Comments/Ask-AI tab strip, no
 *    "KI fragen" tab, and no section ("Studienbereich") label in the popup.
 *  - comments are entry-scoped (every section's comment shows, like Notizen).
 *  - `mode="askAi"` still renders the section-grounded ask view (its own thing).
 *  - `mode="tabbed"` (inline, default) keeps the original tabs untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { UserComment } from '../../../types/knowledgeBaseAnnotations'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom does not implement scrollIntoView (the Ask-AI chat auto-scrolls on mount).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

const ENTRY_COMMENTS: UserComment[] = [
  {
    id: 'c1',
    userId: 'u1',
    medicationId: 'med-1',
    sectionId: 'kurzprofil',
    text: 'Comment on Kurzprofil',
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'c2',
    userId: 'u1',
    medicationId: 'med-1',
    sectionId: 'wirkmechanismus',
    text: 'Comment on Wirkmechanismus',
    createdAt: '2026-01-02T10:00:00.000Z',
  },
]

const CHAT_MESSAGES = [
  { id: 'm1', userId: 'u1', medicationId: 'med-1', sectionId: 'kurzprofil', role: 'assistant' as const, content: 'AI answer here', createdAt: '2026-01-03T10:00:00.000Z' },
]

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

vi.mock('../../../hooks/useKnowledgeBaseAnnotations', () => ({
  useKnowledgeBaseAnnotations: () => ({
    comments: ENTRY_COMMENTS,
    forSection: () => ({ highlights: [], comments: ENTRY_COMMENTS, chatMessages: CHAT_MESSAGES }),
    addHighlight: vi.fn(),
    removeHighlight: vi.fn(),
    addComment: vi.fn(),
    removeComment: vi.fn(),
    addChatMessage: vi.fn(),
  }),
}))

import { KnowledgeBaseReadingPanel } from '../KnowledgeBaseReadingPanel'

const baseProps = {
  medicationId: 'med-1',
  medicationName: 'Sertralin',
  sectionId: 'kurzprofil',
  sectionLabel: 'Studienbereich',
  sectionData: 'section text',
  language: 'de',
  embedded: true,
}

let root: Root | null = null
let container: HTMLDivElement | null = null

async function render(props: Record<string, unknown>) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(KnowledgeBaseReadingPanel, props as never))
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('KnowledgeBaseReadingPanel — Kommentare bubble (comments mode)', () => {
  it('renders comments only: no tab strip and no "KI fragen" tab', async () => {
    await render({ ...baseProps, mode: 'comments' })
    expect(container!.querySelector('[role="tablist"]')).toBeNull()
    expect(container!.querySelector('.kbp-reading-panel__tabs')).toBeNull()
    expect(container!.textContent).not.toContain('kbReadingTabAskAi')
  })

  it('does not show the section ("Studienbereich") label in the popup', async () => {
    await render({ ...baseProps, mode: 'comments' })
    expect(container!.querySelector('.kbp-reading-panel__section--embedded')).toBeNull()
    expect(container!.textContent).not.toContain('Studienbereich')
  })

  it('is entry-scoped: shows comments from every section, not just the active one', async () => {
    await render({ ...baseProps, mode: 'comments' })
    expect(container!.textContent).toContain('Comment on Kurzprofil')
    expect(container!.textContent).toContain('Comment on Wirkmechanismus')
  })
})

describe('KnowledgeBaseReadingPanel — Ask-AI stays its own surface', () => {
  it('mode="askAi" renders the chat view, still without a tab strip', async () => {
    await render({ ...baseProps, mode: 'askAi' })
    expect(container!.querySelector('[role="tablist"]')).toBeNull()
    expect(container!.textContent).toContain('AI answer here')
  })
})

describe('KnowledgeBaseReadingPanel — inline tabbed mode unchanged', () => {
  it('default (tabbed) still renders the Comments/Ask-AI tab strip', async () => {
    await render({ ...baseProps, embedded: false, onToggleCollapse: undefined })
    expect(container!.querySelector('[role="tablist"]')).not.toBeNull()
  })
})
