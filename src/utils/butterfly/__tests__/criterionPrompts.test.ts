import { describe, expect, it } from 'vitest'
import { getDisorderById } from '../../../data/diagnosisCriteria'
import type { DisorderEvaluation } from '../../diagnosisCriteria/evaluateDisorder'
import { resolveDeepLinkPage, selectUnresolvedCriteria } from '../criterionPrompts'

function evaluationWith(perCriterion: DisorderEvaluation['perCriterion']): DisorderEvaluation {
  return { perCriterion } as unknown as DisorderEvaluation
}

describe('selectUnresolvedCriteria', () => {
  it('returns only the unknown criteria (deterministic-first; LLM only on doubt)', () => {
    const evaluation = evaluationWith([
      { criterionId: 'c.met', groupId: 'g', text_de: 'Met', status: 'met', source: 'auto', attestable: true },
      { criterionId: 'c.unknown1', groupId: 'g', text_de: 'Open one', status: 'unknown', source: 'unanswered', attestable: true },
      { criterionId: 'c.notmet', groupId: 'g', text_de: 'Not met', status: 'not_met', source: 'auto', attestable: true },
      { criterionId: 'c.unknown2', groupId: 'g', text_de: 'Open two', status: 'unknown', source: 'unanswered', attestable: true },
    ])
    const unresolved = selectUnresolvedCriteria(evaluation)
    expect(unresolved.map((c) => c.id)).toEqual(['c.unknown1', 'c.unknown2'])
    expect(unresolved[0]).toEqual({ id: 'c.unknown1', text: 'Open one' })
  })
})

describe('resolveDeepLinkPage', () => {
  it('maps psychopathology criteria to the Psychopathologie page', () => {
    const depression = getDisorderById('depressive_episode')
    expect(depression).toBeDefined()
    expect(resolveDeepLinkPage(depression!, 'f32.depressed_mood')).toBe('psychopath')
  })

  it('maps anamnesis-anchored criteria to the Aufnahme page', () => {
    const alcohol = getDisorderById('alcohol_dependence')
    expect(alcohol).toBeDefined()
    const firstCriterionId = alcohol!.groups[0].criteria[0].id
    expect(resolveDeepLinkPage(alcohol!, firstCriterionId)).toBe('aufnahme')
  })

  it('returns undefined for an unknown criterion', () => {
    const depression = getDisorderById('depressive_episode')
    expect(resolveDeepLinkPage(depression!, 'does.not.exist')).toBeUndefined()
  })
})
