import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import type { PsychotherapyPlan, PsychotherapySummary } from '../types/psychotherapy'
import { createEmptyPsychotherapyPlan, isPlanEmpty } from '../types/psychotherapy'
import { derivePsychotherapySummary } from '../utils/psychotherapy/derive'
import { generatePsychotherapySummaryText } from '../utils/psychotherapy/sessionNote'
import {
  getOrCreatePsychotherapyPlan,
  loadPsychotherapyPlan,
  savePsychotherapyPlan,
  subscribePsychotherapyPlan,
} from '../utils/psychotherapy/storage'

export function usePsychotherapyPlan(caseId: string) {
  const { language } = useTranslation()
  const [plan, setPlan] = useState<PsychotherapyPlan>(() => getOrCreatePsychotherapyPlan(caseId))
  const planRef = useRef(plan)
  planRef.current = plan

  useEffect(() => {
    setPlan(loadPsychotherapyPlan(caseId) ?? createEmptyPsychotherapyPlan())
  }, [caseId])

  useEffect(() => {
    return subscribePsychotherapyPlan((updatedCaseId) => {
      if (updatedCaseId !== caseId) return
      setPlan(loadPsychotherapyPlan(caseId) ?? createEmptyPsychotherapyPlan())
    })
  }, [caseId])

  const persist = useCallback(
    (next: PsychotherapyPlan) => {
      savePsychotherapyPlan(next, caseId)
      setPlan(next)
    },
    [caseId],
  )

  /** Update via a producer function operating on the current plan. */
  const update = useCallback(
    (producer: (current: PsychotherapyPlan) => PsychotherapyPlan) => {
      const next = producer(planRef.current)
      planRef.current = next
      savePsychotherapyPlan(next, caseId)
      setPlan(next)
    },
    [caseId],
  )

  const summary = useMemo<PsychotherapySummary>(
    () => derivePsychotherapySummary(plan, language),
    [plan, language],
  )

  const hasPlan = useMemo(() => !isPlanEmpty(plan), [plan])

  const generateSummaryText = useCallback(
    () => generatePsychotherapySummaryText(plan, language),
    [plan, language],
  )

  return {
    plan,
    summary,
    hasPlan,
    persist,
    update,
    generateSummaryText,
  }
}
