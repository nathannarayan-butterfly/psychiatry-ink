import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Copy,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  Send,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useCompactDictation } from '../../../hooks/useCompactDictation'
import { useCopyWithFeedback } from '../../../hooks/useCopyWithFeedback'
import { saveGlobalNote } from '../../../utils/standaloneNotes'
import { mapDictationError } from '../../../utils/dictationErrors'
import { showNotionToast } from '../NotionToast'
import '../../../styles/workspace-ai.css'
import '../../../styles/standalone-workspace.css'
import '../../../styles/standalone-dictation.css'

interface StandaloneDictationWidgetProps {
  onClose: () => void
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Patient-less dictation workspace. Recording and transcription are explicit,
 * separate steps: the clinician records, can listen back / re-record / delete,
 * then explicitly sends the audio for OpenAI transcription via the shared
 * pipeline ({@link useCompactDictation} → `transcribeAudio` → POST
 * `/api/transcribe` → `transcribeAudioBuffer` / gpt-4o-transcribe). The
 * transcript lands in the editable editor with copy + save-to-notes.
 */
export function StandaloneDictationWidget({ onClose }: StandaloneDictationWidgetProps) {
  const { t, language } = useTranslation()
  const { copied, copy } = useCopyWithFeedback()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  const appendTranscript = useCallback((chunk: string) => {
    const trimmed = chunk.trim()
    if (!trimmed) return
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${trimmed}` : trimmed))
    setSaved(false)
  }, [])

  const dictation = useCompactDictation({
    language,
    reviewBeforeSend: true,
    onTranscriptionComplete: appendTranscript,
  })

  const voiceError = useMemo(
    () => mapDictationError(dictation.error, t),
    [dictation.error, t],
  )

  // ── Playback of the recorded audio ────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const { recordedUrl } = dictation

  // Reset the player whenever the recording changes (new take / discard).
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [recordedUrl])

  const handleLoadedMetadata = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    // Chromium reports `Infinity` for the duration of a streamed webm/opus blob
    // until a seek flushes the metadata; force one so the scrubber has a range.
    if (!Number.isFinite(el.duration)) {
      const onSeeked = () => {
        el.removeEventListener('timeupdate', onSeeked)
        el.currentTime = 0
        setDuration(Number.isFinite(el.duration) ? el.duration : 0)
      }
      el.addEventListener('timeupdate', onSeeked)
      try {
        el.currentTime = 1e101
      } catch {
        /* ignore — falls back to 0 duration */
      }
      return
    }
    setDuration(el.duration)
  }, [])

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    try {
      if (el.paused) {
        const result = el.play() as unknown as Promise<void> | undefined
        if (result && typeof result.then === 'function') {
          result.catch(() => setIsPlaying(false))
        }
      } else {
        el.pause()
      }
    } catch {
      setIsPlaying(false)
    }
  }, [])

  const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current
    const next = Number(event.target.value)
    setCurrentTime(next)
    if (el) el.currentTime = next
  }, [])

  const handleCopy = useCallback(() => {
    void copy(text)
  }, [copy, text])

  const handleSave = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    saveGlobalNote({
      title: t('standaloneDictationNoteTitle'),
      content: trimmed,
      kind: 'dictation',
      category: 'formulare',
    })
    setSaved(true)
    showNotionToast(t('standaloneSaveToNotesDone'))
  }, [text, t])

  const isIdle = !dictation.isRecording && !dictation.isReviewing && !dictation.isTranscribing

  return (
    <div className="wai-panel wai-panel--inline" aria-label={t('standaloneDictationTitle')}>
      <header className="wai-panel__header">
        <span className="wai-panel__eyebrow">
          <Mic className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('standaloneDictationEyebrow')}
        </span>
        <h2 className="wai-panel__title">{t('standaloneDictationTitle')}</h2>
        <button
          type="button"
          className="wai-panel__close"
          onClick={onClose}
          aria-label={t('dokumenteClose')}
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div className="wai-panel__body wai-panel__body--fill">
        <div className="swx-form swx-form--fill">
          <div className="swx-dictation__bar">
            {isIdle ? (
              <button
                type="button"
                className="swx-dictation__mic"
                onClick={dictation.startRecording}
                aria-label={t('standaloneDictationStart')}
                title={t('standaloneDictationStart')}
              >
                <Mic className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {t('standaloneDictationStart')}
              </button>
            ) : null}

            {dictation.isRecording ? (
              <button
                type="button"
                className="swx-dictation__mic swx-dictation__mic--recording"
                onClick={dictation.stopRecording}
                aria-label={t('standaloneDictationStop')}
                title={t('standaloneDictationStop')}
              >
                <Square className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {t('standaloneDictationStop')}
              </button>
            ) : null}

            {dictation.isRecording ? (
              <span className="swx-dictation__status swx-dictation__status--recording" role="status">
                <span className="swx-dictation__rec-dot" aria-hidden />
                {t('standaloneDictationRecordingHint')}
              </span>
            ) : null}

            {dictation.isTranscribing ? (
              <span className="swx-dictation__status swx-dictation__status--processing" role="status">
                <Loader2 className="h-3.5 w-3.5 wai-spin" strokeWidth={1.75} aria-hidden />
                {t('standaloneDictationTranscribing')}
              </span>
            ) : null}

            {voiceError ? (
              <span className="swx-error" role="alert">
                {voiceError}
              </span>
            ) : null}
          </div>

          {dictation.isReviewing && recordedUrl ? (
            <div className="sdx-review" aria-label={t('standaloneDictationListenBack')}>
              <span className="sdx-review__hint">{t('standaloneDictationReadyHint')}</span>
              <div className="sdx-player">
                <button
                  type="button"
                  className="sdx-player__btn"
                  onClick={togglePlay}
                  aria-label={isPlaying ? t('standaloneDictationPause') : t('standaloneDictationPlay')}
                  title={isPlaying ? t('standaloneDictationPause') : t('standaloneDictationPlay')}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  )}
                </button>
                <input
                  type="range"
                  className="sdx-player__scrubber"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={handleSeek}
                  aria-label={t('standaloneDictationSeek')}
                  disabled={!duration}
                />
                <span className="sdx-player__time" aria-hidden>
                  {formatClock(currentTime)} / {formatClock(duration)}
                </span>
                <audio
                  ref={audioRef}
                  src={recordedUrl}
                  preload="metadata"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false)
                    setCurrentTime(duration)
                  }}
                  className="sdx-player__audio"
                />
              </div>
              <div className="sdx-review__actions">
                <button
                  type="button"
                  className="wai-btn wai-btn--ghost"
                  onClick={dictation.discardRecording}
                  aria-label={t('standaloneDictationDelete')}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {t('standaloneDictationDelete')}
                </button>
                <button
                  type="button"
                  className="wai-btn wai-btn--ghost"
                  onClick={dictation.startRecording}
                  aria-label={t('standaloneDictationReRecord')}
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {t('standaloneDictationReRecord')}
                </button>
                <button
                  type="button"
                  className="wai-btn wai-btn--primary"
                  onClick={dictation.sendForTranscription}
                  aria-label={t('standaloneDictationSend')}
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {t('standaloneDictationSend')}
                </button>
              </div>
            </div>
          ) : null}

          <label className="swx-field swx-field--grow">
            {t('standaloneDictationTranscriptLabel')}
            <textarea
              className="swx-rewrite__editor"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setSaved(false)
              }}
              placeholder={t('standaloneDictationTranscriptPlaceholder')}
              aria-label={t('standaloneDictationTranscriptLabel')}
              spellCheck
            />
          </label>
        </div>
      </div>

      <footer className="wai-panel__footer">
        <button
          type="button"
          className="wai-btn wai-btn--ghost"
          onClick={handleCopy}
          disabled={!text.trim()}
          aria-label={t('standaloneCopy')}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          )}
          {copied ? t('standaloneCopied') : t('standaloneCopy')}
        </button>
        <button
          type="button"
          className="wai-btn wai-btn--primary"
          onClick={handleSave}
          disabled={!text.trim() || saved}
        >
          <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {saved ? t('standaloneSavedToNotes') : t('standaloneSaveToNotes')}
        </button>
      </footer>
    </div>
  )
}
