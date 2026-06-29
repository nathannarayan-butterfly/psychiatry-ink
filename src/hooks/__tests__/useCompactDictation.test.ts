/**
 * Lifecycle guardrails for the dictation hook's review mode: stopping a
 * recording must produce a playable object URL, and that URL plus the
 * microphone tracks must be released on delete AND on unmount (no blob/URL
 * leaks, no stuck MediaRecorder).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useCompactDictation } from '../useCompactDictation'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Listener = () => void

class FakeMediaRecorder {
  static isTypeSupported(): boolean {
    return true
  }
  state: 'inactive' | 'recording' = 'inactive'
  mimeType = 'audio/webm;codecs=opus'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  private listeners: Record<string, Listener[]> = {}

  constructor(
    public stream: { getTracks: () => Array<{ stop: () => void }> },
    public options?: { mimeType?: string },
  ) {}

  addEventListener(type: string, cb: Listener): void {
    ;(this.listeners[type] ??= []).push(cb)
  }

  start(): void {
    this.state = 'recording'
    this.ondataavailable?.({ data: new Blob(['chunk-a'], { type: 'audio/webm' }) })
  }

  stop(): void {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['chunk-b'], { type: 'audio/webm' }) })
    this.listeners.stop?.forEach((cb) => cb())
  }
}

const trackStop = vi.fn()
const createObjectURL = vi.fn<(blob: Blob) => string>()
const revokeObjectURL = vi.fn<(url: string) => void>()
let urlCounter = 0

let root: Root | null = null
let container: HTMLDivElement | null = null

// Snapshot the originals so we can fully restore them — otherwise these global
// patches leak into other test files sharing the same vitest worker.
const ORIGINAL = {
  MediaRecorder: (globalThis as Record<string, unknown>).MediaRecorder,
  mediaDevices: Object.getOwnPropertyDescriptor(navigator, 'mediaDevices'),
  createObjectURL: globalThis.URL.createObjectURL,
  revokeObjectURL: globalThis.URL.revokeObjectURL,
}

function makeStream() {
  return { getTracks: () => [{ stop: trackStop }] }
}

beforeEach(() => {
  vi.clearAllMocks()
  urlCounter = 0
  createObjectURL.mockImplementation(() => `blob:rec-${++urlCounter}`)
  ;(globalThis as Record<string, unknown>).MediaRecorder = FakeMediaRecorder
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => makeStream()) },
  })
  globalThis.URL.createObjectURL = createObjectURL as typeof URL.createObjectURL
  globalThis.URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL
})

afterEach(async () => {
  if (root) {
    const current = root
    await act(async () => current.unmount())
    root = null
  }
  container?.remove()
  container = null

  // Restore globals so neighbouring test files are unaffected.
  if (ORIGINAL.MediaRecorder === undefined) {
    delete (globalThis as Record<string, unknown>).MediaRecorder
  } else {
    ;(globalThis as Record<string, unknown>).MediaRecorder = ORIGINAL.MediaRecorder
  }
  if (ORIGINAL.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', ORIGINAL.mediaDevices)
  } else {
    delete (navigator as unknown as Record<string, unknown>).mediaDevices
  }
  globalThis.URL.createObjectURL = ORIGINAL.createObjectURL
  globalThis.URL.revokeObjectURL = ORIGINAL.revokeObjectURL
})

type Api = ReturnType<typeof useCompactDictation>

async function mountHook(reviewBeforeSend: boolean) {
  const apiRef: { current: Api | null } = { current: null }
  const complete = vi.fn()
  function Harness() {
    apiRef.current = useCompactDictation({ reviewBeforeSend, onTranscriptionComplete: complete })
    return null
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(Harness))
    await Promise.resolve()
  })
  return { apiRef, complete }
}

describe('useCompactDictation review mode', () => {
  it('stop produces a playable blob URL and stops the mic tracks', async () => {
    const { apiRef } = await mountHook(true)

    await act(async () => {
      await apiRef.current!.startRecording()
    })
    expect(apiRef.current!.isRecording).toBe(true)

    await act(async () => {
      await apiRef.current!.stopRecording()
    })

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(apiRef.current!.isReviewing).toBe(true)
    expect(apiRef.current!.recordedUrl).toBe('blob:rec-1')
    expect(apiRef.current!.hasRecording).toBe(true)
    expect(trackStop).toHaveBeenCalled()
  })

  it('discardRecording revokes the object URL and returns to idle', async () => {
    const { apiRef } = await mountHook(true)
    await act(async () => {
      await apiRef.current!.startRecording()
    })
    await act(async () => {
      await apiRef.current!.stopRecording()
    })

    await act(async () => {
      apiRef.current!.discardRecording()
    })

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:rec-1')
    expect(apiRef.current!.recordedUrl).toBeNull()
    expect(apiRef.current!.phase).toBe('idle')
  })

  it('revokes the object URL on unmount (no leak)', async () => {
    const { apiRef } = await mountHook(true)
    await act(async () => {
      await apiRef.current!.startRecording()
    })
    await act(async () => {
      await apiRef.current!.stopRecording()
    })
    expect(revokeObjectURL).not.toHaveBeenCalled()

    const current = root!
    await act(async () => current.unmount())
    root = null

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:rec-1')
  })
})

describe('useCompactDictation compact mode (chat inputs)', () => {
  it('auto-transcribes on stop without entering review', async () => {
    const transcribe = vi.fn()
    // Spy on the network client so we can assert it was invoked on stop.
    const mod = await import('../../services/transcriptionClient')
    vi.spyOn(mod, 'transcribeAudio').mockImplementation(async () => {
      transcribe()
      return 'transkript'
    })

    const { apiRef, complete } = await mountHook(false)
    await act(async () => {
      await apiRef.current!.startRecording()
    })
    await act(async () => {
      await apiRef.current!.stopRecording()
    })

    expect(transcribe).toHaveBeenCalledTimes(1)
    expect(complete).toHaveBeenCalledWith('transkript')
    // Compact mode never exposes a review recording.
    expect(createObjectURL).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
