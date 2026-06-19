import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAudio } from '../services/transcriptionClient'

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

type CompactDictationPhase = 'idle' | 'recording' | 'transcribing'

interface UseCompactDictationOptions {
  onTranscriptionComplete: (text: string) => void
}

/** Minimal record → transcribe flow for chat inputs (no review/playback UI). */
export function useCompactDictation({ onTranscriptionComplete }: UseCompactDictationOptions) {
  const [phase, setPhase] = useState<CompactDictationPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

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
    cleanupRecording()
    setPhase('idle')
    setError(null)
  }, [cleanupRecording])

  const startRecording = useCallback(async () => {
    if (phaseRef.current !== 'idle') return

    setError(null)
    cleanupRecording()

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('microphone_unavailable')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickRecorderMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      recorder.start(250)
      setPhase('recording')
    } catch {
      cleanupRecording()
      setError('microphone_denied')
    }
  }, [cleanupRecording])

  const stopAndTranscribe = useCallback(async () => {
    if (phaseRef.current !== 'recording') return

    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      reset()
      return
    }

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
      reset()
      return
    }

    try {
      const text = await transcribeAudio(blob)
      onTranscriptionComplete(text)
      reset()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'transcription_failed'
      setError(message)
      setPhase('idle')
    }
  }, [onTranscriptionComplete, reset, stopMediaStream])

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
