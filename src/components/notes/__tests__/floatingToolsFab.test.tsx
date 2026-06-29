// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const butterflyOpen = vi.hoisted(() => vi.fn())
const notizenOpen = vi.hoisted(() => vi.fn())
const kbCommentsOpen = vi.hoisted(() => vi.fn())
const kbCommentsClose = vi.hoisted(() => vi.fn())

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))
vi.mock('../../../contexts/AskButterflyContext', () => ({
  useAskButterfly: () => ({ isOpen: false, open: butterflyOpen }),
}))
vi.mock('../../../contexts/NotizenContext', () => ({
  useNotizen: () => ({ isOpen: false, open: notizenOpen }),
}))
vi.mock('../../../contexts/KbPharmaCommentsContext', () => ({
  useKbPharmaComments: () => ({
    isRegistered: true,
    isOpen: false,
    open: kbCommentsOpen,
    close: kbCommentsClose,
  }),
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
  it('renders Kommentare, Notizen and Butterfly bubbles', async () => {
    await mount()
    expect(container!.querySelector('.floating-tools-fab__btn--comments')).not.toBeNull()
    expect(container!.querySelector('.floating-tools-fab__btn--notizen')).not.toBeNull()
    expect(container!.querySelector('.floating-tools-fab__btn--butterfly')).not.toBeNull()
  })

  it('opens KB comments on bubble click', async () => {
    await mount()
    const commentsBtn = container!.querySelector<HTMLButtonElement>('.floating-tools-fab__btn--comments')!
    act(() => commentsBtn.click())
    expect(kbCommentsOpen).toHaveBeenCalledTimes(1)
  })
})
