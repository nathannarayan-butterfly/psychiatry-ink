/**
 * Butterfly interview-question cache.
 *
 * The concrete patient-interview questions generated for a criterion are GENERIC
 * clinical reference content (derived only from our criterion paraphrase +
 * disorder name + citation — never patient PHI). They depend solely on the
 * disorder, the criterion, the dataset version AND the active ICD version
 * (ICD-10 vs ICD-11 criteria differ), so we cache them GLOBALLY (not per-case)
 * keyed by `${disorderId}:${criterionId}:v${version}:${icdVersion}`. This lets
 * the panel reuse them across renders and across cases without re-calling the
 * LLM each time, while toggling ICD-10 ↔ ICD-11 re-derives (rather than serving
 * the other version's cached) questions.
 *
 * Cached values are also language-scoped (questions are generated per UI
 * language), so the key folds in the active language.
 */

import type { ButterflyIcdVersion } from '../../data/diagnosisCriteria/version'

const STORAGE_KEY = 'butterfly-interview-questions'

export interface CachedInterviewQuestions {
  questions: string[]
  model: string
  generatedAt: string
}

export type InterviewQuestionCacheState = Record<string, CachedInterviewQuestions>

export function interviewQuestionCacheKey(
  disorderId: string,
  version: number,
  icdVersion: ButterflyIcdVersion,
  criterionId: string,
  language: string,
): string {
  return `${disorderId}:${criterionId}:v${version}:${icdVersion}:${language}`
}

export function loadInterviewQuestionCache(): InterviewQuestionCacheState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as InterviewQuestionCacheState
  } catch {
    return {}
  }
}

function persist(state: InterviewQuestionCacheState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function getCachedInterviewQuestions(
  state: InterviewQuestionCacheState,
  disorderId: string,
  version: number,
  icdVersion: ButterflyIcdVersion,
  criterionId: string,
  language: string,
): string[] | undefined {
  const entry = state[interviewQuestionCacheKey(disorderId, version, icdVersion, criterionId, language)]
  return entry && entry.questions.length > 0 ? entry.questions : undefined
}

export interface IncomingInterviewQuestions {
  criterionId: string
  questions: string[]
}

/**
 * Merge a batch of generated question lists for one disorder/version into the
 * cache. Existing entries for the same criteria are replaced.
 */
export function saveInterviewQuestions(
  disorderId: string,
  version: number,
  icdVersion: ButterflyIcdVersion,
  language: string,
  model: string,
  results: IncomingInterviewQuestions[],
): InterviewQuestionCacheState {
  const state = loadInterviewQuestionCache()
  const generatedAt = new Date().toISOString()
  for (const result of results) {
    if (result.questions.length === 0) continue
    state[interviewQuestionCacheKey(disorderId, version, icdVersion, result.criterionId, language)] = {
      questions: result.questions,
      model,
      generatedAt,
    }
  }
  persist(state)
  return state
}
