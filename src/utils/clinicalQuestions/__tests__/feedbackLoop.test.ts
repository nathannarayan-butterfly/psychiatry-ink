import { afterEach, describe, expect, it } from 'vitest'
import type {
  CoursePattern,
  IsdmPhenomenologyDomain,
  SymptomFinding,
} from '../../../types/isdm'
import { ISDM_PHENOMENOLOGY_DOMAINS } from '../../../types/isdm'
import { buildEvaluationContext, type AttestationMap } from '../../diagnosisCriteria/context'
import { evaluateDisorder } from '../../diagnosisCriteria/evaluateDisorder'
import { depressiveEpisode } from '../../../data/diagnosisCriteria/depressiveEpisode'
import { buildCriterionQuestions } from '../../butterfly/criterionPrompts'
import { translateUi } from '../../../data/uiTranslations'
import { resolutionToAttestation } from '../resolution'
import { clinicalQuestionId } from '../ids'
import {
  applyClinicalQuestionNoteState,
  clearClinicalQuestionNote,
  clearClinicalQuestionNoteCache,
  loadClinicalQuestionNoteState,
  setClinicalQuestionNote,
} from '../answerNotes'

const CRITERION = 'f32.depressed_mood'

function finding(domain: IsdmPhenomenologyDomain, label: string): SymptomFinding {
  return {
    id: `${domain}:${label}`,
    domain,
    label,
    keywords: [label],
    evidenceStrength: 'direct_observation',
    sourceImprintKeys: ['test'],
    confidence: 3,
    polarity: 'present',
  }
}

function makeCourse(duration: CoursePattern['duration'] = 'unclear'): CoursePattern {
  return {
    onset: 'unclear',
    duration,
    episodicity: 'unclear',
    trajectory: [],
    contextualTriggers: [],
    precipitants: [],
    summary: `duration ${duration}`,
  }
}

function buildContext(findings: SymptomFinding[], attestations: AttestationMap = {}) {
  const phenomenology = {} as Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) phenomenology[domain] = []
  for (const f of findings) phenomenology[f.domain].push(f)
  return buildEvaluationContext({ phenomenology, coursePattern: makeCourse(), attestations })
}

function questionsFor(attestations: AttestationMap) {
  const evaluation = evaluateDisorder(depressiveEpisode, buildContext([], attestations))
  return buildCriterionQuestions(
    [{ disorder: depressiveEpisode, label: 'Depressive Episode', evaluation }],
    (key) => translateUi('de', key),
  )
}

describe('resolutionToAttestation', () => {
  it('maps present→met, absent→not_met, unclear→null (re-opens)', () => {
    expect(resolutionToAttestation('present')).toBe('met')
    expect(resolutionToAttestation('absent')).toBe('not_met')
    expect(resolutionToAttestation('unclear')).toBeNull()
  })
})

describe('answer → criterion resolution (deterministic feedback loop)', () => {
  it('a "Ja" answer flips the previously-unknown criterion to met', () => {
    const before = evaluateDisorder(depressiveEpisode, buildContext([]))
    const beforeResult = before.perCriterion.find((c) => c.criterionId === CRITERION)
    expect(beforeResult?.status).toBe('unknown')

    // present → met, recorded as a clinician attestation
    const attestations: AttestationMap = { [CRITERION]: resolutionToAttestation('present')! }
    const after = evaluateDisorder(depressiveEpisode, buildContext([], attestations))
    const afterResult = after.perCriterion.find((c) => c.criterionId === CRITERION)

    expect(afterResult?.status).toBe('met')
    expect(afterResult?.source).toBe('attested')
  })

  it('re-evaluation removes the answered question from the suggested list', () => {
    const open = questionsFor({})
    expect(open.some((q) => q.criterionId === CRITERION)).toBe(true)

    const resolved = questionsFor({ [CRITERION]: 'met' })
    expect(resolved.some((q) => q.criterionId === CRITERION)).toBe(false)
  })
})

