import { Check, Circle, Loader2, X } from 'lucide-react'
import type { MedicationEducationGenerationProgress } from '../../hooks/useMedicationEducationDocument'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useTranslation } from '../../context/TranslationContext'
import { ButterflyLogo } from '../ButterflyLogo'

interface MedicationEducationGenerationDialogProps {
  progress: MedicationEducationGenerationProgress
  sectionLabels: Record<string, string>
}

export function MedicationEducationGenerationDialog({
  progress,
  sectionLabels,
}: MedicationEducationGenerationDialogProps) {
  const { language } = useTranslation()

  if (!progress.active) return null

  const completedCount = progress.completedIds.length
  const totalCount = progress.sectionIds.length

  return (
    <div className="arztbrief-dialog-backdrop medication-education-generation-backdrop" role="dialog" aria-modal="true">
      <div className="arztbrief-dialog medication-education-generation-dialog">
        <header className="medication-education-generation-dialog__header">
          <span className="medication-education-generation-dialog__mark" aria-hidden>
            <ButterflyLogo variant="color" size={28} />
          </span>
          <div>
            <h2 className="medication-education-generation-dialog__title">
              {translateMedicationUi(language, 'medEducationGenerating')}
            </h2>
            <p className="medication-education-generation-dialog__subtitle">
              {translateMedicationUi(language, 'medEducationGeneratingSubtitle')
                .replace('{completed}', String(completedCount))
                .replace('{total}', String(totalCount))}
            </p>
          </div>
        </header>
        <ul className="medication-education-generation-checklist" aria-live="polite">
          {progress.sectionIds.map((sectionId) => {
            const label = sectionLabels[sectionId] ?? sectionId
            const isDone = progress.completedIds.includes(sectionId)
            const isCurrent = progress.active && progress.currentId === sectionId
            const isError = progress.errorSectionId === sectionId

            return (
              <li
                key={sectionId}
                className={`medication-education-generation-checklist__item${
                  isDone ? ' medication-education-generation-checklist__item--done' : ''
                }${isCurrent ? ' medication-education-generation-checklist__item--current' : ''}${
                  isError ? ' medication-education-generation-checklist__item--error' : ''
                }`}
              >
                <span className="medication-education-generation-checklist__icon" aria-hidden>
                  {isDone ? (
                    <Check size={16} />
                  ) : isCurrent ? (
                    <Loader2 size={16} className="spin" />
                  ) : isError ? (
                    <X size={16} />
                  ) : (
                    <Circle size={16} />
                  )}
                </span>
                <span>{label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
