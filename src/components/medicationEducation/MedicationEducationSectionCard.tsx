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
import type { MedicationEducationSectionState } from '../../types/medicationEducation'
import type { MedicationEducationScope } from '../../types/medicationEducation'
import { getMedicationEducationSectionDefinition } from '../../data/medicationEducationSections'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useTranslation } from '../../context/TranslationContext'

const REVIEWABLE = ['ai_generated'] as const

interface MedicationEducationSectionCardProps {
  scope: MedicationEducationScope
  section: MedicationEducationSectionState
  expanded: boolean
  onToggleExpand: () => void
  onChange: (content: string) => void
  onGenerate: () => void
  onAccept: () => void
  onRevert: () => void
  onToggleIncluded: () => void
  generating: boolean
}

export function MedicationEducationSectionCard({
  scope,
  section,
  expanded,
  onToggleExpand,
  onChange,
  onGenerate,
  onAccept,
  onRevert,
  onToggleIncluded,
  generating,
}: MedicationEducationSectionCardProps) {
  const { language } = useTranslation()
  const def = getMedicationEducationSectionDefinition(scope, section.id)
  const label = language === 'en' ? def?.labelEn ?? section.id : def?.labelDe ?? section.id
  const aiCapable = def?.aiCapable ?? false
  const needsReview = REVIEWABLE.includes(section.status as (typeof REVIEWABLE)[number])

  const statusLabel = translateMedicationUi(language, `medEducationStatus_${section.status}` as never)

  return (
    <article
      className={`arztbrief-section${needsReview ? ' arztbrief-section--ai-pending' : ''}${section.status === 'excluded' ? ' arztbrief-section--excluded' : ''}`}
    >
      <header className="arztbrief-section__header">
        <button type="button" className="arztbrief-section__title-btn" onClick={onToggleExpand}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{label}</span>
          <span className="arztbrief-section__status">{statusLabel}</span>
        </button>
        <div className="arztbrief-section__actions">
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--ghost"
            onClick={onToggleIncluded}
            title={translateMedicationUi(language, 'medEducationToggleInclude')}
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
              {translateMedicationUi(language, 'medEducationGenerate')}
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
              {translateMedicationUi(language, 'medEducationAccept')}
            </button>
            <button
              type="button"
              className="arztbrief-btn arztbrief-btn--ghost"
              disabled={!section.previousContent}
              onClick={onRevert}
            >
              <RotateCcw size={14} />
              {translateMedicationUi(language, 'medEducationRevert')}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
