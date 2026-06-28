/**
 * The patient-less Medikamentencheck (#1) must accept comma-separated FREE-TEXT
 * medication entry. Names found in the knowledge base are badged "DB" and feed
 * the deterministic checks; names NOT in the database are badged "AI" and can be
 * checked via an EXPLICIT "Mit KI prüfen" call (never on mount). We mock the
 * heavy KB hook + sub-panels and the AI endpoint, but keep the real KB resolver.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockAsk = vi.hoisted(() => vi.fn())
const mockSave = vi.hoisted(() => vi.fn())

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../../hooks/useKnowledgeBaseDrugs', () => ({
  useKnowledgeBaseDrugs: () => ({
    drugs: [{ id: 'd1', genericName: 'Sertralin', brandNames: ['Zoloft'] }],
  }),
}))
vi.mock('../../../therapy/CombinationCheckPanel', () => ({ CombinationCheckPanel: () => null }))
vi.mock('../../../medication/MedicationDrugSuggest', () => ({ MedicationDrugSuggest: () => null }))
vi.mock('../../../medication/ReceptorProfileSection', () => ({ ReceptorProfileSection: () => null }))
vi.mock('../StandaloneResultPanel', () => ({ StandaloneResultPanel: () => null }))
vi.mock('../useMedicationCorrelationLabels', () => ({
  useMedicationCorrelationLabels: () => ({
    sideEffectCount: () => '',
  }),
}))
vi.mock('../../../../utils/standalone/medicationCorrelation', () => ({
  buildMedicationCorrelationSummary: () => 'summary',
}))
vi.mock('../../../../services/pharmaAskApi', () => ({ askPharmaQuestion: mockAsk }))
vi.mock('../../../../utils/standaloneNotes', () => ({ saveStandaloneNote: mockSave }))
vi.mock('../../NotionToast', () => ({ showNotionToast: vi.fn() }))

import { StandaloneMedicationWidget } from '../StandaloneMedicationWidget'

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

function buttonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container!.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(text),
  ) as HTMLButtonElement | undefined
}

beforeEach(() => {
  vi.clearAllMocks()
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

async function renderWidget() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      createElement(StandaloneMedicationWidget, { caseId: 'default-storage', onClose: () => {} }),
    )
    await Promise.resolve()
  })
}

describe('StandaloneMedicationWidget — comma free-text + off-DB AI check', () => {
  it('parses comma free-text into DB-resolved and off-database meds', async () => {
    await renderWidget()
    expect(mockAsk).not.toHaveBeenCalled()

    const area = container!.querySelector<HTMLTextAreaElement>('.swx-field__textarea')!
    await act(async () => {
      setTextareaValue(area, 'Sertralin, Foobarol')
      await Promise.resolve()
    })

    await act(async () => {
      container!.querySelector<HTMLButtonElement>('.swx-rewrite__controls button')!.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true }),
      )
      await Promise.resolve()
    })

    // Sertralin resolves from the KB (DB badge); Foobarol is off-database (AI badge).
    const dbTags = container!.querySelectorAll('.swx-chip__tag--db')
    const aiTags = container!.querySelectorAll('.swx-chip__tag--ai')
    expect(dbTags.length).toBe(1)
    expect(aiTags.length).toBe(1)
    expect(container!.textContent).toContain('Sertralin')
    expect(container!.textContent).toContain('Foobarol')
  })

  it('runs the explicit AI interaction check across the full list', async () => {
    mockAsk.mockResolvedValue({ answer: 'KI-Antwort zur Wechselwirkung', model: { label: 'TestModel' } })
    await renderWidget()

    const area = container!.querySelector<HTMLTextAreaElement>('.swx-field__textarea')!
    await act(async () => {
      setTextareaValue(area, 'Sertralin, Foobarol')
      await Promise.resolve()
    })
    await act(async () => {
      container!.querySelector<HTMLButtonElement>('.swx-rewrite__controls button')!.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true }),
      )
      await Promise.resolve()
    })

    const aiBtn = buttonByText('standaloneMedicationAiCheck')
    expect(aiBtn).toBeDefined()
    // No auto-run: nothing called until the explicit button click.
    expect(mockAsk).not.toHaveBeenCalled()

    await act(async () => {
      aiBtn!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockAsk).toHaveBeenCalledTimes(1)
    const arg = mockAsk.mock.calls[0][0] as { medicationName: string }
    expect(arg.medicationName).toContain('Sertralin')
    expect(arg.medicationName).toContain('Foobarol')
    expect(container!.querySelector('.swx-aicheck__answer')?.textContent).toContain(
      'KI-Antwort zur Wechselwirkung',
    )
  })
})
