/**
 * Patient-context Befund input modes (Issue B) + canonical section chrome
 * (Issue A).
 *
 * Verified here:
 *  - The structured-befund entry offers the three modes (structured form,
 *    guided, free-text + KI) and fires NO billed AI generation on mount.
 *  - The free-text + KI "use as-is" path writes a structured befund record into
 *    the case Diagnostik archive (NOT note-only).
 *  - The explicit KI-Optimierung action fires the billed generation exactly once
 *    and persists the optimised narrative.
 *  - A narrative-only befund record renders its narrative (free-text fallback).
 *  - The shared section shell renders the canonical header + order action.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockExecute = vi.hoisted(() =>
  vi.fn(async () => ({ text: 'KI-optimierter Thoraxbefund.', creditsCharged: 1 })),
)
vi.mock('../../../services/aiGeneration', () => ({ executeAiGeneration: mockExecute }))
vi.mock('../../../utils/estimateCredits', () => ({ estimateGenerationCredits: () => 1 }))
vi.mock('../../notion/NotionToast', () => ({ showNotionToast: vi.fn() }))
vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

import { PatientBefundWidget } from '../PatientBefundWidget'
import { DiagnostikSectionShell } from '../DiagnostikSectionShell'
import { loadDiagnostikBefunde, createBefundRecord } from '../../../utils/befundArchive'
import { renderBefundContent, getBefundDisplaySections } from '../../../utils/befundRender'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(node: ReturnType<typeof createElement>): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(node)
    await Promise.resolve()
  })
}

async function click(el: Element | null | undefined): Promise<void> {
  await act(async () => {
    el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    // Flush the async AI chain (executeAiGeneration → onText → archive write).
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function setTextarea(el: HTMLTextAreaElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set
  await act(async () => {
    setter?.call(el, value)
    el.dispatchEvent(new window.Event('input', { bubbles: true }))
    await Promise.resolve()
  })
}

function byText(selector: string, text: string): Element | undefined {
  return Array.from(container!.querySelectorAll(selector)).find((el) =>
    (el.textContent ?? '').includes(text),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
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

describe('PatientBefundWidget — patient-context input modes', () => {
  it('offers the three modes and fires NO billed AI on mount', async () => {
    await mount(
      createElement(PatientBefundWidget, {
        caseId: 'case-modes',
        type: 'roentgen' as const,
        onClose: () => {},
        onSaved: () => {},
      }),
    )
    expect(mockExecute).not.toHaveBeenCalled()
    const cards = container!.querySelectorAll('.swx-mode-card')
    // structured + guided (roentgen has a guided schema) + free-text
    expect(cards.length).toBe(3)
    expect(byText('.swx-mode-card', 'befundModeStructured')).toBeTruthy()
    expect(byText('.swx-mode-card', 'guidedEntryModeGuided')).toBeTruthy()
    expect(byText('.swx-mode-card', 'standaloneBefundModeFreetext')).toBeTruthy()
  })

  it('free-text "use as-is" writes a structured befund record to the archive', async () => {
    let saved = false
    await mount(
      createElement(PatientBefundWidget, {
        caseId: 'case-raw',
        type: 'roentgen' as const,
        onClose: () => {},
        onSaved: () => {
          saved = true
        },
      }),
    )
    await click(byText('.swx-mode-card', 'standaloneBefundModeFreetext'))
    const editor = container!.querySelector('.swx-rewrite__editor') as HTMLTextAreaElement
    expect(editor).toBeTruthy()
    await setTextarea(editor, 'Unauffälliger Thoraxbefund, keine Infiltrate.')
    await click(byText('.wai-btn', 'standaloneBefundUseRaw'))

    expect(mockExecute).not.toHaveBeenCalled()
    expect(saved).toBe(true)
    const records = loadDiagnostikBefunde('case-raw')
    expect(records).toHaveLength(1)
    expect(records[0].type).toBe('roentgen')
    expect(renderBefundContent(records[0], 'de')).toContain('keine Infiltrate')
  })

  it('explicit KI-Optimierung fires the billed generation once and saves the result', async () => {
    await mount(
      createElement(PatientBefundWidget, {
        caseId: 'case-ki',
        type: 'roentgen' as const,
        onClose: () => {},
        onSaved: () => {},
      }),
    )
    await click(byText('.swx-mode-card', 'standaloneBefundModeFreetext'))
    const editor = container!.querySelector('.swx-rewrite__editor') as HTMLTextAreaElement
    await setTextarea(editor, 'thorax ok')
    await click(container!.querySelector('.wai-btn--primary'))

    expect(mockExecute).toHaveBeenCalledTimes(1)
    const records = loadDiagnostikBefunde('case-ki')
    expect(records).toHaveLength(1)
    expect(renderBefundContent(records[0], 'de')).toContain('KI-optimierter')
  })
})

describe('befundRender — free-text narrative fallback', () => {
  it('renders the narrative when a record has no structured field values', () => {
    const record = createBefundRecord(
      'case-narr',
      'roentgen',
      1,
      { narrative: 'Freitext-Befund ohne strukturierte Felder.' },
      'draft',
    )
    expect(renderBefundContent(record, 'de')).toBe('Freitext-Befund ohne strukturierte Felder.')
    const sections = getBefundDisplaySections(record, 'de')
    expect(sections).toHaveLength(1)
    expect(sections[0].fields[0].value).toContain('ohne strukturierte Felder')
  })
})

describe('DiagnostikSectionShell — canonical section chrome', () => {
  it('renders the title, order action and body children', async () => {
    const onRequest = vi.fn()
    await mount(
      createElement(DiagnostikSectionShell, {
        title: 'EKG',
        requestLabel: 'Anfordern',
        onRequest,
        children: createElement('div', { className: 'shell-kid' }, 'body'),
      }),
    )
    expect(container!.querySelector('.diagnostik-freetext__section-title')?.textContent).toBe('EKG')
    const requestBtn = byText('.diagnostik-befunde__action-btn--request', 'Anfordern')
    expect(requestBtn).toBeTruthy()
    expect(container!.querySelector('.shell-kid')).toBeTruthy()
    await click(requestBtn)
    expect(onRequest).toHaveBeenCalledTimes(1)
  })
})
