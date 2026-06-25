import { useCallback, useEffect, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useTranslation } from '../../../../context/TranslationContext'
import { useDictation } from '../../../../hooks/useDictation'
import { appendVerlaufEntry } from '../../../../utils/verlaufFeed'
import { notifyOverviewClinicalRefresh } from '../../../../utils/overview/overviewClinicalRefresh'
import { OverviewQuickActionShell } from './OverviewQuickActionShell'

interface DictateVerlaufQuickModalProps {
  open: boolean
  caseId: string
  onClose: () => void
  onSaved: () => void
}

export function DictateVerlaufQuickModal({
  open,
  caseId,
  onClose,
  onSaved,
}: DictateVerlaufQuickModalProps) {
  const { t, language } = useTranslation()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const appendTranscript = useCallback((transcript: string) => {
    const trimmed = transcript.trim()
    if (!trimmed) return
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${trimmed}` : trimmed))
  }, [])

  const {
    phase,
    durationMs,
    startDictation,
    stopRecording,
    transcribe,
    resetDictation,
    dictationError,
    isRecording,
  } = useDictation({
    onTranscriptionComplete: appendTranscript,
    onSessionEnd: () => {},
    language,
  })

  useEffect(() => {
    if (!open) return
    setText('')
    setSaving(false)
    resetDictation()
  }, [open, resetDictation])

  useEffect(() => {
    if (!open) resetDictation()
  }, [open, resetDictation])

  const handleDictationClick = () => {
    if (isRecording) {
      stopRecording()
      return
    }
    if (phase === 'review') {
      void transcribe()
      return
    }
    void startDictation()
  }

  const dictationLabel =
    dictationError === 'microphone_unavailable' || dictationError === 'microphone_denied'
      ? t('overviewQuickDictateMicUnavailable')
      : phase === 'transcribing'
        ? t('overviewQuickDictateTranscribing')
        : isRecording
          ? t('overviewQuickDictateStop')
          : phase === 'review'
            ? t('overviewQuickDictateTranscribe')
            : t('overviewQuickDictateStart')

  const handleSave = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    appendVerlaufEntry(caseId, {
      date: new Date().toISOString(),
      content: trimmed,
      pageType: 'verlauf',
      source: 'manual',
    })
    notifyOverviewClinicalRefresh(caseId)
    setSaving(false)
    onSaved()
    onClose()
  }

  const footer = (
    <>
      <button type="button" className="ov-quick-btn ov-quick-btn--ghost" onClick={onClose}>
        {t('guidedEntryCancel')}
      </button>
      <button
        type="button"
        className="ov-quick-btn ov-quick-btn--primary"
        onClick={handleSave}
        disabled={saving || !text.trim() || phase === 'transcribing'}
      >
        {saving ? t('overviewQuickSaving') : t('overviewQuickSave')}
      </button>
    </>
  )

  return (
    <OverviewQuickActionShell
      open={open}
      title={t('overviewQuickDictateTitle')}
      description={t('overviewQuickDictateDesc')}
      footer={footer}
      onClose={onClose}
    >
      <div className="ov-quick-form">
        <div className="ov-quick-dictate-bar">
          <button
            type="button"
            className={`ov-quick-dictate-btn${isRecording ? ' ov-quick-dictate-btn--active' : ''}`}
            onClick={handleDictationClick}
            disabled={phase === 'transcribing' || Boolean(dictationError)}
            aria-pressed={isRecording}
          >
            {isRecording ? <Square size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
            <span>{dictationLabel}</span>
          </button>
          {isRecording ? (
            <span className="ov-quick-dictate-timer" aria-live="polite">
              {Math.floor(durationMs / 1000)}s
            </span>
          ) : null}
        </div>
        <label className="ge-field">
          <span className="ge-field__label">{t('overviewQuickDictateTextLabel')}</span>
          <textarea
            className="ge-input ge-input--textarea"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('overviewQuickDictatePlaceholder')}
          />
        </label>
      </div>
    </OverviewQuickActionShell>
  )
}
