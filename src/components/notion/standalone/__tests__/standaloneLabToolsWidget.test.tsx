import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../../hooks/useLabTool', () => ({
  useLabTool: () => ({
    entries: [],
    activeLabGraphTitle: '',
    addEntry: vi.fn(),
    removeEntry: vi.fn(),
    updateEntry: vi.fn(),
    graphs: [],
    activeGraphId: null,
    setActiveGraphId: vi.fn(),
    createGraph: vi.fn(),
    deleteGraph: vi.fn(),
    renameGraph: vi.fn(),
  }),
}))
vi.mock('../../NotionLabCanvas', () => ({ NotionLabCanvas: () => null }))
vi.mock('../StandalonePromptToolWidget', () => ({
  StandalonePromptToolWidget: () => createElement('div', { 'data-testid': 'interpret' }),
}))

import { StandaloneLabToolsWidget } from '../StandaloneLabToolsWidget'

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
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

describe('StandaloneLabToolsWidget', () => {
  it('renders consolidated lab tools with visualize and interpret tabs', async () => {
    await act(async () => {
      root!.render(
        createElement(StandaloneLabToolsWidget, { caseId: 'default', onClose: () => {} }),
      )
      await Promise.resolve()
    })
    expect(container!.textContent).toContain('standaloneLabToolsTabVisualize')
    expect(container!.textContent).toContain('standaloneLabToolsTabInterpret')
  })
})
