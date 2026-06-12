import type { ClinicalImprintJob } from '../../types/clinicalImprint'
import type { PsychotherapyPlan, SessionNote } from '../../types/psychotherapy'
import { scheduleClinicalImprint } from '../clinicalImprint/orchestrator'

const RISK_PATTERN = /suizid|selbstgefährd|fremdgefährd|aggressi|krise|gefährd|selbstverletz|delikt/i

/** Builds the imprint text for a session — prefers the structured meta sentence. */
function sessionImprintText(note: SessionNote): string {
  const base = note.clinicalImprintMeta?.readableClinicalSentence?.trim() || note.generatedParagraph?.trim() || ''
  return base
}

function sessionJob(caseId: string, note: SessionNote): ClinicalImprintJob | null {
  const text = sessionImprintText(note)
  if (!text.trim()) return null

  const isRisk = RISK_PATTERN.test(note.riskAspects) || RISK_PATTERN.test(text)

  return {
    caseId,
    sourceType: isRisk ? 'risk' : 'manual_note',
    sourceId: `psychotherapy-session:${note.id}`,
    text,
    sourceDate: note.date || note.createdAt,
    // Routes clinicalDomain to 'therapy' in the imprint extractor.
    documentTypeId: 'therapieplanung',
    sectionLabel: note.topic?.trim() || undefined,
    evidenceStrength: 'direct_observation',
  }
}

export function collectPsychotherapyPlanJobs(caseId: string, plan: PsychotherapyPlan): ClinicalImprintJob[] {
  const jobs: ClinicalImprintJob[] = []
  for (const note of plan.sessions) {
    const job = sessionJob(caseId, note)
    if (job) jobs.push(job)
  }
  return jobs
}

export function schedulePsychotherapyPlanImprints(caseId: string, plan: PsychotherapyPlan): void {
  for (const job of collectPsychotherapyPlanJobs(caseId, plan)) {
    scheduleClinicalImprint(job)
  }
}
