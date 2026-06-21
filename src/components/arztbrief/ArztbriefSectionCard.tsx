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
import type { ArztbriefSectionState } from '../../types/arztbrief'
import { getArztbriefSectionDefinition } from '../../data/arztbriefSections'
import type { ArztbriefDocumentType } from '../../types/arztbrief'
import { useTranslation } from '../../context/TranslationContext'
import { isArztbriefAiSection } from '../../data/arztbriefSections'
import { REVIEWABLE_STATUSES } from '../../utils/arztbrief/draftOps'

interface ArztbriefSectionCardProps {
  documentType: ArztbriefDocumentType
  section: ArztbriefSectionState
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

export function ArztbriefSectionCard({
  documentType,
  section,
  expanded,
  onToggleExpand,
  onChange,
  onGenerate,
  onAccept,
  onRevert,
  onToggleIncluded,
  generating,
  estimatedCredits,
}: ArztbriefSectionCardProps) {
  const { t, language } = useTranslation()
  const def = getArztbriefSectionDefinition(documentType, section.id)
  const label = language === 'en' ? def?.labelEn ?? section.id : def?.labelDe ?? section.id
  const aiCapable = def?.aiCapable ?? isArztbriefAiSection(section.id)
  const needsReview = REVIEWABLE_STATUSES.includes(section.status)

  return (
    <article
      className={`arztbrief-section${needsReview ? ' arztbrief-section--ai-pending' : ''}${section.status === 'excluded' ? ' arztbrief-section--excluded' : ''}`}
    >
      <header className="arztbrief-section__header">
        <button type="button" className="arztbrief-section__title-btn" onClick={onToggleExpand}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{label}</span>
          <span className="arztbrief-section__status">{t(`arztbriefStatus_${section.status}`)}</span>
        </button>
        <div className="arztbrief-section__actions">
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--ghost"
            onClick={onToggleIncluded}
            title={section.included ? t('arztbriefExcludeSection') : t('arztbriefIncludeSection')}
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
              {t('arztbriefGenerate')}
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
              {t('arztbriefAccept')}
            </button>
            <button
              type="button"
              className="arztbrief-btn arztbrief-btn--ghost"
              disabled={!section.previousContent}
              onClick={onRevert}
            >
              <RotateCcw size={14} />
              {t('arztbriefRevert')}
            </button>
            {section.sourcePreview ? (
              <span className="arztbrief-section__source">{t('arztbriefSource')}: {section.sourcePreview}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
