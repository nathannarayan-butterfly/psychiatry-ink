import type { PatientCombinationCheckFinding } from '../../types/combinationCheck'
import type { MedicationEducationEvidenceBundle } from '../../types/medicationEducation'

/**
 * Extract combination risks for education synthesis — never concatenate leaflets.
 */
export function extractCombinationRisksFromFindings(
  findings: PatientCombinationCheckFinding[],
): MedicationEducationEvidenceBundle['combinationRisks'] {
  return findings
    .filter((f) => f.isRelevant !== false && f.status !== 'rejected' && f.status !== 'not_relevant')
    .map((f) => ({
      substances: `${f.substanceAName} + ${f.substanceBName}`,
      severity: f.severity,
      mainRisk: f.mainRisk,
      monitoring: f.monitoring,
      clinicalManagement: f.clinicalManagement,
      source: f.source,
    }))
}

export function buildCombinationRiskSummary(
  risks: MedicationEducationEvidenceBundle['combinationRisks'],
): string {
  if (risks.length === 0) return ''
  return risks
    .map((r) => `[${r.severity}] ${r.substances}: ${r.mainRisk}`)
    .join('\n')
}

export function requiresCombinationSynthesis(scope: MedicationEducationEvidenceBundle['scope']): boolean {
  return scope === 'full_combination' || scope === 'selected'
}

export function validateCombinationSynthesisFlag(bundle: MedicationEducationEvidenceBundle): boolean {
  if (!requiresCombinationSynthesis(bundle.scope)) return !bundle.requiresCombinationSynthesis
  return bundle.requiresCombinationSynthesis === true
}
