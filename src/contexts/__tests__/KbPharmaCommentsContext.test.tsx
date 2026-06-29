// @vitest-environment jsdom
/**
 * Regression: DrugDetailView registers KB comments then patches section context
 * on active-section changes. Including the full context value in the patch
 * effect deps caused an infinite update loop (React #185).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, createElement, useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  KbPharmaCommentsProvider,
  useKbPharmaComments,
  type KbPharmaCommentsRegistration,
} from '../KbPharmaCommentsContext'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const BASE_REGISTRATION: KbPharmaCommentsRegistration = {
  medicationId: 'med-1',
  medicationName: 'Sertralin',
  sectionId: 'kurzprofil',
  sectionLabel: 'Kurzprofil',
  sectionData: 'Initial section text',
  language: 'de',
  tier: 'standard',
}

/** Mirrors KnowledgeBasePharma DrugDetailView register + patch lifecycle. */
function DrugDetailCommentsHarness({
  sectionId,
  sectionLabel,
  sectionData,
}: {
  sectionId: string
  sectionLabel: string
  sectionData: string
}) {
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  const { register, unregister, patchRegistration } = useKbPharmaComments()

  useEffect(() => {
    register({ ...BASE_REGISTRATION, sectionId, sectionLabel, sectionData })
    return () => unregister()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BASE_REGISTRATION.medicationId, BASE_REGISTRATION.medicationName, BASE_REGISTRATION.language])

  useEffect(() => {
    patchRegistration({ sectionId, sectionLabel, sectionData })
  }, [patchRegistration, sectionId, sectionLabel, sectionData])

  return createElement('span', { 'data-render-count': String(renderCountRef.current) })
}

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mountHarness(props: {
  sectionId: string
  sectionLabel: string
  sectionData: string
}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      createElement(
        KbPharmaCommentsProvider,
        null,
        createElement(DrugDetailCommentsHarness, props),
      ),
    )
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('KbPharmaCommentsContext — register/patch lifecycle', () => {
  it('does not loop when patching section context after register', async () => {
    await mountHarness({
      sectionId: 'kurzprofil',
      sectionLabel: 'Kurzprofil',
      sectionData: 'Section body',
    })

    const renderCount = Number(
      container!.querySelector('span')?.getAttribute('data-render-count') ?? '0',
    )
    expect(renderCount).toBeLessThan(10)

    await act(async () => {
      root!.render(
        createElement(
          KbPharmaCommentsProvider,
          null,
          createElement(DrugDetailCommentsHarness, {
            sectionId: 'wirkmechanismus',
            sectionLabel: 'Wirkmechanismus',
            sectionData: 'Updated section body',
          }),
        ),
      )
      await Promise.resolve()
    })

    const afterPatchCount = Number(
      container!.querySelector('span')?.getAttribute('data-render-count') ?? '0',
    )
    expect(afterPatchCount).toBeLessThan(15)
  })
})
