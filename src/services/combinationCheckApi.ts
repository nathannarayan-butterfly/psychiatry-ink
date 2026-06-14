import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import type {
  CombinationCheckAIResult,
  CombinationCheckAIRun,
  CombinationCheckMedicationInput,
  CombinationCheckRunRequest,
  CombinationCheckRunResponse,
  PatientCombinationCheckFinding,
  PatientRiskFactors,
} from '../types/combinationCheck'

export async function runCombinationCheck(
  input: CombinationCheckRunRequest,
): Promise<CombinationCheckRunResponse> {
  const response = await clinicalApiFetch('/api/combination-check/run', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Kombinationscheck fehlgeschlagen')
  return (await response.json()) as CombinationCheckRunResponse
}

export async function acceptCombinationAiRun(
  runId: string,
  options?: { clinicianNote?: string; editedResult?: CombinationCheckAIResult },
): Promise<{ run: CombinationCheckAIRun; finding: PatientCombinationCheckFinding }> {
  const response = await clinicalApiFetch(`/api/combination-check/ai/${encodeURIComponent(runId)}/accept`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Akzeptieren fehlgeschlagen')
  return (await response.json()) as { run: CombinationCheckAIRun; finding: PatientCombinationCheckFinding }
}

export async function rejectCombinationAiRun(
  runId: string,
  options?: { clinicianNote?: string },
): Promise<{ run: CombinationCheckAIRun }> {
  const response = await clinicalApiFetch(`/api/combination-check/ai/${encodeURIComponent(runId)}/reject`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Verwerfen fehlgeschlagen')
  return (await response.json()) as { run: CombinationCheckAIRun }
}

export async function listCombinationAiRuns(caseId: string): Promise<CombinationCheckAIRun[]> {
  const response = await clinicalApiFetch(`/api/combination-check/${encodeURIComponent(caseId)}`)
  if (!response.ok) await parseClinicalApiError(response, 'Laden fehlgeschlagen')
  const data = (await response.json()) as { aiRuns?: CombinationCheckAIRun[] }
  return data.aiRuns ?? []
}

export type { CombinationCheckMedicationInput, PatientRiskFactors }
