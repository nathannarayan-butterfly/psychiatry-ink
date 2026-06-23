import { useCallback, useEffect, useRef, useState } from 'react'
import type { UiLanguage } from '../types/settings'
import { transcribeAudio } from '../services/transcriptionClient'

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

type CompactDictationPhase = 'idle' | 'recording' | 'transcribing'

interface UseCompactDictationOptions {
  onTranscriptionComplete: (text: string) => void
  /** Active UI language — forwarded to `/api/transcribe` as an OpenAI language hint. */
  language?: UiLanguage
}

/** Minimal record → transcribe flow for chat inputs (no review/playback UI). */
export function useCompactDictation({
  onTranscriptionComplete,
  language,
}: UseCompactDictationOptions) {
  const [phase, setPhase] = useState<CompactDictationPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  /** True while getUserMedia is in flight — blocks duplicate starts and enables cancel. */
  const pendingStartRef = useRef(false)

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

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
    phaseRef.current = 'idle'
    setPhase('idle')
    setError(null)
  }, [cleanupRecording])

  const startRecording = useCallback(async () => {
    if (phaseRef.current !== 'idle' || pendingStartRef.current) return

    pendingStartRef.current = true
    setError(null)
    cleanupRecording()
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
  }, [cleanupRecording])

  const stopAndTranscribe = useCallback(async () => {
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

    phaseRef.current = 'transcribing'
    setPhase('transcribing')

    await new Promise<void>((resolve) => {
      recorder.addEventListener(
        'stop',
        () => {
          resolve()
        },
        { once: true },
      )
      recorder.stop()
      stopMediaStream()
    })

    const type = recorder.mimeType || pickRecorderMimeType() || 'audio/webm'
    const blob = new Blob(audioChunksRef.current, { type })
    mediaRecorderRef.current = null
    audioChunksRef.current = []

    if (blob.size === 0) {
      cleanupRecording()
      phaseRef.current = 'idle'
      setPhase('idle')
      setError('empty_recording')
      return
    }

    try {
      const text = await transcribeAudio(blob, language)
      onTranscriptionComplete(text)
      reset()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'transcription_failed'
      phaseRef.current = 'idle'
      setError(message)
      setPhase('idle')
    }
  }, [cleanupRecording, language, onTranscriptionComplete, reset, stopMediaStream])

  const toggleRecording = useCallback(() => {
    if (phaseRef.current === 'idle') {
      void startRecording()
      return
    }
    if (phaseRef.current === 'recording') {
      void stopAndTranscribe()
    }
  }, [startRecording, stopAndTranscribe])

  useEffect(() => {
    return () => {
      pendingStartRef.current = false
      cleanupRecording()
    }
  }, [cleanupRecording])

  return {
    phase,
    error,
    isRecording: phase === 'recording',
    isTranscribing: phase === 'transcribing',
    toggleRecording,
    cancel: reset,
  }
}
