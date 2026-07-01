// @vitest-environment jsdom
/**
 * Smoke test for the extended RichTextField toolbar (heading, strikethrough,
 * text color, highlight) added alongside the existing font/size/bold/italic/
 * underline/alignment/list controls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

import { RichTextField } from '../RichTextField'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(value: string, onChange: (html: string) => void) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(RichTextField, { value, onChange }))
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('RichTextField toolbar', () => {
  it('renders heading, strikethrough, text color and highlight controls', async () => {
    await mount('<p>Hello</p>', () => {})
    expect(container!.querySelector('.dt-rte__select--heading')).not.toBeNull()
    expect(container!.querySelector('[title="templateRteStrike"]')).not.toBeNull()
    expect(container!.querySelectorAll('.dt-rte__swatch-group')).toHaveLength(2)
    expect(container!.querySelectorAll('.dt-rte__swatch').length).toBeGreaterThan(0)
  })

  it('applies a heading level and emits sanitized HTML with the heading tag', async () => {
    let latest = ''
    await mount('<p>Hello</p>', (html) => {
      latest = html
    })
    const select = container!.querySelector<HTMLSelectElement>('.dt-rte__select--heading')!
    act(() => {
      select.focus()
      select.value = '2'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(latest).toContain('<h2>')
  })

  it('does not throw when clicking strikethrough, text color, and highlight controls', async () => {
    await mount('<p>Hello</p>', () => {})
    const strikeBtn = container!.querySelector<HTMLButtonElement>('[title="templateRteStrike"]')!
    const swatch = container!.querySelector<HTMLButtonElement>('.dt-rte__swatch')!
    expect(() => {
      act(() => strikeBtn.click())
      act(() => swatch.click())
    }).not.toThrow()
  })
})
