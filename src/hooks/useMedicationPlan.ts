import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import type { MedicationPlanState, SideEffectReport } from '../types/medicationPlan'
import {
  addMedicationToPlan,
  addSideEffectReport,
  copyMedicationPlan,
  createDefaultMedicationDraft,
  getCurrentPlan,
  type MedicationDraft,
  selectMedicationPlan,
  updateMedicationInPlan,
} from '../utils/medication/planOps'
import {
  getOrCreateMedicationPlanState,
  loadMedicationPlanState,
  saveMedicationPlanState,
  subscribeMedicationPlanState,
} from '../utils/medication/storage'

export function useMedicationPlan(caseId: string) {
  const { language } = useTranslation()
  const [state, setState] = useState<MedicationPlanState>(() =>
    getOrCreateMedicationPlanState(caseId),
  )

  useEffect(() => {
    setState(loadMedicationPlanState(caseId) ?? getOrCreateMedicationPlanState(caseId))
  }, [caseId])

  useEffect(() => {
    return subscribeMedicationPlanState((updatedCaseId) => {
      if (updatedCaseId !== caseId) return
      setState(loadMedicationPlanState(caseId) ?? getOrCreateMedicationPlanState(caseId))
    })
  }, [caseId])

  const currentPlan = useMemo(() => getCurrentPlan(state), [state])

  const persist = useCallback(
    (next: MedicationPlanState) => {
      saveMedicationPlanState(next, caseId)
      setState(next)
    },
    [caseId],
  )

  const addMedication = useCallback(
    (draft: MedicationDraft) => {
      if (!currentPlan) return
      persist(addMedicationToPlan(state, currentPlan.id, draft, language))
    },
    [currentPlan, language, persist, state],
  )

  const updateMedication = useCallback(
    (medicationId: string, draft: MedicationDraft) => {
      if (!currentPlan) return
      persist(updateMedicationInPlan(state, currentPlan.id, medicationId, draft, language))
    },
    [currentPlan, language, persist, state],
  )

  const reportSideEffect = useCallback(
    (report: Omit<SideEffectReport, 'id'>) => {
      persist(addSideEffectReport(state, report))
    },
    [persist, state],
  )

  const copyPlan = useCallback(() => {
    if (!currentPlan) return
    persist(copyMedicationPlan(state, currentPlan.id, caseId, language))
  }, [caseId, currentPlan, language, persist, state])

  const selectPlan = useCallback(
    (planId: string) => {
      persist(selectMedicationPlan(state, planId))
    },
    [persist, state],
  )

  const updateLabNotes = useCallback(
    (notes: string) => {
      persist({ ...state, labCorrelationNotes: notes })
    },
    [persist, state],
  )

  return {
    state,
    currentPlan,
    addMedication,
    updateMedication,
    reportSideEffect,
    copyPlan,
    selectPlan,
    updateLabNotes,
    createDefaultMedicationDraft,
  }
}
