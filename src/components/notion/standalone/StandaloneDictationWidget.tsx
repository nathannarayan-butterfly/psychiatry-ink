import { useCallback, useState } from 'react'
import { Check, Copy, Loader2, Mic, MicOff, Save, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useCompactDictation } from '../../../hooks/useCompactDictation'
import { useCopyWithFeedback } from '../../../hooks/useCopyWithFeedback'
import { saveGlobalNote } from '../../../utils/standaloneNotes'
import { showNotionToast } from '../NotionToast'
import '../../../styles/workspace-ai.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneDictationWidgetProps {
  onClose: () => void
}

/**
 * Patient-less dictation tool: explicit start/stop recording → server
 * transcription → large editable text area → copy / save to global notes.
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
    onTranscriptionComplete: appendTranscript,
  })

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

  const micLabel = dictation.isRecording
    ? t('standaloneDictationStop')
    : dictation.isTranscribing
      ? t('standaloneDictationTranscribing')
      : t('standaloneDictationStart')

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
            <button
              type="button"
              className={`swx-dictation__mic${dictation.isRecording ? ' swx-dictation__mic--recording' : ''}`}
              onClick={dictation.toggleRecording}
              disabled={dictation.isTranscribing}
              aria-label={micLabel}
              title={micLabel}
            >
              {dictation.isTranscribing ? (
                <Loader2 className="h-4 w-4 wai-spin" strokeWidth={1.75} aria-hidden />
              ) : dictation.isRecording ? (
                <MicOff className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              ) : (
                <Mic className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              )}
              {micLabel}
            </button>
            {dictation.isRecording ? (
              <span className="swx-dictation__status">{t('standaloneDictationRecordingHint')}</span>
            ) : null}
            {dictation.error ? (
              <span className="swx-error" role="alert">
                {t('standaloneDictationError')}
              </span>
            ) : null}
          </div>

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
