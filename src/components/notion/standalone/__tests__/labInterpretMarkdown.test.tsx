/**
 * Proves (issue #11) that the "Labor interpretieren" render path turns markdown
 * the AI emits — **bold**, *italic*, and `- ` lists — into real markup
 * (`<strong>`, `<em>`, `<li>`) instead of showing literal asterisks. This is
 * the regression the owner reported as "claimed done but not working": the test
 * drives the FULL widget path (generate → result view), not the parser alone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockGenerate = vi.hoisted(() => vi.fn())
// The widget now runs generations as persisted AI jobs; the runner hook is the
// seam (start() resolves with the final result text).
vi.mock('../../../../hooks/useAiJobRunner', () => ({
  useAiJobRunner: () => ({
    progress: null,
    start: mockGenerate,
    continueInBackground: vi.fn(),
    cancel: vi.fn(),
  }),
}))
vi.mock('../../../../utils/standaloneNotes', () => ({ saveStandaloneNote: vi.fn() }))
vi.mock('../../NotionToast', () => ({ showNotionToast: vi.fn() }))
vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

import { StandalonePromptToolWidget } from '../StandalonePromptToolWidget'
import { StandaloneMarkdown } from '../StandaloneMarkdown'

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
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
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

describe('Labor interpretieren markdown rendering', () => {
  it('renders **bold**, *italic* and - lists as markup, not literal asterisks', async () => {
    mockGenerate.mockResolvedValue(
      'Befund: **deutlich erhöht** und *grenzwertig*.\n\n- CRP erhöht\n- BSG normal',
    )

    await act(async () => {
      root!.render(
        createElement(StandalonePromptToolWidget, {
          variant: 'labInterpret',
          caseId: 'default',
          onClose: () => {},
          embedded: true,
        }),
      )
      await Promise.resolve()
    })

    const textarea = container!.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    await act(async () => {
      setTextareaValue(textarea, 'CRP 80, BSG 10')
      await Promise.resolve()
    })

    const generateBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('standaloneGenerate'),
    ) as HTMLButtonElement
    expect(generateBtn).toBeTruthy()

    await act(async () => {
      generateBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockGenerate).toHaveBeenCalledTimes(1)

    const strong = container!.querySelector('strong')
    const em = container!.querySelector('em')
    const items = container!.querySelectorAll('li')

    expect(strong?.textContent).toBe('deutlich erhöht')
    expect(em?.textContent).toBe('grenzwertig')
    expect(items.length).toBe(2)
    // And the raw markdown delimiters must NOT survive as literal text.
    expect(container!.textContent).not.toContain('**deutlich erhöht**')
  })

  it('renders typographic (•) bullets and numbered lists as real list items', async () => {
    await act(async () => {
      root!.render(
        createElement(StandaloneMarkdown, {
          text: '• Erstens\n• Zweitens\n\n1. Schritt eins\n2. Schritt zwei',
        }),
      )
      await Promise.resolve()
    })
    expect(container!.querySelectorAll('ul li').length).toBe(2)
    expect(container!.querySelectorAll('ol li').length).toBe(2)
    expect(container!.textContent).not.toContain('•')
  })
})
