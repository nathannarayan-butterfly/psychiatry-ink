/**
 * Thin, mock-safe wrapper around MediaRecorder for capturing a short spoken
 * instruction. Degrades gracefully: when the browser lacks getUserMedia /
 * MediaRecorder (jsdom, locked-down environments) `isVoiceCaptureSupported()`
 * returns false and callers fall back to a typed instruction.
 */

export function isVoiceCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined'
  )
}

function pickMimeType(): string {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return 'audio/webm'
  }
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
  for (const type of candidates) {
    if (window.MediaRecorder.isTypeSupported?.(type)) return type
  }
  return 'audio/webm'
}

export interface VoiceRecording {
  /** Stop recording and resolve with the captured audio blob. */
  stop: () => Promise<Blob>
  /** Abort recording and release the microphone without producing a blob. */
  cancel: () => void
}

/**
 * Start microphone capture. Throws if the mic is unavailable or permission is
 * denied — callers should catch and switch to the typed-instruction fallback.
 */
export async function startVoiceRecording(): Promise<VoiceRecording> {
  if (!isVoiceCaptureSupported()) {
    throw new Error('Voice capture not supported')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data)
  })

  recorder.start()

  const release = () => {
    for (const track of stream.getTracks()) track.stop()
  }

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.addEventListener(
          'stop',
          () => {
            release()
            const blob = new Blob(chunks, { type: mimeType })
            if (blob.size === 0) {
              reject(new Error('Empty recording'))
              return
            }
            resolve(blob)
          },
          { once: true },
        )
        try {
          recorder.stop()
        } catch (error) {
          release()
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }),
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        // ignore
      }
      release()
    },
  }
}
