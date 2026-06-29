/**
 * The dictation workspace must wire each control to the right handler — not
 * merely render the buttons. We mock `useCompactDictation` so we can drive the
 * widget through its phases (idle → recording → review) and assert that
 * clicking record / stop / play / pause / delete / re-record / send actually
 * fires the corresponding handler (the "prove handlers wired" lesson).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const handlers = vi.hoisted(() => ({
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  sendForTranscription: vi.fn(),
  discardRecording: vi.fn(),
  toggleRecording: vi.fn(),
  cancel: vi.fn(),
}))

type DictationState = {
  phase: 'idle' | 'recording' | 'review' | 'transcribing'
  error: string | null
  isRecording: boolean
  isReviewing: boolean
  isTranscribing: boolean
  hasRecording: boolean
  recordedUrl: string | null
}

const hookState = vi.hoisted(() => ({
  current: {
    phase: 'idle',
    error: null,
    isRecording: false,
    isReviewing: false,
    isTranscribing: false,
    hasRecording: false,
    recordedUrl: null,
  } as DictationState,
}))

vi.mock('../../../../hooks/useCompactDictation', () => ({
  useCompactDictation: () => ({ ...hookState.current, ...handlers }),
}))

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'de' as const }),
}))

vi.mock('../../../../utils/standaloneNotes', () => ({ saveGlobalNote: vi.fn() }))
vi.mock('../../NotionToast', () => ({ showNotionToast: vi.fn() }))

import { StandaloneDictationWidget } from '../StandaloneDictationWidget'

let root: Root | null = null
let container: HTMLDivElement | null = null

function setState(next: Partial<DictationState>) {
  hookState.current = { ...hookState.current, ...next }
}

async function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(StandaloneDictationWidget, { onClose: () => {} }))
    await Promise.resolve()
  })
}

function clickByLabel(label: string) {
  const el = container?.querySelector(`[aria-label="${label}"]`) as HTMLElement | null
  if (!el) throw new Error(`No element with aria-label="${label}"`)
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
}

beforeEach(() => {
  vi.clearAllMocks()
  setState({
    phase: 'idle',
    error: null,
    isRecording: false,
    isReviewing: false,
    isTranscribing: false,
    hasRecording: false,
    recordedUrl: null,
  })
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

describe('StandaloneDictationWidget controls', () => {
  it('idle: the record button fires startRecording', async () => {
    await render()
    expect(container!.querySelector('[aria-label="standaloneDictationStart"]')).not.toBeNull()
    await act(async () => clickByLabel('standaloneDictationStart'))
    expect(handlers.startRecording).toHaveBeenCalledTimes(1)
  })

  it('recording: the stop button fires stopRecording', async () => {
    setState({ phase: 'recording', isRecording: true })
    await render()
    await act(async () => clickByLabel('standaloneDictationStop'))
    expect(handlers.stopRecording).toHaveBeenCalledTimes(1)
  })

  it('review: play/pause, delete, re-record and send are all wired', async () => {
    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve())
    setState({
      phase: 'review',
      isReviewing: true,
      hasRecording: true,
      recordedUrl: 'blob:mock-recording',
    })
    await render()

    // Audio element is bound to the recorded blob URL.
    const audio = container!.querySelector('audio') as HTMLAudioElement
    expect(audio).not.toBeNull()
    expect(audio.getAttribute('src')).toBe('blob:mock-recording')

    await act(async () => clickByLabel('standaloneDictationPlay'))
    expect(playSpy).toHaveBeenCalledTimes(1)

    await act(async () => clickByLabel('standaloneDictationDelete'))
    expect(handlers.discardRecording).toHaveBeenCalledTimes(1)

    await act(async () => clickByLabel('standaloneDictationReRecord'))
    expect(handlers.startRecording).toHaveBeenCalledTimes(1)

    await act(async () => clickByLabel('standaloneDictationSend'))
    expect(handlers.sendForTranscription).toHaveBeenCalledTimes(1)

    playSpy.mockRestore()
  })

  it('review: does not auto-send — transcription only fires on the explicit send', async () => {
    setState({
      phase: 'review',
      isReviewing: true,
      hasRecording: true,
      recordedUrl: 'blob:mock-recording',
    })
    await render()
    expect(handlers.sendForTranscription).not.toHaveBeenCalled()
  })
})
