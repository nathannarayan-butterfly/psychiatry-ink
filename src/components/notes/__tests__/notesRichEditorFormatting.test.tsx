// @vitest-environment jsdom
/**
 * The general (global) Notizen editor matches the KB notepad's formatting: a
 * multi-colour highlight palette + a font-family selector, on top of the
 * existing bold/italic/underline. Formatting must persist as sanitised HTML
 * (highlight `background-color` + `font-family` survive), and legacy plain-text
 * notes must still render.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

import { NotesRichEditor } from '../NotesRichEditor'
import { sanitizeRichHtml } from '../../../utils/documentTemplate/htmlUtils'
import { HIGHLIGHT_COLORS } from '../../../types/knowledgeBaseAnnotations'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mountEditor(value: string) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      createElement(NotesRichEditor, { value, onChange: () => {} }),
    )
    await Promise.resolve()
    await Promise.resolve()
  })
}

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('NotesRichEditor formatting — persistence (sanitiser)', () => {
  it('preserves multi-colour highlight background-color through the save pipeline', () => {
    const out = sanitizeRichHtml('<p><mark style="background-color: #4ade80">grün</mark></p>')
    expect(out).toContain('background-color')
    expect(out.toLowerCase()).toContain('#4ade80')
  })

  it('preserves font-family through the save pipeline', () => {
    const out = sanitizeRichHtml('<p><span style="font-family: Georgia, serif">x</span></p>')
    expect(out).toContain('font-family')
    expect(out).toContain('Georgia')
  })
})

describe('NotesRichEditor toolbar — KB formatting parity', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a font selector plus the full multi-colour highlight palette', async () => {
    await mountEditor('')
    expect(container!.querySelector('.notizen-rte__font-select')).not.toBeNull()
    const swatches = container!.querySelectorAll('.notizen-rte__swatch')
    expect(swatches.length).toBe(HIGHLIGHT_COLORS.length)
    expect(container!.querySelector('.notizen-rte__btn--highlight-off')).not.toBeNull()
  })

  it('renders legacy plain-text notes as readable content', async () => {
    await mountEditor('Erste Zeile\nZweite Zeile')
    const editor = container!.querySelector('.notizen-rte__editor')
    expect(editor).not.toBeNull()
    expect(editor!.textContent).toContain('Erste Zeile')
    expect(editor!.textContent).toContain('Zweite Zeile')
  })
})