describe('per-question answers aggregate onto one criterion (last answer wins)', () => {
  // The panel now renders an independent Ja/Nein/Unklar control next to EACH
  // interview question, but every phrasing probes the SAME criterion. The
  // aggregation rule: each answer is bridged to `question.criterionId`, so the
  // first present/absent resolves the criterion (last write wins) and the whole
  // group of phrasings drops off on re-evaluation.
  it('exposes several phrasings but a single criterion per gap', () => {
    const gap = questionsFor({}).find((q) => q.criterionId === CRITERION)
    expect(gap).toBeDefined()
    expect(gap!.interviewQuestions.length).toBeGreaterThan(1)
    // criterionId mirrors targetId — the answer key is unambiguous.
    expect(gap!.criterionId).toBe(gap!.targetId)
  })

  it('answering ANY of a criterion’s questions resolves the whole gap', () => {
    const gap = questionsFor({}).find((q) => q.criterionId === CRITERION)!
    // A "Ja" on any single phrasing bridges to the one shared criterion id.
    const attestation = resolutionToAttestation('present')!
    const resolved = questionsFor({ [gap.criterionId]: attestation })
    expect(resolved.some((q) => q.criterionId === CRITERION)).toBe(false)
  })
})

describe('clinician-override precedence', () => {
  it('a clinician answer overrides the deterministic auto-evaluation', () => {
    // Documentation alone would auto-resolve depressed mood to met …
    const auto = evaluateDisorder(depressiveEpisode, buildContext([finding('mood_affect', 'Gedrückt')]))
    const autoResult = auto.perCriterion.find((c) => c.criterionId === CRITERION)
    expect(autoResult?.status).toBe('met')
    expect(autoResult?.source).toBe('auto')

    // … but a clinician "Nein" (absent) overrides it to not_met.
    const overridden = evaluateDisorder(
      depressiveEpisode,
      buildContext([finding('mood_affect', 'Gedrückt')], { [CRITERION]: 'not_met' }),
    )
    const overriddenResult = overridden.perCriterion.find((c) => c.criterionId === CRITERION)
    expect(overriddenResult?.status).toBe('not_met')
    expect(overriddenResult?.source).toBe('attested')
  })
})

describe('finding-note store (PHI → vault-only, in-memory cache)', () => {
  const CASE = 'case-notes'
  const questionId = clinicalQuestionId('diagnosis_criteria', CRITERION)

  afterEach(() => clearClinicalQuestionNoteCache(CASE))

  it('upserts, loads and clears a finding note keyed by questionId', () => {
    setClinicalQuestionNote(
      { questionId, sectionId: 'diagnosis_criteria', targetId: CRITERION, note: '  seit 3 Wochen gedrückt  ' },
      CASE,
    )
    const stored = loadClinicalQuestionNoteState(CASE)[questionId]
    expect(stored?.note).toBe('seit 3 Wochen gedrückt') // trimmed
    expect(stored?.sectionId).toBe('diagnosis_criteria')
    expect(stored?.targetId).toBe(CRITERION)

    clearClinicalQuestionNote(questionId, CASE)
    expect(loadClinicalQuestionNoteState(CASE)[questionId]).toBeUndefined()
  })

  it('treats an empty note as a clear (never lingers)', () => {
    setClinicalQuestionNote(
      { questionId, sectionId: 'diagnosis_criteria', targetId: CRITERION, note: '   ' },
      CASE,
    )
    expect(loadClinicalQuestionNoteState(CASE)[questionId]).toBeUndefined()
  })

  it('round-trips through a vault restore (applyClinicalQuestionNoteState)', () => {
    const restored = {
      [questionId]: {
        questionId,
        sectionId: 'diagnosis_criteria' as const,
        targetId: CRITERION,
        note: 'aus Vault wiederhergestellt',
        updatedAt: new Date().toISOString(),
      },
    }
    applyClinicalQuestionNoteState(restored, CASE)
    expect(loadClinicalQuestionNoteState(CASE)[questionId]?.note).toBe('aus Vault wiederhergestellt')
  })
})
