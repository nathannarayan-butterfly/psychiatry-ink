/**
 * Butterfly Feature-A helpers: turn unresolved (`unknown`) criteria into
 * actionable, per-criterion clinician prompts and deep-links.
 */

import type { NotionPageId } from '../../components/notion/notionPages'
import type { Disorder } from '../../data/diagnosisCriteria'
import { formatCriterionCitation } from '../../data/diagnosisCriteria'
import type { DisorderEvaluation } from '../diagnosisCriteria/evaluateDisorder'
import type { ButterflyCriterionQuery } from '../../services/butterflyExtractApi'
import type { InterviewQuestionCriterion } from '../../services/interviewQuestionsApi'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { ClinicalQuestion } from '../clinicalQuestions/types'
import { clinicalQuestionId } from '../clinicalQuestions/ids'

/** Map a criterion's documentation deep-link hint to a workspace page id. */
const HINT_PAGE_MAP: Record<string, NotionPageId> = {
  psychopathologie: 'psychopath',
  psychopath: 'psychopath',
  anamnese: 'aufnahme',
  aufnahme: 'aufnahme',
  verlauf: 'verlauf',
}

/** Unresolved inclusion/exclusion criteria (status `unknown`) for one disorder. */
export function selectUnresolvedCriteria(evaluation: DisorderEvaluation): ButterflyCriterionQuery[] {
  const seen = new Set<string>()
  const out: ButterflyCriterionQuery[] = []
  for (const result of evaluation.perCriterion) {
    if (result.status !== 'unknown') continue
    if (seen.has(result.criterionId)) continue
    seen.add(result.criterionId)
    out.push({ id: result.criterionId, text: result.text_de })
  }
  return out
}

/**
 * Unresolved criteria packaged for interview-question generation — adds the
 * language-neutral citation string for prompt grounding. Carries only generic
 * (non-PHI) reference content.
 */
export function selectUnresolvedInterviewCriteria(
  evaluation: DisorderEvaluation,
): InterviewQuestionCriterion[] {
  const seen = new Set<string>()
  const out: InterviewQuestionCriterion[] = []
  for (const result of evaluation.perCriterion) {
    if (result.status !== 'unknown') continue
    if (seen.has(result.criterionId)) continue
    seen.add(result.criterionId)
    const citation = formatCriterionCitation(result.citation)
    out.push({
      id: result.criterionId,
      text: result.text_de,
      ...(citation ? { citation } : {}),
    })
  }
  return out
}

/** The workspace page a clinician should open to document a given criterion. */
export function resolveDeepLinkPage(disorder: Disorder, criterionId: string): NotionPageId | undefined {
  for (const group of disorder.groups) {
    const criterion = group.criteria.find((item) => item.id === criterionId)
    if (!criterion) continue
    for (const hint of criterion.mappingHints) {
      if (hint.deepLinkPageId && HINT_PAGE_MAP[hint.deepLinkPageId]) {
        return HINT_PAGE_MAP[hint.deepLinkPageId]
      }
    }
  }
  return undefined
}

/** Maximum number of suggested questions rendered at once (keeps the panel scannable). */
const MAX_CRITERION_QUESTIONS = 12

/**
 * A localized, criterion-targeted interview question. Every question maps to a
 * single still-`unknown` criterion of a clinician-entered diagnosis — there are
 * NO generic, open-ended or differential-driven questions here.
 *
 * It is a {@link ClinicalQuestion} with `sectionId: 'diagnosis_criteria'` and
 * `targetId` = the criterion id, plus diagnosis-specific provenance fields the
 * panel uses to bridge an answer to the clinician-attestation store.
 */
export interface ButterflyCriterionQuestion extends ClinicalQuestion {
  /** The disorder whose criterion this question resolves. */
  disorderId: string
  /** The criterion id this question resolves (mirror of `targetId`). */
  criterionId: string
  /** Localized criterion text this question probes (the open gap). */
  criterionLabel: string
  /**
   * 1–3 CONCRETE, patient-directed interview questions a clinician can ask the
   * patient verbatim to elicit evidence for this criterion. The patient's answer
   * (Ja/Nein/Unklar) maps back to the single criterion via `targetId`. `question`
   * mirrors the first entry for {@link ClinicalQuestion} compatibility.
   */
  interviewQuestions: string[]
}

/** Questions for one clinician-entered diagnosis, grouped for panel rendering. */
export interface ButterflyDiagnosisQuestionGroup {
  disorderId: string
  /** Clinician-facing diagnosis label (falls back to disorder name). */
  label: string
  /** Version-resolved ICD code for the active coding system. */
  code: string
  questions: ButterflyCriterionQuestion[]
}

/**
 * Resolve the concrete interview questions for a criterion from the
 * (LLM-generated, cached) store. Returns `undefined` when none are cached yet,
 * in which case {@link buildCriterionQuestions} uses a deterministic template.
 */
export type InterviewQuestionResolver = (input: {
  disorderId: string
  version: number
  criterionId: string
  criterionText: string
}) => string[] | undefined

