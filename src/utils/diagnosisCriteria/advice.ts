/**
 * Butterfly advice builder — turns a deterministic evaluation into localized
 * recommendations, never an asserted diagnosis. Output is always phrased as
 * "criteria met/not met — please review/confirm", keeping final control with
 * the clinician.
 */

import { translateUi, type UiTranslationKey } from '../../data/uiTranslations'
import type { UiLanguage } from '../../types/settings'
import type { Disorder } from '../../data/diagnosisCriteria/schema'
import type { DisorderEvaluation, DisorderVerdict } from './evaluateDisorder'

export type AdviceTone = 'met' | 'not_met' | 'insufficient'

export interface DisorderAdvice {
  tone: AdviceTone
  /** Localized one-line recommendation headline. */
  headline: string
  /** Missing/open inclusion criteria (localized), for the "please review" detail. */
  missing: string[]
}

const ADVICE_HEADLINE_KEYS: Record<AdviceTone, UiTranslationKey> = {
  met: 'butterflyAdviceCriteriaMet',
  not_met: 'butterflyAdviceNotMet',
  insufficient: 'butterflyAdviceInsufficient',
}

function classificationLabel(disorder: Pick<Disorder, 'classification'>): string {
  return disorder.classification === 'icd11' ? 'ICD-11' : 'ICD-10'
}

function toneForVerdict(verdict: DisorderVerdict): AdviceTone {
  if (verdict === 'criteria_met') return 'met'
  if (verdict === 'not_met') return 'not_met'
  return 'insufficient'
}

function applyPlaceholders(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(value),
    template,
  )
}

export function buildDisorderAdvice(
  evaluation: DisorderEvaluation,
  disorder: Pick<Disorder, 'classification'>,
  language: UiLanguage = 'de',
): DisorderAdvice {
  const system = classificationLabel(disorder)
  const name = evaluation.name_de
  const tone = toneForVerdict(evaluation.verdict)
  const template = translateUi(language, ADVICE_HEADLINE_KEYS[tone])
  const headline = applyPlaceholders(template, { system, name })

  return { tone, headline, missing: evaluation.criteriaMissing }
}
