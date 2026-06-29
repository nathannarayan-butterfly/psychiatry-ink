// @vitest-environment jsdom
/**
 * Header-control wiring for the Kommentare floating/dock panels.
 *
 * These tests PROVE — by clicking the real header buttons against the real
 * KbPharmaComments context — that:
 *   - the header is the shared Notizen/Butterfly row: [logo] → [title] → [actions].
 *   - the floating dialog carries `ask-butterfly-dialog--floating`, the class the
 *     overlay needs to override its `pointer-events: none` (the live "dead button"
 *     bug was the missing class, not unwired handlers).
 *   - MOVE (undock from docked) flips the panel back to floating.
 *   - DOCK (from floating) sticks it to the right border (mode → 'docked').
 *   - CLOSE dismisses the panel (isOpen → false).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, useEffect, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
// The panel body is irrelevant to header-control wiring — stub it so the test is
// focused and doesn't pull in annotation/localStorage machinery.
vi.mock('../KnowledgeBaseReadingPanel', () => ({
  KnowledgeBaseReadingPanel: () => createElement('div', { 'data-testid': 'reading-panel' }),
}))

import {
  KbPharmaCommentsProvider,
  useKbPharmaComments,
} from '../../../contexts/KbPharmaCommentsContext'
import { KbPharmaCommentsDockPanel } from '../KbPharmaCommentsDockPanel'
import { KbPharmaCommentsFloatingDialog } from '../KbPharmaCommentsFloatingDialog'

function Probe() {
  const { mode, isOpen } = useKbPharmaComments()
  return createElement('div', {
    'data-testid': 'probe',
    'data-mode': mode,
    'data-open': String(isOpen),
  })
}

function Seed({ initialMode }: { initialMode: 'floating' | 'docked' }) {
  const { register, open, dock } = useKbPharmaComments()
  useEffect(() => {
    register({
      medicationId: 'med-1',
      medicationName: 'Sertralin',
      sectionId: 'kurzprofil',
      sectionLabel: 'Studienbereich',
      sectionData: 'data',
      language: 'de',
    })
    open()
    if (initialMode === 'docked') dock()
  }, [register, open, dock, initialMode])
  return null
}

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount(initialMode: 'floating' | 'docked' = 'floating') {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      createElement(
        KbPharmaCommentsProvider,
        null,
        createElement(Seed, { initialMode }) as ReactNode,
        createElement(Probe) as ReactNode,
        createElement(KbPharmaCommentsDockPanel, { isOpen: true, rightOffset: 0 }) as ReactNode,
        createElement(KbPharmaCommentsFloatingDialog) as ReactNode,
      ),
    )
    await Promise.resolve()
  })
}

async function click(el: Element | null) {
  expect(el).not.toBeNull()
  await act(async () => {
    ;(el as HTMLElement).click()
    await Promise.resolve()
  })
}

const probeMode = () => container!.querySelector('[data-testid="probe"]')!.getAttribute('data-mode')
const probeOpen = () => container!.querySelector('[data-testid="probe"]')!.getAttribute('data-open')
const floatRoot = () => container!.querySelector('.ask-butterfly-dialog--floating')
const dockRoot = () => container!.querySelector('.kbp-comments-dock-panel')

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

describe('Kommentare header — shared Notizen/Butterfly markup', () => {
  it('renders [logo] → [title] → [actions] in order (floating)', async () => {
    await mount('floating')
    const header = floatRoot()!.querySelector('.ask-butterfly-dialog__header')!
    expect(header).not.toBeNull()
    // First block: title-wrap holding the logo mark then the title.
    const titleWrap = header.children[0]
    expect(titleWrap.classList.contains('ask-butterfly-dialog__title-wrap')).toBe(true)
    expect(titleWrap.querySelector('.ask-butterfly-dialog__mark')).not.toBeNull()
    expect(titleWrap.querySelector('.ask-butterfly-dialog__title')).not.toBeNull()
    // Second block: the move/dock/close action row.
    const actions = header.children[1]
    expect(actions.classList.contains('ask-butterfly-dialog__header-actions')).toBe(true)
    const buttons = actions.querySelectorAll('button')
    expect(buttons.length).toBe(3)
    expect(buttons[0].classList.contains('ask-butterfly-dialog__drag-handle')).toBe(true)
    expect(buttons[2].classList.contains('ask-butterfly-dialog__close')).toBe(true)
  })

  it('floating dialog carries ask-butterfly-dialog--floating (overrides overlay pointer-events:none)', async () => {
    await mount('floating')
    expect(floatRoot()).not.toBeNull()
    expect(floatRoot()!.classList.contains('ask-butterfly-dialog--floating')).toBe(true)
  })

  it('docked panel header is the same shared row with [move(undock), close]', async () => {
    await mount('docked')
    const header = dockRoot()!.querySelector('.ask-butterfly-dialog__header')!
    expect(header.children[0].classList.contains('ask-butterfly-dialog__title-wrap')).toBe(true)
    const actions = header.children[1]
    expect(actions.classList.contains('ask-butterfly-dialog__header-actions')).toBe(true)
    expect(actions.querySelectorAll('button').length).toBe(2)
  })
})

describe('Kommentare controls — proven wired by clicking', () => {
  it('DOCK (floating) sticks to the right border → mode becomes docked', async () => {
    await mount('floating')
    expect(probeMode()).toBe('floating')
    await click(floatRoot()!.querySelector('button[aria-label="askButterflyDock"]'))
    expect(probeMode()).toBe('docked')
  })

  it('MOVE (docked → undock) returns the panel to floating', async () => {
    await mount('docked')
    expect(probeMode()).toBe('docked')
    await click(dockRoot()!.querySelector('button[aria-label="askButterflyUndock"]'))
    expect(probeMode()).toBe('floating')
  })

  it('CLOSE dismisses the panel (isOpen → false) from the floating header', async () => {
    await mount('floating')
    expect(probeOpen()).toBe('true')
    await click(floatRoot()!.querySelector('button[aria-label="settingsClose"]'))
    expect(probeOpen()).toBe('false')
  })

  it('CLOSE dismisses the panel from the docked header', async () => {
    await mount('docked')
    expect(probeOpen()).toBe('true')
    await click(dockRoot()!.querySelector('button[aria-label="settingsClose"]'))
    expect(probeOpen()).toBe('false')
  })
})
