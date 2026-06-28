import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { TranslationProvider } from '../../../context/TranslationContext'
import type { UiLanguage } from '../../../types/settings'
import { findGermanTokens } from '../../../testing/germanLeak'
import { KnowledgeBaseClinical } from '../KnowledgeBaseClinical'

/**
 * Render-scan regression guard for the KB "New Entry" surface, wired into the
 * single-source-of-truth German-in-English leak detector (`src/testing/germanLeak.ts`).
 *
 * The original bug (root cause #3 in germanLeak.ts) was a live component
 * rendering a canonical German enum value verbatim: the category `<option>`s
 * showed "Klinik"/"Pharmakologie"/… even in the English KB, instead of routing
 * through `pickKbLocalizedText(cat, kbCategoryLabelEn(cat), language)`. The
 * data-scanning guardrails cannot see that — only a render scan of the actual
 * dialog can. This test mounts the dialog in the English KB context and asserts
 * the visible text carries ZERO German tokens, so any future component that
 * renders a raw German enum/string on this surface fails CI.
 */

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  if (activeRoot) act(() => activeRoot!.unmount())
  activeContainer?.remove()
  activeRoot = null
  activeContainer = null
  localStorage.clear()
})

function render(language: UiLanguage): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      createElement(TranslationProvider, {
        language,
        englishVariant: 'uk',
        children: createElement(KnowledgeBaseClinical, { onClose: () => {} }),
      }),
    )
  })
  activeRoot = root
  activeContainer = container
  return container
}

function openAddDialog(container: HTMLDivElement): void {
  const addBtn = container.querySelector<HTMLButtonElement>('.kbp-btn--primary')
  expect(addBtn, 'New Entry button should be present in the browse toolbar').not.toBeNull()
  act(() => {
    addBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function dialogElement(container: HTMLDivElement): HTMLElement {
  const dialog = container.querySelector<HTMLElement>('.kb-dialog')
  expect(dialog, 'the New Entry dialog should be open').not.toBeNull()
  return dialog as HTMLElement
}

/**
 * All human-visible text from an element: each rendered text node collected
 * SEPARATELY (so sibling labels like `<option>` values are scanned on their own
 * and never concatenate into a single run-on superword that whole-word token
 * matching would miss), plus the user-facing `placeholder` / `aria-label` /
 * `title` attributes a clinician actually reads. Internal `value` attributes —
 * which legitimately keep the canonical German enum — are NOT scanned.
 */
function visibleText(el: HTMLElement): string {
  const parts: string[] = []
  const walker = el.ownerDocument!.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    parts.push(node.nodeValue ?? '')
  }
  for (const attr of ['placeholder', 'aria-label', 'title']) {
    el.querySelectorAll(`[${attr}]`).forEach((node) => {
      parts.push(node.getAttribute(attr) ?? '')
    })
  }
  return parts.join('\n')
}

function categorySelect(container: HTMLDivElement): HTMLElement {
  const select = dialogElement(container).querySelector<HTMLElement>('select.kb-dialog__select')
  expect(select, 'the category selector should be present').not.toBeNull()
  return select as HTMLElement
}

describe('KB New Entry dialog — German-leak render guard', () => {
  it('renders ZERO German tokens in the English KB dialog (detector-backed)', () => {
    const container = render('en')
    openAddDialog(container)

    const dialogText = visibleText(dialogElement(container))
    expect(
      findGermanTokens(dialogText),
      `German leaked into the English New Entry dialog: "${dialogText}"`,
    ).toEqual([])
  })

  it('renders ZERO German tokens in the English category selector specifically', () => {
    const container = render('en')
    openAddDialog(container)

    const selectText = visibleText(categorySelect(container))
    expect(
      findGermanTokens(selectText),
      `German category enum leaked into the English selector: "${selectText}"`,
    ).toEqual([])
  })

  it('control: the German KB category selector DOES read as German (detector + localization both meaningful)', () => {
    const container = render('de')
    openAddDialog(container)

    const tokens = findGermanTokens(visibleText(categorySelect(container)))
    // Proves localization actually flips by language AND that the detector can
    // see these enum values — so the English assertions above are not vacuous.
    expect(tokens).toContain('Klinik')
    expect(tokens.length).toBeGreaterThan(0)
  })
})
