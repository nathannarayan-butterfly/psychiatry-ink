import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import type { DischargeSummarySectionState } from '../../types/dischargeSummary'
import type { DischargeSummaryDocumentType } from '../../types/dischargeSummary'
import { useTranslation } from '../../context/TranslationContext'
import {
  getDischargeSummarySectionDefinition,
  isDischargeSummaryAiSection,
} from '../../data/dischargeSummarySections'
import { REVIEWABLE_STATUSES } from '../../utils/dischargeSummary/draftOps'

interface DischargeSummarySectionCardProps {
  documentType: DischargeSummaryDocumentType
  region: import('../../types/dischargeSummary').DischargeSummaryRegion
  section: DischargeSummarySectionState
  label: string
  expanded: boolean
  onToggleExpand: () => void
  onChange: (content: string) => void
  onGenerate: () => void
  onAccept: () => void
  onRevert: () => void
  onToggleIncluded: () => void
  generating: boolean
  estimatedCredits?: number
}

export function DischargeSummarySectionCard({
  documentType,
  section,
  label,
  expanded,
  onToggleExpand,
  onChange,
  onGenerate,
  onAccept,
  onRevert,
  onToggleIncluded,
  generating,
  estimatedCredits,
}: DischargeSummarySectionCardProps) {
  const { t } = useTranslation()
  const def = getDischargeSummarySectionDefinition(documentType, section.id)
  const aiCapable = def?.aiCapable ?? isDischargeSummaryAiSection(section.id)
  const needsReview = REVIEWABLE_STATUSES.includes(section.status)
  const localOnly = def?.localIdentity

  return (
    <article
      className={`arztbrief-section${needsReview ? ' arztbrief-section--ai-pending' : ''}${section.status === 'excluded' ? ' arztbrief-section--excluded' : ''}`}
    >
      <header className="arztbrief-section__header">
        <button type="button" className="arztbrief-section__title-btn" onClick={onToggleExpand}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{label}</span>
          {localOnly ? (
            <span className="arztbrief-section__status">{t('dischargeSummaryLocalOnly')}</span>
          ) : (
            <span className="arztbrief-section__status">{t(`dischargeSummaryStatus_${section.status}`)}</span>
          )}
        </button>
        <div className="arztbrief-section__actions">
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--ghost"
            onClick={onToggleIncluded}
            title={
              section.included ? t('dischargeSummaryExcludeSection') : t('dischargeSummaryIncludeSection')
            }
          >
            {section.included ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          {aiCapable ? (
            <button
              type="button"
              className="arztbrief-btn arztbrief-btn--primary"
              disabled={generating}
              onClick={onGenerate}
            >
              {generating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              {t('dischargeSummaryGenerate')}
              {estimatedCredits ? ` (~${estimatedCredits})` : ''}
            </button>
          ) : null}
        </div>
      </header>

      {section.missingDataWarning ? (
        <p className="arztbrief-section__warning">
          <AlertTriangle size={14} aria-hidden />
          {section.missingDataWarning}
        </p>
      ) : null}

      {expanded ? (
        <div className="arztbrief-section__body">
          <textarea
            className="arztbrief-section__textarea"
            value={section.currentContent}
            onChange={(e) => onChange(e.target.value)}
            rows={Math.min(16, Math.max(4, section.currentContent.split('\n').length + 1))}
          />
          <div className="arztbrief-section__footer">
            <button type="button" className="arztbrief-btn arztbrief-btn--ghost" onClick={onAccept}>
              <Check size={14} />
              {t('dischargeSummaryAccept')}
            </button>
            <button
              type="button"
              className="arztbrief-btn arztbrief-btn--ghost"
              disabled={!section.previousContent}
              onClick={onRevert}
            >
              <RotateCcw size={14} />
              {t('dischargeSummaryRevert')}
            </button>
            {section.sourcePreview ? (
              <span className="arztbrief-section__source">
                {t('dischargeSummarySource')}: {section.sourcePreview}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
