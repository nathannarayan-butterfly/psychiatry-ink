import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildInterviewUserPrompt,
  deterministicInterviewQuestions,
  generateInterviewQuestions,
  parseInterviewQuestionsResponse,
  MAX_QUESTIONS_PER_CRITERION,
  type InterviewQuestionCriterion,
} from './interviewQuestions'

const CRITERIA: InterviewQuestionCriterion[] = [
  { id: 'f10_2.craving', text: 'Starkes Verlangen, Alkohol zu konsumieren', citation: 'ICD-10 F10.2 (a)' },
  { id: 'f10_2.tolerance', text: 'Toleranzentwicklung' },
]

const ENV_KEYS = ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('buildInterviewUserPrompt', () => {
  it('grounds the prompt in disorder + criterion text + citation (no PHI)', () => {
    const prompt = buildInterviewUserPrompt({ disorderName: 'Alkoholabhängigkeit', criteria: CRITERIA })
    expect(prompt).toContain('Alkoholabhängigkeit')
    expect(prompt).toContain('f10_2.craving')
    expect(prompt).toContain('Starkes Verlangen, Alkohol zu konsumieren')
    expect(prompt).toContain('ICD-10 F10.2 (a)')
  })
})

describe('deterministicInterviewQuestions', () => {
  it('produces patient-directed questions grounded in the criterion text', () => {
    const [first] = deterministicInterviewQuestions(CRITERIA[0], 'de')
    expect(first).toContain('Sie')
    expect(first).toContain('Starkes Verlangen, Alkohol zu konsumieren')
    expect(first).not.toContain('{criterion}')
  })

  it('localizes the fallback to the requested language', () => {
    expect(deterministicInterviewQuestions(CRITERIA[0], 'en')[0]).toContain('Does the following apply to you')
  })
})

describe('parseInterviewQuestionsResponse', () => {
  it('maps a valid JSON object to per-criterion question lists (capped)', () => {
    const text = JSON.stringify({
      results: [
        { id: 'f10_2.craving', questions: ['Frage 1?', 'Frage 2?', 'Frage 3?', 'Frage 4?'] },
        { id: 'f10_2.tolerance', questions: ['Toleranz?'] },
      ],
    })
    const out = parseInterviewQuestionsResponse(text, CRITERIA, 'de')
    expect(out).toHaveLength(2)
    expect(out[0].criterionId).toBe('f10_2.craving')
    expect(out[0].questions).toHaveLength(MAX_QUESTIONS_PER_CRITERION)
    expect(out[1].questions).toEqual(['Toleranz?'])
  })

  it('falls back to deterministic questions for criteria the model omits', () => {
    const text = JSON.stringify({ results: [{ id: 'f10_2.craving', questions: ['Frage 1?'] }] })
    const out = parseInterviewQuestionsResponse(text, CRITERIA, 'de')
    // craving comes from the model …
    expect(out[0].questions).toEqual(['Frage 1?'])
    // … tolerance (missing) gets the deterministic template.
    expect(out[1].questions.length).toBeGreaterThanOrEqual(1)
    expect(out[1].questions[0]).toContain('Toleranzentwicklung')
  })

  it('falls back entirely when the response is not JSON (mock echo)', () => {
    const out = parseInterviewQuestionsResponse('not json [AI draft — set DEEPSEEK_API_KEY]', CRITERIA, 'de')
    expect(out).toHaveLength(2)
    for (const result of out) expect(result.questions.length).toBeGreaterThanOrEqual(1)
  })
})

describe('generateInterviewQuestions (mock mode, no API key)', () => {
  it('returns deterministic questions for every criterion without calling an LLM', async () => {
    const out = await generateInterviewQuestions({
      disorderName: 'Alkoholabhängigkeit',
      criteria: CRITERIA,
      language: 'de',
    })
    expect(out.mock).toBe(true)
    expect(out.model.provider).toBe('mock')
    expect(out.results).toHaveLength(CRITERIA.length)
    for (const result of out.results) {
      expect(result.questions.length).toBeGreaterThanOrEqual(1)
      expect(result.questions.length).toBeLessThanOrEqual(MAX_QUESTIONS_PER_CRITERION)
    }
    expect(out.results[0].questions[0]).toContain('Starkes Verlangen, Alkohol zu konsumieren')
  })
})
