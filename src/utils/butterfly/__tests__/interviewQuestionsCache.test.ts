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
    const k10 = interviewQuestionCacheKey('alcohol_dependence', 1, 'icd10', 'crit', 'de')
    const k11 = interviewQuestionCacheKey('alcohol_dependence', 1, 'icd11', 'crit', 'de')
    expect(k10).not.toBe(k11)
    expect(k10).toContain(':icd10:')
    expect(k11).toContain(':icd11:')
  })
})

describe('interview-question cache is branched by ICD version', () => {
  it('does not serve ICD-10 cached questions when querying the ICD-11 branch', () => {
    saveInterviewQuestions('alcohol_dependence', 1, 'icd10', 'de', 'test-model', [
      { criterionId: 'f10_2.craving', questions: ['ICD-10 frage?'] },
    ])
    const state = loadInterviewQuestionCache()

    expect(
      getCachedInterviewQuestions(state, 'alcohol_dependence', 1, 'icd10', 'f10_2.craving', 'de'),
    ).toEqual(['ICD-10 frage?'])
    // The ICD-11 branch uses distinct criterion ids AND a distinct version key.
    expect(
      getCachedInterviewQuestions(state, 'alcohol_dependence', 1, 'icd11', 'f10_2.craving', 'de'),
    ).toBeUndefined()

    saveInterviewQuestions('alcohol_dependence', 1, 'icd11', 'de', 'test-model', [
      { criterionId: '6c40_2.impaired_control', questions: ['ICD-11 frage?'] },
    ])
    const next = loadInterviewQuestionCache()
    expect(
      getCachedInterviewQuestions(next, 'alcohol_dependence', 1, 'icd11', '6c40_2.impaired_control', 'de'),
    ).toEqual(['ICD-11 frage?'])
    // The ICD-10 branch is unaffected.
    expect(
      getCachedInterviewQuestions(next, 'alcohol_dependence', 1, 'icd10', 'f10_2.craving', 'de'),
    ).toEqual(['ICD-10 frage?'])
  })
})
