import { useTranslation } from '../context/TranslationContext'
import { formatDuration } from '../utils/formatDuration'

interface RecordingReviewProps {
  durationMs: number
  playbackMs: number
  isPlayingBack: boolean
  paused?: boolean
}

export function RecordingReview({
  durationMs,
  playbackMs,
  isPlayingBack,
  paused = false,
}: RecordingReviewProps) {
  const { t } = useTranslation()
  const progress = durationMs > 0 ? playbackMs / durationMs : 0

  return (
    <div
      className="recording-review flex w-full max-w-sm flex-col items-center gap-3 px-6"
      role="status"
      aria-label={isPlayingBack ? t('reviewPlaying') : t('reviewReady')}
    >
      <div className="recording-review__waveform flex h-12 w-full items-end justify-center gap-1">
        {Array.from({ length: 24 }, (_, index) => {
          const height = 28 + ((index * 17) % 60)
          const barProgress = (index + 1) / 24
          const isActive = barProgress <= progress

          return (
            <span
              key={index}
              className={`recording-review__bar w-1 rounded-full transition-colors ${
                isActive ? 'bg-ink' : 'bg-border'
              }`}
              style={{ height: `${height}%` }}
            />
          )
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-mono tabular-nums text-ink">
          {formatDuration(playbackMs)}
        </span>
        <span aria-hidden>/</span>
        <span className="font-mono tabular-nums">{formatDuration(durationMs)}</span>
      </div>

      <p className="text-center text-xs text-muted">
        {isPlayingBack
          ? t('reviewPlaying')
          : paused
            ? t('reviewPaused')
            : t('reviewFinished')}
      </p>
    </div>
  )
}
