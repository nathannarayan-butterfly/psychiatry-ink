import { afterEach, describe, expect, it } from 'vitest'
import {
  getCachedInterviewQuestions,
  interviewQuestionCacheKey,
  loadInterviewQuestionCache,
  saveInterviewQuestions,
} from '../interviewQuestionsCache'

afterEach(() => {
  localStorage.clear()
})

describe('interviewQuestionCacheKey', () => {
  it('folds the ICD version into the key so ICD-10 and ICD-11 never collide', () => {
    const k10 = interviewQuestionCacheKey('alcohol_dependence', 1, 'icd10', 'crit', 'de', 'fast')
    const k11 = interviewQuestionCacheKey('alcohol_dependence', 1, 'icd11', 'crit', 'de', 'fast')
    expect(k10).not.toBe(k11)
    expect(k10).toContain(':icd10:')
    expect(k11).toContain(':icd11:')
  })

  it('folds the AI model tier into the key so tiers never collide', () => {
    const fast = interviewQuestionCacheKey('alcohol_dependence', 1, 'icd10', 'crit', 'de', 'fast')
    const thorough = interviewQuestionCacheKey('alcohol_dependence', 1, 'icd10', 'crit', 'de', 'thorough')
    expect(fast).not.toBe(thorough)
    expect(fast.endsWith(':fast')).toBe(true)
    expect(thorough.endsWith(':thorough')).toBe(true)
  })
})

describe('interview-question cache is branched by ICD version', () => {
  it('does not serve ICD-10 cached questions when querying the ICD-11 branch', () => {
    saveInterviewQuestions('alcohol_dependence', 1, 'icd10', 'de', 'fast', 'test-model', [
      { criterionId: 'f10_2.craving', questions: ['ICD-10 frage?'] },
    ])
    const state = loadInterviewQuestionCache()

    expect(
      getCachedInterviewQuestions(state, 'alcohol_dependence', 1, 'icd10', 'f10_2.craving', 'de', 'fast'),
    ).toEqual(['ICD-10 frage?'])
    // The ICD-11 branch uses distinct criterion ids AND a distinct version key.
    expect(
      getCachedInterviewQuestions(state, 'alcohol_dependence', 1, 'icd11', 'f10_2.craving', 'de', 'fast'),
    ).toBeUndefined()

    saveInterviewQuestions('alcohol_dependence', 1, 'icd11', 'de', 'fast', 'test-model', [
      { criterionId: '6c40_2.impaired_control', questions: ['ICD-11 frage?'] },
    ])
    const next = loadInterviewQuestionCache()
    expect(
      getCachedInterviewQuestions(next, 'alcohol_dependence', 1, 'icd11', '6c40_2.impaired_control', 'de', 'fast'),
    ).toEqual(['ICD-11 frage?'])
    // The ICD-10 branch is unaffected.
    expect(
      getCachedInterviewQuestions(next, 'alcohol_dependence', 1, 'icd10', 'f10_2.craving', 'de', 'fast'),
    ).toEqual(['ICD-10 frage?'])
  })
})

describe('interview-question cache is branched by AI model tier', () => {
  it('does not serve another tier’s cached questions', () => {
    saveInterviewQuestions('alcohol_dependence', 1, 'icd10', 'de', 'fast', 'fast-model', [
      { criterionId: 'f10_2.craving', questions: ['Economical frage?'] },
    ])
    const state = loadInterviewQuestionCache()
    expect(
      getCachedInterviewQuestions(state, 'alcohol_dependence', 1, 'icd10', 'f10_2.craving', 'de', 'fast'),
    ).toEqual(['Economical frage?'])
    // Switching to the Gründlich tier (distinct model) must re-derive, not reuse.
    expect(
      getCachedInterviewQuestions(state, 'alcohol_dependence', 1, 'icd10', 'f10_2.craving', 'de', 'thorough'),
    ).toBeUndefined()
  })
})
