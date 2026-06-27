/**
 * Overlay locale-specific demo narratives at display time.
 *
 * Live CI runs already return text in the requested `language` (see prompts.ts).
 * Pre-baked demo runs persist English; this helper swaps narrative fields without
 * mutating stored state. Clinician-edited findings are left unchanged.
 */

import {
  getDemoDimensionalExploratory,
  getDemoDimensionalNarrative,
  getDemoMechanismNarrative,
} from '../../data/clinicalIntelligenceNarratives'
import type { UiLanguage } from '../../types/settings'
import type {
  ClinicalIntelligenceRunResponse,
  DimensionalFinding,
  MechanismHypothesis,
} from '../../types/clinicalIntelligence'

export function isDemoClinicalIntelligenceRun(run: ClinicalIntelligenceRunResponse): boolean {
  return (
    run.diagnostics.dimensional?.provider === 'demo' ||
    run.diagnostics.mechanism?.provider === 'demo'
  )
}

function localizeDimensionalFinding(
  finding: DimensionalFinding,
  language: UiLanguage,
): DimensionalFinding {
  if (finding.reviewStatus === 'edited') return finding
  const narrative = getDemoDimensionalNarrative(finding.dimensionId, language)
  if (!narrative) return finding
  return {
    ...finding,
    clinicalSummary: narrative.clinicalSummary,
    longitudinalPattern: narrative.longitudinalPattern,
    uncertainty: narrative.uncertainty,
    missingData: narrative.missingData,
  }
}

function localizeMechanismHypothesis(
  hypothesis: MechanismHypothesis,
  language: UiLanguage,
): MechanismHypothesis {
  if (hypothesis.reviewStatus === 'edited') return hypothesis
  const narrative = getDemoMechanismNarrative(hypothesis.mechanismId, language)
  if (!narrative) return hypothesis
  return {
    ...hypothesis,
    clinicalImplication: narrative.clinicalImplication,
    treatmentRelevance: narrative.treatmentRelevance,
    uncertainty: narrative.uncertainty,
  }
}

/** Return a display copy of a CI run with demo narratives in the requested language. */
export function localizeClinicalIntelligenceRunForDisplay(
  run: ClinicalIntelligenceRunResponse,
  language: UiLanguage,
): ClinicalIntelligenceRunResponse {
  if (!isDemoClinicalIntelligenceRun(run)) {
    return run
  }

  return {
    ...run,
    language,
    dimensional: {
      ...run.dimensional,
      activeDimensions: run.dimensional.activeDimensions.map((finding) =>
        localizeDimensionalFinding(finding, language),
      ),
      exploratoryInsufficientEvidence:
        run.dimensional.exploratoryInsufficientEvidence.length > 0
          ? [getDemoDimensionalExploratory(language)]
          : [],
    },
    mechanism: {
      ...run.mechanism,
      activeMechanisms: run.mechanism.activeMechanisms.map((hypothesis) =>
        localizeMechanismHypothesis(hypothesis, language),
      ),
    },
  }
}
