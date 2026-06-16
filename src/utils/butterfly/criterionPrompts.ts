/**
 * Butterfly Feature-A helpers: turn unresolved (`unknown`) criteria into
 * actionable, per-criterion clinician prompts and deep-links.
 */

import type { NotionPageId } from '../../components/notion/notionPages'
import type { Disorder } from '../../data/diagnosisCriteria'
import type { DisorderEvaluation } from '../diagnosisCriteria/evaluateDisorder'
import type { ButterflyCriterionQuery } from '../../services/butterflyExtractApi'
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
}

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
 * Derive the "suggested questions" STRICTLY from the deterministic criteria-gap
 * analysis: for each clinician-entered diagnosis, every criterion still resolving
 * to `unknown` becomes one targeted question ("to assess criterion X for
 * [diagnosis] …"). Localized through the passed `translate` fn (German under the
 * German locale). Only clinician-entered diagnoses are considered — never
 * arbitrary differentials — and nothing generic/open-ended is produced.
 *
 * Resolved criteria (met/not_met, incl. clinician-attested) are excluded, so an
 * answered question disappears on the next re-evaluation — that is the feedback
 * loop's "drops off the list" behaviour.
 */
export function buildCriterionQuestions(
  diagnoses: EnteredDiagnosisEvaluation[],
  translate: (key: UiTranslationKey) => string,
  limit: number = MAX_CRITERION_QUESTIONS,
): ButterflyCriterionQuestion[] {
  const promptTemplate = translate('butterflyQuestionPrompt')
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
      out.push({
        id,
        sectionId: 'diagnosis_criteria',
        targetId: result.criterionId,
        disorderId: disorder.id,
        criterionId: result.criterionId,
        question: applyTemplate(promptTemplate, values),
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
