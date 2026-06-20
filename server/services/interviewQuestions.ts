/**
 * Butterfly interview-question generation service.
 *
 * For each still-`unknown` diagnosis criterion, this service turns the criterion
 * into 1–3 CONCRETE, patient-directed interview questions a psychiatrist can ask
 * verbatim to elicit evidence for that specific criterion.
 *
 * Privacy: the prompt is built ONLY from generic clinical reference metadata —
 * our own operational criterion paraphrase (`text`), the disorder name, and the
 * (language-neutral) ICD citation. NO patient free-text / PHI is ever sent here.
 *
 * Mock-mode fallback: when no LLM key is configured (or the model returns
 * unusable output) we return a small set of DETERMINISTIC templated questions
 * derived from the criterion text, so dev + tests work fully offline.
 */

import { runAiFeature } from '../ai/runAiFeature'
import type { AiModelTier } from '../modelTierMapping'
import type { AiUsageContext } from '../ai/types'
import { parseStructuredJson } from '../utils/parseStructuredJson'
import {
  clinicalLanguagePromptInstruction,
  type ClinicalLanguage,
} from '../utils/resolveClinicalLanguage'

/** Generic (non-PHI) criterion reference passed to the generator. */
export interface InterviewQuestionCriterion {
  /** Stable criterion id (e.g. `f10_2.craving`). */
  id: string
  /** OUR original operational paraphrase (German) — safe to transmit. */
  text: string
  /** Optional, language-neutral source citation (e.g. `ICD-10 F10.2 (a)`). */
  citation?: string
}

/** Concrete interview questions generated for a single criterion. */
export interface CriterionInterviewQuestions {
  criterionId: string
  /** 1–3 concrete, patient-directed questions (in the requested language). */
  questions: string[]
}

/** Minimum / maximum concrete questions per criterion. */
export const MIN_QUESTIONS_PER_CRITERION = 1
export const MAX_QUESTIONS_PER_CRITERION = 3
const MAX_QUESTION_CHARS = 320

/** True when no provider key is configured → {@link callLlm} returns mock text. */
export function isLlmMockMode(): boolean {
  return !process.env.OPENAI_API_KEY?.trim() && !process.env.DEEPSEEK_API_KEY?.trim()
}

export function buildInterviewSystemPrompt(language: ClinicalLanguage): string {
  return [
    'You are an experienced psychiatrist preparing a clinical interview.',
    'You are given a disorder name and a list of operational diagnostic criteria that are not yet documented for a patient.',
    `For EACH criterion, formulate ${MIN_QUESTIONS_PER_CRITERION} to ${MAX_QUESTIONS_PER_CRITERION} concrete, natural interview questions that the clinician can ask the patient DIRECTLY to elicit evidence for that specific criterion.`,
    'The questions must be patient-directed (addressed to the patient, using "you"/"Sie"), natural and empathetic, and phrased exactly the way a psychiatrist would actually speak in a consultation — never abstract meta-questions addressed to the clinician.',
    'Each question must be self-contained, answerable, and target ONLY the given criterion. Do not reference ICD/DSM, criterion ids, or documentation. Do not ask the patient to "confirm a criterion".',
    'Do not invent clinical facts and do not include any patient-identifying information.',
    'Return ONLY a JSON object of the exact shape: {"results":[{"id":string,"questions":[string,...]}]}.',
    'Include exactly one entry per criterion id provided, each with 1 to 3 question strings.',
    clinicalLanguagePromptInstruction(language),
  ].join(' ')
}

export function buildInterviewUserPrompt(input: {
  disorderName: string
  criteria: InterviewQuestionCriterion[]
}): string {
  const criteriaList = input.criteria
    .map((criterion, index) => {
      const citation = criterion.citation ? ` [${criterion.citation}]` : ''
      return `${index + 1}. (id: ${criterion.id})${citation} ${criterion.text}`
    })
    .join('\n')

  return [
    `Disorder under review: ${input.disorderName}.`,
    '',
    'For each criterion below, formulate concrete patient-interview questions:',
    criteriaList,
  ].join('\n')
}

function coerceQuestionList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim().slice(0, MAX_QUESTION_CHARS)
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
    if (out.length >= MAX_QUESTIONS_PER_CRITERION) break
  }
  return out
}

