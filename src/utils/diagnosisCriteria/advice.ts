/**
 * Butterfly advice builder — turns a deterministic evaluation into German
 * Empfehlungen (advice), never an asserted diagnosis. Output is always phrased
 * as "Kriterien … erfüllt/nicht erfüllt — bitte prüfen/ergänzen", keeping final
 * control with the clinician.
 */

import type { Disorder } from '../../data/diagnosisCriteria/schema'
import type { DisorderEvaluation, DisorderVerdict } from './evaluateDisorder'

export type AdviceTone = 'met' | 'not_met' | 'insufficient'

export interface DisorderAdvice {
  tone: AdviceTone
  /** German one-line Empfehlung. */
  headline: string
  /** Missing/open inclusion criteria (German), for the "bitte prüfen" detail. */
  missing: string[]
}

function classificationLabel(disorder: Pick<Disorder, 'classification'>): string {
  return disorder.classification === 'icd11' ? 'ICD-11' : 'ICD-10'
}

function toneForVerdict(verdict: DisorderVerdict): AdviceTone {
  if (verdict === 'criteria_met') return 'met'
  if (verdict === 'not_met') return 'not_met'
  return 'insufficient'
}

export function buildDisorderAdvice(
  evaluation: DisorderEvaluation,
  disorder: Pick<Disorder, 'classification'>,
): DisorderAdvice {
  const system = classificationLabel(disorder)
  const name = evaluation.name_de
  const tone = toneForVerdict(evaluation.verdict)

  let headline: string
  switch (tone) {
    case 'met':
      headline = `Laut ${system} sind die Kriterien für ${name} nach dokumentierter Datenlage erfüllt — bitte klinisch bestätigen.`
      break
    case 'not_met':
      headline = `Laut ${system} sind die Kriterien für ${name} nach dokumentierter Datenlage nicht erfüllt — bitte prüfen oder weitere Daten ergänzen.`
      break
    case 'insufficient':
      headline = `Für ${name} liegen noch nicht genügend strukturierte Daten vor — bitte weitere Befunde ergänzen oder Kriterien bestätigen.`
      break
  }

  return { tone, headline, missing: evaluation.criteriaMissing }
}
