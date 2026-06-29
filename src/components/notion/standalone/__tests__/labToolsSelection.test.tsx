/**
 * Proves the pasted-report selection flow (issue #11.2/#11.3): a pasted report
 * parses into individually selectable values, and the import/compare action is
 * gated behind choosing at least 2 (with a visible hint) because a comparison
 * graph needs two points to plot a trend.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { parseLabReport } from '../../../../utils/lab/parseLabReport'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const addEntries = vi.hoisted(() => vi.fn())
vi.mock('../../../../hooks/useLabTool', () => ({
  useLabTool: () => ({ entries: [], activeLabGraphTitle: '', addEntries }),
}))
vi.mock('../../NotionLabCanvas', () => ({ NotionLabCanvas: () => null }))
vi.mock('../StandalonePromptToolWidget', () => ({ StandalonePromptToolWidget: () => null }))
vi.mock('../../../../utils/standaloneNotes', () => ({ saveStandaloneNote: vi.fn() }))
vi.mock('../../NotionToast', () => ({ showNotionToast: vi.fn() }))
vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

import { StandaloneLabToolsWidget } from '../StandaloneLabToolsWidget'

const REPORT = ['Natrium 140 mmol/l (135-145)', 'Kalium 4.2 mmol/l (3.5-5.0)', 'Kreatinin 0.9 mg/dl (0.7-1.2)'].join('\n')

let root: Root | null = null
let container: HTMLDivElement | null = null

function setTextareaValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
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

describe('parseLabReport selectability', () => {
  it('parses a pasted report into multiple selectable values', () => {
    const values = parseLabReport(REPORT)
    expect(values.length).toBe(3)
    expect(values.map((v) => v.parameter)).toEqual(['Natrium', 'Kalium', 'Kreatinin'])
    expect(values[0]).toMatchObject({ value: 140, referenceLow: 135, referenceHigh: 145 })
  })
})

describe('StandaloneLabToolsWidget pasted-value selection gate', () => {
  it('requires ≥2 selected values to import and shows a hint otherwise', async () => {
    await act(async () => {
      root!.render(createElement(StandaloneLabToolsWidget, { caseId: 'default', onClose: () => {} }))
      await Promise.resolve()
    })

    const textarea = container!.querySelector('.swx-lab-paste__textarea') as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    await act(async () => {
      setTextareaValue(textarea, REPORT)
      await Promise.resolve()
    })

    const parseBtn = Array.from(container!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('standaloneLabToolsPasteParse'),
    ) as HTMLButtonElement
    await act(async () => {
      parseBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const checkboxes = () =>
      Array.from(
        container!.querySelectorAll('.swx-lab-paste__row input[type="checkbox"]'),
      ) as HTMLInputElement[]
    const importBtn = () =>
      Array.from(container!.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('standaloneLabToolsPasteImport'),
      ) as HTMLButtonElement | undefined
    const hint = () => container!.querySelector('.swx-lab-paste__hint')

    // All 3 parsed and selected by default → import enabled, no hint.
    expect(checkboxes().length).toBe(3)
    expect(importBtn()?.disabled).toBe(false)
    expect(hint()).toBeNull()

    // Deselect two → only 1 selected → import disabled + hint visible.
    await act(async () => {
      checkboxes()[0].click()
      checkboxes()[1].click()
      await Promise.resolve()
    })
    expect(importBtn()?.disabled).toBe(true)
    expect(hint()?.textContent).toContain('standaloneLabToolsPasteMinTwo')

    // Re-select one → back to 2 → import enabled again, importing the chosen pair.
    await act(async () => {
      checkboxes()[0].click()
      await Promise.resolve()
    })
    expect(importBtn()?.disabled).toBe(false)
    await act(async () => {
      importBtn()!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(addEntries).toHaveBeenCalledTimes(1)
    expect(addEntries.mock.calls[0][0].length).toBe(2)
  })
})
