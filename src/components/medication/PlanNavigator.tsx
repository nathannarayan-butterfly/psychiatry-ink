import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { getChangeTypeLabel, translateMedicationUi } from '../../data/medicationUiTranslations'
import type { MedicationPlan } from '../../types/medicationPlan'

interface PlanNavigatorProps {
  plans: MedicationPlan[]
  currentPlanId: string | null
  showHistory: boolean
  onSelectPlan: (planId: string) => void
  onJumpToCurrent: () => void
}

export function PlanNavigator({
  plans,
  currentPlanId,
  showHistory,
  onSelectPlan,
  onJumpToCurrent,
}: PlanNavigatorProps) {
  const { language } = useTranslation()
  const isSingleEmptyPlan = plans.length === 1 && plans[0].medications.length === 0
  if (!showHistory || plans.length <= 1 || isSingleEmptyPlan) return null

  const currentIdx = plans.findIndex((plan) => plan.id === currentPlanId)
  const idx = currentIdx >= 0 ? currentIdx : 0
  const plan = plans[idx]

  const goPrev = () => {
    if (idx > 0) onSelectPlan(plans[idx - 1].id)
  }

  const goNext = () => {
    if (idx < plans.length - 1) onSelectPlan(plans[idx + 1].id)
  }

  return (
    <div className="medication-plan-nav">
      <button type="button" className="medication-plan-nav__arrow" onClick={goPrev} disabled={idx === 0}>
        <ChevronLeft size={14} aria-hidden />
      </button>
      <span className="medication-plan-nav__counter" aria-live="polite">
        {idx + 1} / {plans.length}
      </span>
      <button
        type="button"
        className="medication-plan-nav__arrow"
        onClick={goNext}
        disabled={idx >= plans.length - 1}
      >
        <ChevronRight size={14} aria-hidden />
      </button>
      <span className="medication-plan-nav__label">
        {new Date(plan.createdAt).toLocaleDateString(language === 'de' ? 'de-DE' : language)}
      </span>
      {!plan.isCurrent ? (
        <button type="button" className="medication-plan-nav__current" onClick={onJumpToCurrent}>
          {translateMedicationUi(language, 'medLastPlan')}
        </button>
      ) : null}
    </div>
  )
}

export function MedicationHistoryPanel({ plans }: { plans: MedicationPlan[] }) {
  const { language } = useTranslation()

  return (
    <div className="medication-history-panel">
      {plans.map((plan) => (
        <div key={plan.id} className="medication-history-panel__plan">
          <p className="medication-history-panel__date">
            {new Date(plan.createdAt).toLocaleString(language === 'de' ? 'de-DE' : language)}
            {plan.isCurrent ? ` · ${translateMedicationUi(language, 'medLastPlan')}` : ''}
          </p>
          <ul className="medication-history-panel__meds">
            {plan.medications.map((med) => (
              <li key={med.id}>
                {med.doseLineGerman}
                {med.history.length > 1 ? (
                  <ul className="medication-history-panel__events">
                    {med.history.slice(-3).map((event) => (
                      <li key={event.id}>
                        {new Date(event.changedAt).toLocaleDateString()} —{' '}
                        {getChangeTypeLabel(event.changeType, language)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
