import { useCallback, useEffect, useRef, useState } from 'react'
import type { DictationPhase } from '../types/dictation'
import type { UiLanguage } from '../types/settings'
import { transcribeAudio } from '../services/transcriptionClient'

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

interface UseDictationOptions {
  onTranscriptionComplete: (text: string) => void
  onSessionEnd: () => void
  /** Active UI language — forwarded to `/api/transcribe` as an OpenAI language hint. */
  language?: UiLanguage
}

export function useDictation({
  onTranscriptionComplete,
  onSessionEnd,
  language,
}: UseDictationOptions) {
  const [phase, setPhase] = useState<DictationPhase>('idle')
  const [durationMs, setDurationMs] = useState(0)
  const [playbackMs, setPlaybackMs] = useState(0)
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  const [dictationError, setDictationError] = useState<string | null>(null)

  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioBlobRef = useRef<Blob | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const playbackUrlRef = useRef<string | null>(null)

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  const cleanupPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current)
      playbackUrlRef.current = null
    }
  }, [])

  const cleanupRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    audioBlobRef.current = null
    stopMediaStream()
  }, [stopMediaStream])

  const reset = useCallback(() => {
    cleanupPlayback()
    cleanupRecording()
    setPhase('idle')
    setDurationMs(0)
    setPlaybackMs(0)
    setIsPlayingBack(false)
    setDictationError(null)
  }, [cleanupPlayback, cleanupRecording])

  const startDictation = useCallback(async () => {
    if (phaseRef.current !== 'idle') return

    setDictationError(null)
    cleanupPlayback()
    cleanupRecording()

    if (!navigator.mediaDevices?.getUserMedia) {
      setDictationError('microphone_unavailable')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickRecorderMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      audioBlobRef.current = null

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        audioBlobRef.current = new Blob(audioChunksRef.current, { type })
        stopMediaStream()
      }

      recorder.start(250)
      setDurationMs(0)
      setPlaybackMs(0)
      setIsPlayingBack(false)
      setPhase('recording')
    } catch {
      cleanupRecording()
      setDictationError('microphone_denied')
    }
  }, [cleanupPlayback, cleanupRecording, stopMediaStream])

  const pauseDictation = useCallback(() => {
    if (phaseRef.current !== 'recording') return

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
    }
    setIsPlayingBack(false)
    setPhase('paused')
  }, [])

  const resumeDictation = useCallback(() => {
    if (phaseRef.current !== 'paused') return

    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
    }

    setIsPlayingBack(false)
    setPlaybackMs(0)
    setPhase('recording')
  }, [])

  const stopRecording = useCallback(() => {
    if (phaseRef.current !== 'recording' && phaseRef.current !== 'paused') return

    setIsPlayingBack(false)
    setPlaybackMs(0)

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.addEventListener(
        'stop',
        () => {
          setPhase('review')
        },
        { once: true },
      )
      recorder.stop()
      return
    }

    setPhase('review')
  }, [])

  const discardRecording = useCallback(() => {
    reset()
    onSessionEnd()
  }, [onSessionEnd, reset])

  const togglePlayback = useCallback(() => {
    const currentPhase = phaseRef.current
    if (
      (currentPhase !== 'review' && currentPhase !== 'paused') ||
      durationMs <= 0 ||
      !audioBlobRef.current
    ) {
      return
    }

    if (isPlayingBack) {
      audioElementRef.current?.pause()
      setIsPlayingBack(false)
      return
    }

    if (!audioElementRef.current) {
      cleanupPlayback()
      playbackUrlRef.current = URL.createObjectURL(audioBlobRef.current)
      const audio = new Audio(playbackUrlRef.current)
      audio.ontimeupdate = () => {
        setPlaybackMs(audio.currentTime * 1000)
      }
      audio.onended = () => {
        setIsPlayingBack(false)
        setPlaybackMs(durationMs)
      }
      audioElementRef.current = audio
    }

    const audio = audioElementRef.current
    if (playbackMs >= durationMs) {
      audio.currentTime = 0
      setPlaybackMs(0)
    } else {
      audio.currentTime = playbackMs / 1000
    }

    void audio.play()
    setIsPlayingBack(true)
  }, [cleanupPlayback, durationMs, isPlayingBack, playbackMs])

  const transcribe = useCallback(async () => {
    if (phaseRef.current !== 'review' || durationMs <= 0 || !audioBlobRef.current) return

    setIsPlayingBack(false)
    audioElementRef.current?.pause()
    setDictationError(null)
    setPhase('transcribing')

    try {
      const text = await transcribeAudio(audioBlobRef.current, language)
      onTranscriptionComplete(text)
      reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'transcription_failed'
      setDictationError(message)
      setPhase('review')
    }
  }, [durationMs, language, onTranscriptionComplete, reset])

  useEffect(() => {
    if (phase !== 'recording') return

    const intervalId = window.setInterval(() => {
      setDurationMs((current) => current + 100)
    }, 100)

    return () => window.clearInterval(intervalId)
  }, [phase])

  useEffect(() => {
    return () => {
      cleanupPlayback()
      cleanupRecording()
    }
  }, [cleanupPlayback, cleanupRecording])

  const isDictationActive = phase !== 'idle'

  return {
    phase,
    durationMs,
    playbackMs,
    isPlayingBack,
    dictationError,
    isDictationActive,
    isRecording: phase === 'recording',
    startDictation,
    pauseDictation,
    resumeDictation,
    stopRecording,
    discardRecording,
    togglePlayback,
    transcribe,
    resetDictation: reset,
  }
}
