import { useMemo } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import type { UseClinicalIntelligenceResult } from '../../../hooks/useClinicalIntelligence'

interface ClinicalIntelligenceNotesSectionProps {
  ci: UseClinicalIntelligenceResult
  commentOpen: boolean
  commentDraft: string
  onCommentDraftChange: (value: string) => void
  onSaveComment: () => void
}

export function ClinicalIntelligenceNotesSection({
  ci,
  commentOpen,
  commentDraft,
  onCommentDraftChange,
  onSaveComment,
}: ClinicalIntelligenceNotesSectionProps) {
  const { t, language } = useTranslation()
  const savedComment = ci.state.clinicianComment.trim()

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [language],
  )

  const commentSavedAt = useMemo(() => {
    for (let i = ci.state.audit.length - 1; i >= 0; i -= 1) {
      const entry = ci.state.audit[i]
      if (entry.action === 'clinician-comment-saved' && savedComment) {
        return entry.timestamp
      }
    }
    return null
  }, [ci.state.audit, savedComment])

  const showSection = Boolean(savedComment || commentOpen)
  if (!showSection) return null

  return (
    <section className="ci-notes" aria-label={t('ciNotesSectionTitle')}>
      <header className="ci-notes__head">
        <MessageSquarePlus className="ci-notes__icon" aria-hidden strokeWidth={2} />
        <h3 className="ci-notes__title">{t('ciNotesSectionTitle')}</h3>
      </header>

      {savedComment && !commentOpen ? (
        <ol className="ci-comment-timeline" aria-label={t('ciNotesTimelineLabel')}>
          <li className="ci-comment-entry">
            {commentSavedAt ? (
              <time className="ci-comment-entry__date" dateTime={commentSavedAt}>
                {dateFormatter.format(new Date(commentSavedAt))}
              </time>
            ) : null}
            <p className="ci-comment-entry__text">{savedComment}</p>
          </li>
        </ol>
      ) : null}

      {commentOpen ? (
        <div className="ci-notes__composer">
          <label className="ci-notes__composer-label" htmlFor="ci-clinician-comment-main">
            {t('ciRightRailCommentLabel')}
          </label>
          <textarea
            id="ci-clinician-comment-main"
            className="ci-notes__composer-input"
            rows={4}
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder={t('ciRightRailCommentPlaceholder')}
            maxLength={2000}
          />
          <div className="ci-notes__composer-actions">
            <button type="button" className="ci-btn ci-btn--primary" onClick={onSaveComment}>
              {t('ciRightRailCommentSave')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
