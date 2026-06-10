import type {
  MedicationEntry,
  MedicationPlan,
  MedicationPlanState,
  SideEffectReport,
} from '../../types/medicationPlan'
import type { ClinicalImprintJob } from '../../types/clinicalImprint'
import { scheduleClinicalImprint } from '../clinicalImprint/orchestrator'
import {
  buildMedicationEntryClinicalText,
  buildReadableClinicalSentence,
  buildSideEffectClinicalText,
} from './doseLine'
import { getCurrentPlan } from './planOps'

function planJob(caseId: string, plan: MedicationPlan): ClinicalImprintJob | null {
  const text = plan.readableClinicalSentence ?? buildReadableClinicalSentence(plan)
  if (!text.trim()) return null
  return {
    caseId,
    sourceType: 'medication',
    sourceId: `med-plan:${plan.id}`,
    text,
    sourceDate: plan.createdAt,
    documentTypeId: 'medikation',
    evidenceStrength: 'direct_observation',
  }
}

function medicationEntryJob(caseId: string, entry: MedicationEntry): ClinicalImprintJob | null {
  const text = buildMedicationEntryClinicalText(entry)
  if (!text.trim()) return null
  return {
    caseId,
    sourceType: 'medication',
    sourceId: `med-entry:${entry.id}`,
    text,
    sourceDate: entry.lastChangeAt,
    documentTypeId: 'medikation',
    sectionLabel: entry.substance.trim() || undefined,
    evidenceStrength: 'direct_observation',
  }
}

function sideEffectJob(
  caseId: string,
  report: SideEffectReport,
  medications: MedicationEntry[],
): ClinicalImprintJob | null {
  const text = buildSideEffectClinicalText(report, medications)
  if (!text.trim()) return null

  const isRiskSignal = /suizid|selbstgefährd|fremdgefährd|aggressiv|anfall|arrhythm|toxisch/i.test(
    text,
  )

  return {
    caseId,
    sourceType: isRiskSignal ? 'risk' : 'medication',
    sourceId: `side-effect:${report.id}`,
    text,
    sourceDate: report.onsetDate || new Date().toISOString(),
    documentTypeId: 'medikation',
    sectionLabel: 'Nebenwirkung',
    evidenceStrength: 'patient_report',
  }
}

function labNotesJob(caseId: string, notes: string, updatedAt: string): ClinicalImprintJob | null {
  const text = notes.trim()
  if (!text) return null
  return {
    caseId,
    sourceType: 'medication',
    sourceId: 'med-lab-correlation',
    text: `Laborbezug Medikation: ${text}`,
    sourceDate: updatedAt,
    documentTypeId: 'medikation',
    evidenceStrength: 'direct_observation',
  }
}

export function scheduleMedicationStateImprints(caseId: string, state: MedicationPlanState): void {
  for (const job of collectMedicationStateJobs(caseId, state)) {
    scheduleClinicalImprint(job)
  }
}

export function collectMedicationStateJobs(
  caseId: string,
  state: MedicationPlanState,
): ClinicalImprintJob[] {
  const jobs: ClinicalImprintJob[] = []
  const currentPlan = getCurrentPlan(state)
  const medications = currentPlan?.medications ?? []

  if (currentPlan) {
    const planImprint = planJob(caseId, currentPlan)
    if (planImprint) jobs.push(planImprint)
  }

  for (const entry of medications) {
    const entryJob = medicationEntryJob(caseId, entry)
    if (entryJob) jobs.push(entryJob)
  }

  for (const report of state.sideEffectReports ?? []) {
    const reportJob = sideEffectJob(caseId, report, medications)
    if (reportJob) jobs.push(reportJob)
  }

  if (state.labCorrelationNotes?.trim()) {
    const notesJob = labNotesJob(caseId, state.labCorrelationNotes, state.updatedAt)
    if (notesJob) jobs.push(notesJob)
  }

  return jobs
}
