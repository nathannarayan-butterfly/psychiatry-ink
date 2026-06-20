import type { ReactNode } from 'react'
import { Headphones, Pause, Play, Send, Square, Trash2 } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'
import type { DictationPhase } from '../types/dictation'
import { formatDuration } from '../utils/formatDuration'

interface DictationControlsProps {
  phase: DictationPhase
  durationMs: number
  isPlayingBack: boolean
  dictationError?: string | null
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onTogglePlayback: () => void
  onDiscard: () => void
  onTranscribe: () => void
}

function ControlButton({
  label,
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'primary'
}) {
  const variantClass =
    variant === 'danger'
      ? 'border-recording text-recording hover:bg-recording/5'
      : variant === 'primary'
        ? 'border-border-strong text-ink hover:bg-surface-hover'
        : 'border-border text-ink hover:bg-surface-hover'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`glass-surface glass-interactive inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm border-2 px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
    >
      {children}
      <span className="responsive-label">{label}</span>
    </button>
  )
}

function IconOnlyButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="glass-surface glass-interactive inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-border/60 text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function ListenButton({
  isPlayingBack,
  disabled,
  onClick,
  listenLabel,
  pausePlaybackLabel,
}: {
  isPlayingBack: boolean
  disabled?: boolean
  onClick: () => void
  listenLabel: string
  pausePlaybackLabel: string
}) {
  const label = isPlayingBack ? pausePlaybackLabel : listenLabel

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="glass-surface glass-interactive inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm border-2 border-border px-2 text-xs text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPlayingBack ? (
        <Pause className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      ) : (
        <Headphones className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      )}
      <span>{label}</span>
    </button>
  )
}

function resolveDictationErrorMessage(
  error: string,
  t: (key: keyof typeof import('../data/uiTranslations').uiTranslations) => string,
): string {
  if (error === 'microphone_denied') return t('dictationMicrophoneDenied')
  if (error === 'microphone_unavailable') return t('dictationMicrophoneUnavailable')
  if (error === 'transcription_failed') return t('dictationTranscriptionFailed')
  return error
}

export function DictationControls({
  phase,
  durationMs,
  isPlayingBack,
  dictationError = null,
  onPause,
  onResume,
  onStop,
  onTogglePlayback,
  onDiscard,
  onTranscribe,
}: DictationControlsProps) {
  const { t } = useTranslation()
  const isTranscribing = phase === 'transcribing'
  const hasRecording = durationMs > 0

  return (
    <div className="dictation-controls flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
      <p
        className="dictation-consent-notice basis-full text-[11px] leading-snug text-muted sm:text-[12px]"
        role="note"
      >
        {t('dictationConsentNotice')}
      </p>
      <span
        className="dictation-timer shrink-0 font-mono text-xs tabular-nums text-ink"
        aria-live="polite"
      >
        {formatDuration(durationMs)}
      </span>

      {phase === 'recording' ? (
        <>
          <IconOnlyButton label={t('pause')} onClick={onPause} disabled={isTranscribing}>
            <Pause className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </IconOnlyButton>
          <ControlButton label={t('stop')} onClick={onStop} disabled={isTranscribing}>
            <Square className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden />
          </ControlButton>
        </>
      ) : null}

      {phase === 'paused' ? (
        <>
          <ListenButton
            isPlayingBack={isPlayingBack}
            onClick={onTogglePlayback}
            disabled={isTranscribing || !hasRecording}
            listenLabel={t('listenRecording')}
            pausePlaybackLabel={t('pausePlayback')}
          />
          <IconOnlyButton label={t('resume')} onClick={onResume} disabled={isTranscribing}>
            <Play className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </IconOnlyButton>
          <ControlButton label={t('stop')} onClick={onStop} disabled={isTranscribing}>
            <Square className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden />
          </ControlButton>
        </>
      ) : null}

      {phase === 'review' ? (
        <>
          <ListenButton
            isPlayingBack={isPlayingBack}
            onClick={onTogglePlayback}
            disabled={isTranscribing || !hasRecording}
            listenLabel={t('listenRecording')}
            pausePlaybackLabel={t('pausePlayback')}
          />
          <ControlButton
            label={t('discard')}
            onClick={onDiscard}
            disabled={isTranscribing}
            variant="danger"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </ControlButton>
          <ControlButton
            label={t('transcribe')}
            onClick={onTranscribe}
            disabled={isTranscribing || !hasRecording}
            variant="primary"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </ControlButton>
        </>
      ) : null}

      {phase === 'transcribing' ? (
        <span className="text-xs text-secondary">{t('transcribing')}</span>
      ) : null}

      {dictationError ? (
        <span className="text-xs text-recording" role="alert">
          {resolveDictationErrorMessage(dictationError, t)}
        </span>
      ) : null}

      {phase === 'recording' || phase === 'paused' ? (
        <span
          className={`recording-dot h-2 w-2 shrink-0 rounded-full bg-recording ${
            phase === 'recording' ? '' : 'recording-dot--paused'
          }`}
          aria-hidden
        />
      ) : null}

    </div>
  )
}