/**
 * Deterministic, templated interview questions derived from the criterion text.
 * Used as the mock-mode fallback and whenever the model produces nothing usable
 * for a given criterion. Licensing-safe, original wording.
 */
export function deterministicInterviewQuestions(
  criterion: InterviewQuestionCriterion,
  language: ClinicalLanguage,
): string[] {
  const text = criterion.text.trim().replace(/[.;]+$/, '')
  switch (language) {
    case 'en':
      return [
        `Does the following apply to you: ${text}? Please describe it in your own words.`,
        `Have you noticed anything like this recently: ${text}?`,
      ]
    case 'fr':
      return [
        `Est-ce que ceci vous concerne : ${text} ? Pouvez-vous le décrire avec vos propres mots ?`,
        `Avez-vous remarqué quelque chose de ce genre récemment : ${text} ?`,
      ]
    case 'es':
      return [
        `¿Le ocurre lo siguiente: ${text}? Descríbalo con sus propias palabras, por favor.`,
        `¿Ha notado algo así últimamente: ${text}?`,
      ]
    default:
      return [
        `Trifft das Folgende auf Sie zu: ${text}? Bitte schildern Sie es mir mit Ihren eigenen Worten.`,
        `Haben Sie in letzter Zeit etwas in dieser Art bei sich bemerkt: ${text}?`,
      ]
  }
}

/**
 * Parse the model's JSON output into per-criterion question lists. Robust by
 * design: any missing/invalid/empty criterion falls back to the deterministic
 * templated questions, so a parse failure can never leave a criterion without
 * concrete questions.
 */
export function parseInterviewQuestionsResponse(
  text: string,
  criteria: InterviewQuestionCriterion[],
  language: ClinicalLanguage,
): CriterionInterviewQuestions[] {
  const byId = new Map<string, string[]>()
  const parsed = parseStructuredJson(text) as unknown
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { results?: unknown })?.results)
      ? (parsed as { results: unknown[] }).results
      : []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id : null
    if (!id) continue
    const questions = coerceQuestionList(r.questions)
    if (questions.length > 0) byId.set(id, questions)
  }

  return criteria.map((criterion) => ({
    criterionId: criterion.id,
    questions: byId.get(criterion.id) ?? deterministicInterviewQuestions(criterion, language),
  }))
}

export interface InterviewQuestionGenerationParams {
  disorderName: string
  criteria: InterviewQuestionCriterion[]
  language: ClinicalLanguage
  tier?: AiModelTier
  usageContext?: AiUsageContext
}

export interface InterviewQuestionGenerationOutput {
  results: CriterionInterviewQuestions[]
  model: { provider: string; modelId: string }
  mock: boolean
}

/**
 * Generate concrete interview questions for a batch of unresolved criteria of
 * ONE disorder in a single LLM call. Falls back to deterministic templates for
 * any criterion the model omits, and entirely in mock mode (no API key).
 */
export async function generateInterviewQuestions(
  params: InterviewQuestionGenerationParams,
): Promise<InterviewQuestionGenerationOutput> {
  const mock = isLlmMockMode()

  if (mock) {
    return {
      results: params.criteria.map((criterion) => ({
        criterionId: criterion.id,
        questions: deterministicInterviewQuestions(criterion, params.language),
      })),
      // Synthesize a model marker without spending a (mock) LLM round-trip.
      model: { provider: 'mock', modelId: 'deterministic-fallback' },
      mock: true,
    }
  }

  const systemPrompt = buildInterviewSystemPrompt(params.language)
  const userPrompt = buildInterviewUserPrompt({
    disorderName: params.disorderName,
    criteria: params.criteria,
  })

  const llm = await runAiFeature({
    featureKey: 'clinical_intelligence_dimensional',
    tier: params.tier ?? 'fast',
    systemPrompt,
    userPrompt,
    jsonResponse: true,
    maxTokens: 1_500,
    usageContext: params.usageContext,
  })

  return {
    results: parseInterviewQuestionsResponse(llm.text, params.criteria, params.language),
    model: { provider: llm.provider, modelId: llm.model },
    mock: false,
  }
}
