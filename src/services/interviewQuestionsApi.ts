import { clinicalApiFetch, getClinicalApiLanguage, parseClinicalApiError } from './clinicalApiFetch'

/** Generic (non-PHI) criterion reference sent to the generator. */
export interface InterviewQuestionCriterion {
  id: string
  /** OUR original operational paraphrase — never copyrighted criterion text. */
  text: string
  /** Optional, language-neutral source citation (e.g. `ICD-10 F10.2 (a)`). */
  citation?: string
}

export interface CriterionInterviewQuestions {
  criterionId: string
  questions: string[]
}

export interface InterviewQuestionsResponse {
  disorderName: string
  model: { provider: string; modelId: string }
  mock: boolean
  results: CriterionInterviewQuestions[]
  disclaimer: string
}

export interface InterviewQuestionsInput {
  caseId: string
  disorderId: string
  disorderName: string
  criteria: InterviewQuestionCriterion[]
  tier?: 'fast' | 'standard' | 'thorough'
  language?: string
}

/**
 * Ask the server to formulate concrete, patient-directed interview questions for
 * a batch of still-unresolved criteria of ONE disorder. The request carries only
 * generic clinical reference metadata (criterion paraphrase + disorder name +
 * citation) — never patient PHI.
 */
export async function generateInterviewQuestions(
  input: InterviewQuestionsInput,
): Promise<InterviewQuestionsResponse> {
  const response = await clinicalApiFetch('/api/butterfly/interview-questions', {
    method: 'POST',
    body: JSON.stringify({
      caseId: input.caseId,
      disorderId: input.disorderId,
      disorderName: input.disorderName,
      criteria: input.criteria,
      tier: input.tier ?? 'fast',
      language: input.language ?? getClinicalApiLanguage(),
    }),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Fragegenerierung fehlgeschlagen')
  return (await response.json()) as InterviewQuestionsResponse
}
