import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { fetchDiscussVoiceAudio } from '../../services/discussCaseApi'
import { formatVoiceDuration } from '../../utils/discussCase/voiceRecording'

interface DiscussCaseVoiceMessagePlayerProps {
  discussionId: string
  messageId: string
  durationMs: number
  locale?: 'de' | 'en'
  /** Local blob for composer preview before upload. */
  previewBlob?: Blob | null
}

const PLAYER_I18N = {
  de: {
    play: 'Sprachnachricht abspielen',
    pause: 'Pause',
    loading: 'Lädt…',
    expired: 'Sprachnachricht abgelaufen',
    playbackFailed: 'Wiedergabe fehlgeschlagen',
  },
  en: {
    play: 'Play voice message',
    pause: 'Pause',
    loading: 'Loading…',
    expired: 'Voice message expired',
    playbackFailed: 'Playback failed',
  },
} as const

export function DiscussCaseVoiceMessagePlayer({
  discussionId,
  messageId,
  durationMs,
  locale = 'de',
  previewBlob = null,
}: DiscussCaseVoiceMessagePlayerProps) {
  const t = PLAYER_I18N[locale]
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressMs, setProgressMs] = useState(0)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPlaying(false)
    setProgressMs(0)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const ensureAudio = useCallback(async () => {
    if (audioRef.current) return audioRef.current
    setLoading(true)
    setError(null)
    try {
      const blob = previewBlob ?? (await fetchDiscussVoiceAudio(discussionId, messageId))
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const audio = new Audio(url)
      audio.addEventListener('timeupdate', () => setProgressMs(audio.currentTime * 1000))
      audio.addEventListener('ended', () => {
        setPlaying(false)
        setProgressMs(0)
      })
      audioRef.current = audio
      return audio
    } catch (err) {
      const status = (err as { status?: number } | null)?.status
      setError(status === 410 ? t.expired : t.playbackFailed)
      return null
    } finally {
      setLoading(false)
    }
  }, [discussionId, messageId, previewBlob, t])

  const togglePlay = useCallback(async () => {
    const audio = await ensureAudio()
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setError(t.playbackFailed)
    }
  }, [ensureAudio, playing, t])

  const displayDuration = durationMs > 0 ? durationMs : progressMs

  return (
    <div className="discuss-case-chat__voice-message">
      <button
        type="button"
        className="discuss-case-chat__voice-play icon-action-btn"
        onClick={() => void togglePlay()}
        disabled={loading}
        aria-label={playing ? t.pause : t.play}
        title={playing ? t.pause : t.play}
      >
        {loading ? (
          <span className="clinical-loading__spinner" aria-hidden="true" />
        ) : playing ? (
          <Pause className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Play className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>
      <div className="discuss-case-chat__voice-track" aria-hidden="true">
        <span
          className="discuss-case-chat__voice-progress"
          style={{
            width: displayDuration
              ? `${Math.min(100, (progressMs / displayDuration) * 100)}%`
              : '0%',
          }}
        />
      </div>
      <span className="discuss-case-chat__voice-duration">
        {formatVoiceDuration(playing ? progressMs : displayDuration)}
      </span>
      {error ? (
        <span className="discuss-case-chat__voice-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
