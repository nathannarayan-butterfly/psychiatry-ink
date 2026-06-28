// @vitest-environment jsdom
/**
 * The global bottom-right launcher renders BOTH bubbles (Notizen + Butterfly) on
 * every route and routes clicks to the right context's open() — Butterfly reuses
 * the existing Ask Butterfly flow, Notizen opens the notes popup.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const butterflyOpen = vi.hoisted(() => vi.fn())
const notizenOpen = vi.hoisted(() => vi.fn())

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../contexts/AskButterflyContext', () => ({
  useAskButterfly: () => ({ isOpen: false, open: butterflyOpen }),
}))
vi.mock('../../../contexts/NotizenContext', () => ({
  useNotizen: () => ({ isOpen: false, open: notizenOpen }),
}))
vi.mock('../../ButterflyLogo', () => ({ ButterflyLogo: () => null }))

import { FloatingToolsFab } from '../FloatingToolsFab'

let root: Root | null = null
let container: HTMLDivElement | null = null

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(FloatingToolsFab))
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

describe('FloatingToolsFab', () => {
  it('renders the Notizen and Butterfly bubbles', async () => {
    await mount()
    const notizenBtn = container!.querySelector('.floating-tools-fab__btn--notizen')
    const butterflyBtn = container!.querySelector('.floating-tools-fab__btn--butterfly')
    expect(notizenBtn).not.toBeNull()
    expect(butterflyBtn).not.toBeNull()
    expect(notizenBtn!.getAttribute('aria-label')).toBe('notizenOpen')
    expect(butterflyBtn!.getAttribute('aria-label')).toBe('askButterflyOpen')
  })

  it('opens the matching tool on click', async () => {
    await mount()
    const notizenBtn = container!.querySelector<HTMLButtonElement>('.floating-tools-fab__btn--notizen')!
    const butterflyBtn = container!.querySelector<HTMLButtonElement>('.floating-tools-fab__btn--butterfly')!
    act(() => notizenBtn.click())
    act(() => butterflyBtn.click())
    expect(notizenOpen).toHaveBeenCalledTimes(1)
    expect(butterflyOpen).toHaveBeenCalledTimes(1)
  })
})
