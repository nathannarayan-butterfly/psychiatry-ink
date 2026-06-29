import { useCallback, useEffect, useRef, useState } from 'react'
import type { UiLanguage } from '../types/settings'
import { transcribeAudio } from '../services/transcriptionClient'

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

type CompactDictationPhase = 'idle' | 'recording' | 'review' | 'transcribing'

interface UseCompactDictationOptions {
  onTranscriptionComplete: (text: string) => void
  /** Active UI language — forwarded to `/api/transcribe` as an OpenAI language hint. */
  language?: UiLanguage
  /**
   * When true, stopping a recording enters a `review` phase that keeps the
   * captured audio (exposed as `recordedUrl`) so the clinician can listen back,
   * re-record, or delete it before transcribing. Transcription then becomes an
   * explicit `sendForTranscription()` step. Defaults to false to preserve the
   * auto-transcribe-on-stop behaviour used by the chat-style mic inputs.
   */
  reviewBeforeSend?: boolean
}

/**
 * Record → transcribe flow shared by the chat mic inputs and the standalone
 * dictation workspace. In the default (compact) mode stopping the recorder
 * immediately transcribes. In `reviewBeforeSend` mode the recorder hands back a
 * playable blob URL and transcription is an explicit, separate action.
 */
export function useCompactDictation({
  onTranscriptionComplete,
  language,
  reviewBeforeSend = false,
}: UseCompactDictationOptions) {
  const [phase, setPhase] = useState<CompactDictationPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordedBlobRef = useRef<Blob | null>(null)
  const recordedUrlRef = useRef<string | null>(null)
  /** True while getUserMedia is in flight — blocks duplicate starts and enables cancel. */
  const pendingStartRef = useRef(false)

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  /** Revoke the playback object URL (no React state writes — safe in cleanup). */
  const revokeRecordedUrl = useCallback(() => {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current)
      recordedUrlRef.current = null
    }
  }, [])

  const clearRecordedAudio = useCallback(() => {
    revokeRecordedUrl()
    recordedBlobRef.current = null
    setRecordedUrl(null)
  }, [revokeRecordedUrl])

  const cleanupRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    stopMediaStream()
  }, [stopMediaStream])

  const reset = useCallback(() => {
    pendingStartRef.current = false
    cleanupRecording()
    clearRecordedAudio()
    phaseRef.current = 'idle'
    setPhase('idle')
    setError(null)
  }, [cleanupRecording, clearRecordedAudio])

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        phaseRef.current = reviewBeforeSend ? 'review' : 'idle'
        setPhase(phaseRef.current)
        setError('empty_recording')
        return
      }

      phaseRef.current = 'transcribing'
      setPhase('transcribing')
      setError(null)

      try {
        const text = await transcribeAudio(blob, language)
        onTranscriptionComplete(text)
        reset()
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'transcription_failed'
        // In review mode keep the recording so the clinician can retry/listen
        // back; in compact mode drop straight back to idle.
        phaseRef.current = reviewBeforeSend ? 'review' : 'idle'
        setPhase(phaseRef.current)
        setError(message)
      }
    },
    [language, onTranscriptionComplete, reset, reviewBeforeSend],
  )

  const startRecording = useCallback(async () => {
    if (phaseRef.current !== 'idle' || pendingStartRef.current) return

    pendingStartRef.current = true
    setError(null)
    cleanupRecording()
    clearRecordedAudio()
    phaseRef.current = 'recording'
    setPhase('recording')

    if (!navigator.mediaDevices?.getUserMedia) {
      pendingStartRef.current = false
      phaseRef.current = 'idle'
      setPhase('idle')
      setError('microphone_unavailable')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!pendingStartRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const mimeType = pickRecorderMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      pendingStartRef.current = false

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      recorder.start(250)
    } catch {
      pendingStartRef.current = false
      cleanupRecording()
      phaseRef.current = 'idle'
      setPhase('idle')
      setError('microphone_denied')
    }
  }, [cleanupRecording, clearRecordedAudio])

  /** Assemble the captured chunks into a single typed blob and detach the recorder. */
  const finalizeRecording = useCallback((): Blob => {
    const recorder = mediaRecorderRef.current
    const type = recorder?.mimeType || pickRecorderMimeType() || 'audio/webm'
    const blob = new Blob(audioChunksRef.current, { type })
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    return blob
  }, [])

  const stopRecording = useCallback(async () => {
    if (phaseRef.current !== 'recording') return

    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      // Still waiting for mic permission — treat stop as cancel.
      pendingStartRef.current = false
      cleanupRecording()
      phaseRef.current = 'idle'
      setPhase('idle')
      return
    }

    // Compact mode shows the "transcribing" state immediately on stop; review
    // mode stays on "recording" until the playable blob is ready.
    if (!reviewBeforeSend) {
      phaseRef.current = 'transcribing'
      setPhase('transcribing')
    }

    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true })
      recorder.stop()
      stopMediaStream()
    })

    const blob = finalizeRecording()

    if (blob.size === 0) {
      cleanupRecording()
      clearRecordedAudio()
      phaseRef.current = 'idle'
      setPhase('idle')
      setError('empty_recording')
      return
    }

    if (reviewBeforeSend) {
      // Keep the audio for playback; transcription is an explicit next step.
      clearRecordedAudio()
      recordedBlobRef.current = blob
      const url = URL.createObjectURL(blob)
      recordedUrlRef.current = url
      setRecordedUrl(url)
      phaseRef.current = 'review'
      setPhase('review')
      return
    }

    await transcribeBlob(blob)
  }, [cleanupRecording, clearRecordedAudio, finalizeRecording, reviewBeforeSend, stopMediaStream, transcribeBlob])

  const sendForTranscription = useCallback(() => {
    if (phaseRef.current !== 'review') return
    const blob = recordedBlobRef.current
    if (!blob) return
    void transcribeBlob(blob)
  }, [transcribeBlob])

  const toggleRecording = useCallback(() => {
    if (phaseRef.current === 'idle') {
      void startRecording()
      return
    }
    if (phaseRef.current === 'recording') {
      void stopRecording()
    }
  }, [startRecording, stopRecording])

  useEffect(() => {
    return () => {
      pendingStartRef.current = false
      cleanupRecording()
      revokeRecordedUrl()
    }
  }, [cleanupRecording, revokeRecordedUrl])

  return {
    phase,
    error,
    isRecording: phase === 'recording',
    isReviewing: phase === 'review',
    isTranscribing: phase === 'transcribing',
    hasRecording: phase === 'review' && recordedUrl != null,
    recordedUrl,
    toggleRecording,
    startRecording,
    stopRecording,
    sendForTranscription,
    discardRecording: reset,
    cancel: reset,
  }
}
