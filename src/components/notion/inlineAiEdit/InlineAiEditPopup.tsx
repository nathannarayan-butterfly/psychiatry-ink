import { Check, Loader2, Mic, RotateCcw, Sparkles, Square, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import type { InlineEditState } from '../../../utils/inlineAiEdit/reducer'

export interface InlineAiEditPopupProps {
  position: { top: number; left: number }
  state: InlineEditState
  originalText: string
  instructionDraft: string
  canRecord: boolean
  onInstructionDraftChange: (value: string) => void
  onStopRecording: () => void
  onSubmitTyped: () => void
  onAccept: () => void
  onReject: () => void
  onRerunReuse: () => void
  onRerunRerecord: () => void
  onRetry: () => void
  onClose: () => void
}

export function InlineAiEditPopup({
  position,
  state,
  originalText,
  instructionDraft,
  canRecord,
  onInstructionDraftChange,
  onStopRecording,
  onSubmitTyped,
  onAccept,
  onReject,
  onRerunReuse,
  onRerunRerecord,
  onRetry,
  onClose,
}: InlineAiEditPopupProps) {
  const { t } = useTranslation()

  return (
    <>
      <button
        type="button"
        className="inline-ai-edit__backdrop"
        aria-label={t('inlineAiEditClose')}
        onClick={onClose}
      />
      <div
        className="inline-ai-edit"
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-label={t('inlineAiEditTitle')}
        aria-live="polite"
      >
        <header className="inline-ai-edit__header">
          <span className="inline-ai-edit__title">
            <Sparkles className="inline-ai-edit__title-icon" aria-hidden strokeWidth={1.75} />
            {t('inlineAiEditTitle')}
          </span>
          <button
            type="button"
            className="inline-ai-edit__close"
            aria-label={t('inlineAiEditClose')}
            onClick={onClose}
          >
            <X aria-hidden strokeWidth={1.75} />
          </button>
        </header>

        {state.phase === 'recording' ? (
          <div className="inline-ai-edit__status">
            <span className="inline-ai-edit__recording-dot" aria-hidden />
            <p className="inline-ai-edit__status-text">{t('inlineAiEditRecording')}</p>
            <button type="button" className="inline-ai-edit__btn inline-ai-edit__btn--primary" onClick={onStopRecording}>
              <Square aria-hidden strokeWidth={1.75} />
              {t('inlineAiEditStopRecording')}
            </button>
          </div>
        ) : null}

        {state.phase === 'transcribing' ? (
          <div className="inline-ai-edit__status">
            <Loader2 className="inline-ai-edit__spinner" aria-hidden strokeWidth={1.75} />
            <p className="inline-ai-edit__status-text">{t('inlineAiEditTranscribing')}</p>
          </div>
        ) : null}

        {state.phase === 'editing' ? (
          <div className="inline-ai-edit__status">
            <Loader2 className="inline-ai-edit__spinner" aria-hidden strokeWidth={1.75} />
            <p className="inline-ai-edit__status-text">{t('inlineAiEditEditing')}</p>
          </div>
        ) : null}

        {state.phase === 'typing' ? (
          <form
            className="inline-ai-edit__typing"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmitTyped()
            }}
          >
            {!canRecord ? (
              <p className="inline-ai-edit__note">{t('inlineAiEditInstructionFallbackNote')}</p>
            ) : null}
            {state.error ? <p className="inline-ai-edit__note inline-ai-edit__note--error">{state.error}</p> : null}
            <label className="inline-ai-edit__label" htmlFor="inline-ai-edit-instruction">
              {t('inlineAiEditTypingLabel')}
            </label>
            <textarea
              id="inline-ai-edit-instruction"
              className="inline-ai-edit__input"
              value={instructionDraft}
              onChange={(event) => onInstructionDraftChange(event.target.value)}
              placeholder={t('inlineAiEditTypingPlaceholder')}
              rows={2}
              autoFocus
            />
            <div className="inline-ai-edit__actions">
              {canRecord ? (
                <button type="button" className="inline-ai-edit__btn" onClick={onRerunRerecord}>
                  <Mic aria-hidden strokeWidth={1.75} />
                  {t('inlineAiEditUseVoice')}
                </button>
              ) : null}
              <button
                type="submit"
                className="inline-ai-edit__btn inline-ai-edit__btn--primary"
                disabled={!instructionDraft.trim()}
              >
                <Sparkles aria-hidden strokeWidth={1.75} />
                {t('inlineAiEditSubmit')}
              </button>
            </div>
          </form>
        ) : null}

        {state.phase === 'preview' && state.proposal !== null ? (
          <div className="inline-ai-edit__preview">
            <div className="inline-ai-edit__diff">
              <div className="inline-ai-edit__diff-block inline-ai-edit__diff-block--before">
                <span className="inline-ai-edit__diff-label">{t('inlineAiEditOriginalLabel')}</span>
                <p className="inline-ai-edit__diff-text">{originalText}</p>
              </div>
              <div className="inline-ai-edit__diff-block inline-ai-edit__diff-block--after">
                <span className="inline-ai-edit__diff-label">{t('inlineAiEditProposalLabel')}</span>
                <p className="inline-ai-edit__diff-text">{state.proposal}</p>
              </div>
            </div>
            {state.mock ? <p className="inline-ai-edit__note">{t('inlineAiEditMockNote')}</p> : null}
            <p className="inline-ai-edit__disclaimer">{t('inlineAiEditDisclaimer')}</p>
            <div className="inline-ai-edit__actions">
              <button type="button" className="inline-ai-edit__btn inline-ai-edit__btn--ghost" onClick={onReject}>
                <X aria-hidden strokeWidth={1.75} />
                {t('inlineAiEditReject')}
              </button>
              {canRecord ? (
                <button type="button" className="inline-ai-edit__btn" onClick={onRerunRerecord}>
                  <Mic aria-hidden strokeWidth={1.75} />
                  {t('inlineAiEditRerunRerecord')}
                </button>
              ) : null}
              <button type="button" className="inline-ai-edit__btn" onClick={onRerunReuse}>
                <RotateCcw aria-hidden strokeWidth={1.75} />
                {t('inlineAiEditRerunReuse')}
              </button>
              <button type="button" className="inline-ai-edit__btn inline-ai-edit__btn--primary" onClick={onAccept}>
                <Check aria-hidden strokeWidth={1.75} />
                {t('inlineAiEditAccept')}
              </button>
            </div>
          </div>
        ) : null}

        {state.phase === 'error' ? (
          <div className="inline-ai-edit__status">
            <p className="inline-ai-edit__note inline-ai-edit__note--error">
              {state.error ?? t('inlineAiEditError')}
            </p>
            <div className="inline-ai-edit__actions">
              <button type="button" className="inline-ai-edit__btn inline-ai-edit__btn--ghost" onClick={onClose}>
                {t('inlineAiEditClose')}
              </button>
              <button type="button" className="inline-ai-edit__btn inline-ai-edit__btn--primary" onClick={onRetry}>
                <RotateCcw aria-hidden strokeWidth={1.75} />
                {t('inlineAiEditRetry')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
