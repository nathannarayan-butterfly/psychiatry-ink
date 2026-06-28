/**
 * The patient-less education widget must persist its assembled text as a
 * STANDALONE note (filed under the default case via `saveStandaloneNote`) and
 * must never write into a patient case section. We mock the heavy generic
 * education workspace down to a single button that invokes the `onSaveToNotes`
 * callback the widget wires up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockSave = vi.hoisted(() => vi.fn())
vi.mock('../../../../utils/standaloneNotes', () => ({ saveStandaloneNote: mockSave }))
vi.mock('../../NotionToast', () => ({ showNotionToast: vi.fn() }))
vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

// Reduce the generic workspace to a trigger that emits the assembled text.
vi.mock('../../../patientEducationGeneric/PatientEducationGenericWorkspace', () => ({
  PatientEducationGenericWorkspace: ({
    onSaveToNotes,
  }: {
    onSaveToNotes?: (text: string, title: string) => void
  }) =>
    createElement('button', {
      className: 'mock-save',
      onClick: () => onSaveToNotes?.('Aufklärungstext zum Thema Schlafhygiene.', 'Schlafhygiene'),
    }),
}))

import { StandaloneEducationWidget } from '../StandaloneEducationWidget'

let root: Root | null = null
let container: HTMLDivElement | null = null

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

describe('StandaloneEducationWidget', () => {
  it('saves the assembled education text as a standalone note', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root!.render(
        createElement(StandaloneEducationWidget, { caseId: 'default-storage', onClose: () => {} }),
      )
      await Promise.resolve()
    })

    expect(mockSave).not.toHaveBeenCalled()

    await act(async () => {
      container!.querySelector('.mock-save')?.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true }),
      )
      await Promise.resolve()
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    const [caseId, input] = mockSave.mock.calls[0]
    expect(caseId).toBe('default-storage')
    expect(input).toMatchObject({
      kind: 'patient-education',
      title: 'Schlafhygiene',
      content: 'Aufklärungstext zum Thema Schlafhygiene.',
      category: 'formulare',
    })
  })
})