/** One clinician-entered diagnosis plus its deterministic evaluation. */
export interface EnteredDiagnosisEvaluation {
  disorder: Disorder
  /** Clinician-facing label (falls back to the disorder name). */
  label: string
  evaluation: DisorderEvaluation
}

function applyTemplate(template: string, values: { criterion: string; diagnosis: string }): string {
  return template
    .split('{criterion}')
    .join(values.criterion)
    .split('{diagnosis}')
    .join(values.diagnosis)
}

/**
 * Deterministic, templated patient-interview questions derived from the
 * criterion text. Used as the instant client-side fallback before the LLM
 * resolves (and offline). Licensing-safe, original wording — mirrors the
 * server-side mock fallback so the panel is always concrete.
 */
export function buildFallbackInterviewQuestions(
  criterionText: string,
  translate: (key: UiTranslationKey) => string,
): string[] {
  const clean = criterionText.trim().replace(/[.;]+$/, '')
  const values = { criterion: clean, diagnosis: '' }
  return [
    applyTemplate(translate('butterflyInterviewFallback1'), values),
    applyTemplate(translate('butterflyInterviewFallback2'), values),
  ]
}

/**
 * Derive the "suggested questions" STRICTLY from the deterministic criteria-gap
 * analysis: for each clinician-entered diagnosis, every criterion still resolving
 * to `unknown` yields a group of 1–3 CONCRETE, patient-directed interview
 * questions the clinician can ask the patient to elicit evidence for THAT
 * criterion. The questions come from the LLM (resolved via `resolveInterview`)
 * and fall back to a deterministic German template until/if the LLM resolves.
 * Localized through the passed `translate` fn. Only clinician-entered diagnoses
 * are considered — never arbitrary differentials.
 *
 * Resolved criteria (met/not_met, incl. clinician-attested) are excluded, so an
 * answered criterion's questions disappear on the next re-evaluation — that is
 * the feedback loop's "drops off the list" behaviour.
 */
export function buildCriterionQuestions(
  diagnoses: EnteredDiagnosisEvaluation[],
  translate: (key: UiTranslationKey) => string,
  resolveInterview?: InterviewQuestionResolver,
  limit: number = MAX_CRITERION_QUESTIONS,
): ButterflyCriterionQuestion[] {
  const rationaleTemplate = translate('butterflyQuestionRationale')
  const out: ButterflyCriterionQuestion[] = []
  const seen = new Set<string>()

  for (const { disorder, label, evaluation } of diagnoses) {
    const diagnosisLabel = label.trim() || disorder.name_de
    for (const result of evaluation.perCriterion) {
      if (result.status !== 'unknown') continue
      if (seen.has(result.criterionId)) continue
      seen.add(result.criterionId)
      const id = clinicalQuestionId('diagnosis_criteria', result.criterionId)
      const values = { criterion: result.text_de, diagnosis: diagnosisLabel }
      const resolved = resolveInterview?.({
        disorderId: disorder.id,
        version: disorder.version,
        criterionId: result.criterionId,
        criterionText: result.text_de,
      })
      const interviewQuestions =
        resolved && resolved.length > 0
          ? resolved.slice(0, 3)
          : buildFallbackInterviewQuestions(result.text_de, translate)
      out.push({
        id,
        sectionId: 'diagnosis_criteria',
        targetId: result.criterionId,
        disorderId: disorder.id,
        criterionId: result.criterionId,
        criterionLabel: result.text_de,
        question: interviewQuestions[0],
        interviewQuestions,
        rationale: applyTemplate(rationaleTemplate, values),
        priority: 'medium',
        deepLinkPageId: resolveDeepLinkPage(disorder, result.criterionId),
        // A Ja/Nein answer only flips the evaluation for attestable criteria.
        resolvable: result.attestable,
      })
      if (out.length >= limit) return out
    }
  }

  return out
}

/** Metadata for one entered diagnosis when grouping questions. */
export interface DiagnosisQuestionGroupInput {
  disorderId: string
  label: string
  code: string
}

/**
 * Group flat criterion questions under their clinician-entered diagnoses,
 * preserving the diagnosis iteration order from the caller.
 */
export function groupCriterionQuestionsByDiagnosis(
  questions: ButterflyCriterionQuestion[],
  diagnoses: DiagnosisQuestionGroupInput[],
): ButterflyDiagnosisQuestionGroup[] {
  if (questions.length === 0) return []

  const byDisorder = new Map<string, ButterflyCriterionQuestion[]>()
  for (const question of questions) {
    const list = byDisorder.get(question.disorderId) ?? []
    list.push(question)
    byDisorder.set(question.disorderId, list)
  }

  const groups: ButterflyDiagnosisQuestionGroup[] = []
  const seen = new Set<string>()

  for (const { disorderId, label, code } of diagnoses) {
    if (seen.has(disorderId)) continue
    const disorderQuestions = byDisorder.get(disorderId)
    if (!disorderQuestions || disorderQuestions.length === 0) continue
    seen.add(disorderId)
    groups.push({
      disorderId,
      label,
      code,
      questions: disorderQuestions,
    })
  }

  return groups
}
