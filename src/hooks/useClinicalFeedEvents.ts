import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import {
  collectClinicalFeedEvents,
  type ClinicalFeedEvent,
} from '../utils/verlauf/clinicalEvents'
import { subscribeMedicationPlanState } from '../utils/medication/storage'
import { subscribePsychotherapyPlan } from '../utils/psychotherapy/storage'
import { subscribeComplementaryTherapies } from '../utils/complementaryTherapy/storage'
import { subscribeSozialtherapie } from '../utils/sozialtherapie/storage'

/**
 * Derived (read-only) Verlauf feed events aggregated from the Therapie sources.
 * Recomputes whenever the active case, the UI language, or any underlying
 * Therapie store changes — so the feed stays in sync with the source sections
 * without duplicating their data into verlaufFeed storage.
 */
export function useClinicalFeedEvents(caseId: string): ClinicalFeedEvent[] {
  const { language } = useTranslation()
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const bump = (updatedCaseId: string) => {
      if (updatedCaseId === caseId) setRevision((r) => r + 1)
    }
    const unsubscribers = [
      subscribeMedicationPlanState(bump),
      subscribePsychotherapyPlan(bump),
      subscribeComplementaryTherapies(bump),
      subscribeSozialtherapie(bump),
    ]
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [caseId])

  return useMemo(
    () => collectClinicalFeedEvents(caseId, language),
    // `revision` intentionally participates so store mutations trigger a recompute.
    [caseId, language, revision],
  )
}
