import type { UiLanguage } from '../../types/settings'
import type {
  Goal,
  ProgressStatus,
  PsychotherapyPlan,
  PsychotherapySummary,
} from '../../types/psychotherapy'
import {
  translateTherapyMethod,
  translateTherapyStage,
} from '../../data/psychotherapyUiTranslations'

function firstActiveGoal(goals: Goal[]): Goal | undefined {
  return (
    goals.find((g) => g.status === 'in-progress') ??
    goals.find((g) => g.status === 'open' || g.status === undefined) ??
    goals[0]
  )
}

/** Heuristic progress classification from free-text fields — keyword-based, not AI. */
function deriveProgressStatus(plan: PsychotherapyPlan): ProgressStatus | undefined {
  const sorted = [...plan.sessions].sort((a, b) => (a.date < b.date ? 1 : -1))
  const text = `${sorted[0]?.progress ?? ''} ${plan.review.progress ?? ''}`.toLowerCase()
  if (!text.trim()) return undefined
  if (/(stagnier|stillstand|kein fortschritt|stalled|stagnat|estancad|point mort)/.test(text)) return 'stalled'
  if (/(verbesser|besser|fortschritt|improv|amélior|mejor|gebessert)/.test(text)) return 'improving'
  if (/(langsam|schleppend|slow|lent|lento|zäh)/.test(text)) return 'slow'
  return 'on-track'
}

/**
 * Derives the compact summary read by the Therapie module from the full plan.
 * Returns translated display strings for direct rendering in the card.
 */
export function derivePsychotherapySummary(
  plan: PsychotherapyPlan,
  language: UiLanguage,
): PsychotherapySummary {
  const orderedStages = [...plan.stages].sort((a, b) => a.order - b.order)
  const activeStage = orderedStages.find((s) => s.status === 'active') ?? orderedStages.find((s) => s.status === 'planned')
  const currentStage = activeStage ? translateTherapyStage(language, activeStage.stageId) : undefined

  const mainGoal =
    firstActiveGoal(plan.goals.shortTerm)?.text ||
    firstActiveGoal(plan.goals.mediumTerm)?.text ||
    firstActiveGoal(plan.goals.longTerm)?.text ||
    undefined

  const selectedMethods = plan.methods
    .filter((m) => m.selected)
    .map((m) => translateTherapyMethod(language, m.methodId))
  const method = selectedMethods.length ? selectedMethods.slice(0, 2).join(', ') : undefined

  const sortedSessions = [...plan.sessions].sort((a, b) => (a.date < b.date ? 1 : -1))
  const lastSession = sortedSessions[0]
  const lastSessionDate = lastSession?.date || undefined

  const upcomingPlanned = [...plan.plannedSessions]
    .filter((s) => s.status === 'planned' && s.topic.trim())
    .sort((a, b) => (a.date > b.date ? 1 : -1))[0]
  const nextFocus = lastSession?.nextFocus?.trim() || upcomingPlanned?.topic?.trim() || undefined

  return {
    status: plan.overview.status,
    currentStage,
    mainGoal,
    method,
    frequency: plan.overview.frequency?.trim() || undefined,
    plannedDuration: plan.overview.plannedDuration?.trim() || undefined,
    lastSessionDate,
    nextFocus,
    progressStatus: deriveProgressStatus(plan),
  }
}
