import { describe, expect, it } from 'vitest'
import { getDisorderById } from '../../../data/diagnosisCriteria'
import { translateUi } from '../../../data/uiTranslations'
import type { DisorderEvaluation } from '../../diagnosisCriteria/evaluateDisorder'
import {
  buildCriterionQuestions,
  resolveDeepLinkPage,
  selectUnresolvedCriteria,
} from '../criterionPrompts'

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

describe('buildCriterionQuestions', () => {
  const depression = getDisorderById('depressive_episode')!

  it('derives concrete, patient-directed interview questions per unknown criterion', () => {
    const evaluation = evaluationWith([
      {
        criterionId: 'f32.depressed_mood',
        groupId: 'g',
        text_de: 'Gedrückte Stimmung über die meiste Zeit',
        status: 'unknown',
        source: 'unanswered',
        attestable: true,
      },
      { criterionId: 'c.met', groupId: 'g', text_de: 'Erfüllt', status: 'met', source: 'auto', attestable: true },
    ])

    const questions = buildCriterionQuestions(
      [{ disorder: depression, label: 'Depressive Episode', evaluation }],
      (key) => translateUi('de', key),
    )

    expect(questions).toHaveLength(1)
    // Targets the specific missing criterion of the entered diagnosis, in German.
    expect(questions[0].id).toBe('diagnosis_criteria:f32.depressed_mood')
    expect(questions[0].sectionId).toBe('diagnosis_criteria')
    expect(questions[0].targetId).toBe('f32.depressed_mood')
    expect(questions[0].criterionId).toBe('f32.depressed_mood')
    expect(questions[0].disorderId).toBe('depressive_episode')
    // Attestable criterion → a Ja/Nein answer can deterministically resolve it.
    expect(questions[0].resolvable).toBe(true)
    // Without an LLM resolver, deterministic patient-directed fallback questions
    // grounded in the criterion text are produced (1–3, no leftover placeholders).
    expect(questions[0].interviewQuestions.length).toBeGreaterThanOrEqual(1)
    expect(questions[0].interviewQuestions.length).toBeLessThanOrEqual(3)
    expect(questions[0].question).toBe(questions[0].interviewQuestions[0])
    expect(questions[0].question).toContain('Sie')
    expect(questions[0].question).toContain('Gedrückte Stimmung über die meiste Zeit')
    expect(questions[0].question).not.toContain('{criterion}')
    expect(questions[0].question).not.toContain('{diagnosis}')
    expect(questions[0].rationale).toContain('Depressive Episode')
    expect(questions[0].deepLinkPageId).toBe('psychopath')
  })

  it('uses LLM-generated questions from the resolver when available (capped at 3)', () => {
    const evaluation = evaluationWith([
      {
        criterionId: 'f32.depressed_mood',
        groupId: 'g',
        text_de: 'Gedrückte Stimmung über die meiste Zeit',
        status: 'unknown',
        source: 'unanswered',
        attestable: true,
      },
    ])
    const llmQuestions = ['Frage A?', 'Frage B?', 'Frage C?', 'Frage D?']
    const [question] = buildCriterionQuestions(
      [{ disorder: depression, label: 'Depressive Episode', evaluation }],
      (key) => translateUi('de', key),
      ({ criterionId }) => (criterionId === 'f32.depressed_mood' ? llmQuestions : undefined),
    )
    expect(question.interviewQuestions).toEqual(['Frage A?', 'Frage B?', 'Frage C?'])
    expect(question.question).toBe('Frage A?')
  })

  it('falls back to deterministic template when the resolver returns nothing', () => {
    const evaluation = evaluationWith([
      {
        criterionId: 'f32.depressed_mood',
        groupId: 'g',
        text_de: 'Gedrückte Stimmung',
        status: 'unknown',
        source: 'unanswered',
        attestable: true,
      },
    ])
    const [question] = buildCriterionQuestions(
      [{ disorder: depression, label: 'Depressive Episode', evaluation }],
      (key) => translateUi('de', key),
      () => undefined,
    )
    expect(question.interviewQuestions.length).toBeGreaterThanOrEqual(1)
    expect(question.interviewQuestions[0]).toContain('Gedrückte Stimmung')
  })

  it('marks non-attestable criteria as not resolvable (cannot flip via Ja/Nein)', () => {
    const evaluation = evaluationWith([
      {
        criterionId: 'f32.duration',
        groupId: 'g',
        text_de: 'Mindestdauer',
        status: 'unknown',
        source: 'unanswered',
        attestable: false,
      },
    ])
    const [question] = buildCriterionQuestions(
      [{ disorder: depression, label: 'Depressive Episode', evaluation }],
      (key) => translateUi('de', key),
    )
    expect(question.resolvable).toBe(false)
  })

  it('drops a question once its criterion is resolved (re-evaluation removes it)', () => {
    // Same criterion, but now clinician-attested as met → no longer `unknown`.
    const evaluation = evaluationWith([
      {
        criterionId: 'f32.depressed_mood',
        groupId: 'g',
        text_de: 'Gedrückte Stimmung',
        status: 'met',
        source: 'attested',
        attestable: true,
      },
    ])
    expect(
      buildCriterionQuestions(
        [{ disorder: depression, label: 'Depressive Episode', evaluation }],
        (key) => translateUi('de', key),
      ),
    ).toEqual([])
  })

  it('localizes the question to the active UI language', () => {
    const evaluation = evaluationWith([
      {
        criterionId: 'f32.depressed_mood',
        groupId: 'g',
        text_de: 'Gedrückte Stimmung',
        status: 'unknown',
        source: 'unanswered',
        attestable: true,
      },
    ])

    const [de] = buildCriterionQuestions(
      [{ disorder: depression, label: 'Depressive Episode', evaluation }],
      (key) => translateUi('de', key),
    )
    const [en] = buildCriterionQuestions(
      [{ disorder: depression, label: 'Depressive Episode', evaluation }],
      (key) => translateUi('en', key),
    )

    // Deterministic fallback questions follow the active locale.
    expect(de.question).toContain('Trifft das Folgende auf Sie zu')
    expect(en.question).toContain('Does the following apply to you')
  })

  it('emits no questions when an entered diagnosis has no unknown criteria', () => {
    const evaluation = evaluationWith([
      { criterionId: 'c.met', groupId: 'g', text_de: 'Erfüllt', status: 'met', source: 'auto', attestable: true },
    ])
    expect(
      buildCriterionQuestions(
        [{ disorder: depression, label: 'Depressive Episode', evaluation }],
        (key) => translateUi('de', key),
      ),
    ).toEqual([])
  })

  it('caps the number of questions at the requested limit', () => {
    const evaluation = evaluationWith(
      Array.from({ length: 20 }, (_, i) => ({
        criterionId: `c.unknown${i}`,
        groupId: 'g',
        text_de: `Offen ${i}`,
        status: 'unknown' as const,
        source: 'unanswered' as const,
        attestable: true,
      })),
    )
    const questions = buildCriterionQuestions(
      [{ disorder: depression, label: 'Depressive Episode', evaluation }],
      (key) => translateUi('de', key),
      undefined,
      5,
    )
    expect(questions).toHaveLength(5)
  })
})
