import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import type {
  LabCorrelationAIResult,
  LabCorrelationAIRun,
  LabCorrelationMedicationInput,
  LabMedicationCorrelationRunRequest,
  LabMedicationCorrelationRunResponse,
  LabObservationInput,
  PatientMedicationLabCorrelationFinding,
} from '../types/labMedicationCorrelation'

export async function runLabMedicationCorrelation(
  input: LabMedicationCorrelationRunRequest,
): Promise<LabMedicationCorrelationRunResponse> {
  const response = await clinicalApiFetch('/api/lab-med-correlation/run', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Korrelationsprüfung fehlgeschlagen')
  return (await response.json()) as LabMedicationCorrelationRunResponse
}

export async function acceptLabCorrelationFinding(
  findingId: string,
  options?: { clinicianNote?: string; editedResult?: LabCorrelationAIResult },
): Promise<{ run: LabCorrelationAIRun; finding: PatientMedicationLabCorrelationFinding }> {
  const response = await clinicalApiFetch(`/api/lab-med-correlation/${encodeURIComponent(findingId)}/accept`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Akzeptieren fehlgeschlagen')
  return (await response.json()) as { run: LabCorrelationAIRun; finding: PatientMedicationLabCorrelationFinding }
}

export async function rejectLabCorrelationFinding(
  findingId: string,
  options?: { clinicianNote?: string },
): Promise<{ run: LabCorrelationAIRun; finding: PatientMedicationLabCorrelationFinding }> {
  const response = await clinicalApiFetch(`/api/lab-med-correlation/${encodeURIComponent(findingId)}/reject`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Verwerfen fehlgeschlagen')
  return (await response.json()) as { run: LabCorrelationAIRun; finding: PatientMedicationLabCorrelationFinding }
}

export async function requestOpenAiSecondOpinion(
  findingId: string,
): Promise<{ run: LabCorrelationAIRun; finding: PatientMedicationLabCorrelationFinding }> {
  const response = await clinicalApiFetch(
    `/api/lab-med-correlation/${encodeURIComponent(findingId)}/openai-second-opinion`,
    { method: 'POST', body: JSON.stringify({}) },
  )
  if (!response.ok) await parseClinicalApiError(response, 'OpenAI-Zweitprüfung fehlgeschlagen')
  return (await response.json()) as { run: LabCorrelationAIRun; finding: PatientMedicationLabCorrelationFinding }
}

export async function listLabCorrelationState(caseId: string): Promise<{
  findings: PatientMedicationLabCorrelationFinding[]
  aiRuns: LabCorrelationAIRun[]
}> {
  const response = await clinicalApiFetch(`/api/lab-med-correlation/${encodeURIComponent(caseId)}`)
  if (!response.ok) await parseClinicalApiError(response, 'Laden fehlgeschlagen')
  return (await response.json()) as {
    findings: PatientMedicationLabCorrelationFinding[]
    aiRuns: LabCorrelationAIRun[]
  }
}

export type { LabCorrelationMedicationInput, LabObservationInput }
