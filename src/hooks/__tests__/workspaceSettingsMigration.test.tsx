/**
 * Regression: custom workspace-component authoring was removed. On load, any
 * non-default components persisted on real devices (legacy custom entries, the
 * retired `labor` component) must be filtered out so only the default set
 * remains — without dropping the user's clinical documents. Saved documents
 * whose `typeId` referenced a now-removed custom component must still reopen,
 * resolving to a sane default rather than throwing.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useWorkspaceSettings } from '../useWorkspaceSettings'
import { DEFAULT_COMPONENT_IDS } from '../../utils/defaultComponents'
import { resolveNotionPageFromDocumentType } from '../../components/notion/notionPages'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const STORAGE_KEY = 'psychiatry-ink-workspace'

let container: HTMLDivElement
let root: Root | null = null
let captured: ReturnType<typeof useWorkspaceSettings> | null = null

function Probe() {
  captured = useWorkspaceSettings()
  return null
}

function renderHook() {
  root = createRoot(container)
  act(() => {
    root!.render(createElement(Probe))
  })
}

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  captured = null
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  localStorage.clear()
})

describe('useWorkspaceSettings migration to defaults', () => {
  it('drops legacy custom components and keeps the full default set', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        components: [
          { id: 'custom-letter', label: 'Eigene Komponente', icon: 'file-text', multistage: false, sections: [] },
          { id: 'labor', label: 'Labor', icon: 'flask', multistage: false, sections: [] },
        ],
      }),
    )

    renderHook()

    const ids = captured!.components.map((component) => component.id)
    expect(ids).not.toContain('custom-letter')
    expect(ids).not.toContain('labor')
    for (const defaultId of DEFAULT_COMPONENT_IDS) {
      expect(ids).toContain(defaultId)
    }
    // Every surviving component is a recognised default.
    for (const id of ids) {
      expect(captured!.isDefaultComponent(id)).toBe(true)
    }
  })

  it('falls back to defaults when storage is empty', () => {
    renderHook()
    const ids = captured!.components.map((component) => component.id)
    for (const defaultId of DEFAULT_COMPONENT_IDS) {
      expect(ids).toContain(defaultId)
    }
  })
})

describe('safe reopen of legacy documents with orphaned typeId', () => {
  it('resolves an unknown/removed custom typeId to a default page without throwing', () => {
    expect(() => resolveNotionPageFromDocumentType('custom-letter')).not.toThrow()
    expect(resolveNotionPageFromDocumentType('custom-letter')).toBe('aufnahme')
    expect(resolveNotionPageFromDocumentType('')).toBe('aufnahme')
  })
})
