/**
 * Build compact CI discuss context — de-identified summaries only.
 *
 * Never includes raw clinical documents or full evidence text bodies.
 */

import type {
  ClinicalIntelligenceCaseState,
  ClinicalIntelligenceDiscussContext,
  CompactEvidencePayload,
} from '../../types/clinicalIntelligence'

const EVIDENCE_SUMMARY_MAX = 320

function truncateSummary(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= EVIDENCE_SUMMARY_MAX) return trimmed
  return `${trimmed.slice(0, EVIDENCE_SUMMARY_MAX - 1)}…`
}

function collectEvidenceIds(state: ClinicalIntelligenceCaseState): Set<string> {
  const ids = new Set<string>()
  const run = state.latestRun
  if (!run) return ids
  for (const dim of run.dimensional.activeDimensions) {
    for (const id of dim.supportingEvidenceIds) ids.add(id)
    for (const id of dim.contradictingEvidenceIds) ids.add(id)
  }
  for (const mech of run.mechanism.activeMechanisms) {
    for (const id of mech.supportingEvidenceIds) ids.add(id)
    for (const id of mech.contradictingEvidenceIds) ids.add(id)
  }
  return ids
}

export function buildClinicalIntelligenceDiscussContext(
  state: ClinicalIntelligenceCaseState,
  evidence: CompactEvidencePayload | null,
  language: 'de' | 'en' | 'fr' | 'es',
): ClinicalIntelligenceDiscussContext | null {
  const run = state.latestRun
  if (!run) return null

  const referencedIds = collectEvidenceIds(state)
  const evidenceItems =
    evidence?.items
      .filter((item) => referencedIds.has(item.id))
      .map((item) => ({
        id: item.id,
        label: item.label,
        category: item.category,
        summary: truncateSummary(item.text),
      })) ?? []

  const dimensions = run.dimensional.activeDimensions
    .filter((d) => d.source === 'evidence_based')
    .filter((d) => d.reviewStatus !== 'rejected')
    .map((d) => ({
      dimensionId: d.dimensionId,
      dimensionName: d.dimensionName,
      severity: d.severity,
      confidence: d.confidence,
      reviewStatus: d.reviewStatus,
      clinicalSummary: d.clinicalSummary,
      supportingEvidenceIds: d.supportingEvidenceIds,
    }))

  const mechanisms = run.mechanism.activeMechanisms
    .filter((m) => m.source === 'evidence_based')
    .filter((m) => m.reviewStatus !== 'rejected')
    .map((m) => ({
      mechanismId: m.mechanismId,
      label: m.label,
      confidence: m.confidence,
      reviewStatus: m.reviewStatus,
      clinicalImplication: m.clinicalImplication,
      linkedDimensions: m.linkedDimensions,
      supportingEvidenceIds: m.supportingEvidenceIds,
    }))

  return {
    caseId: state.caseId,
    language,
    builtAt: run.builtAt,
    clinicianComment: state.clinicianComment,
    dimensions,
    mechanisms,
    evidenceItems,
  }
}

/** Guard for tests — context must never carry raw document field names. */
export const CI_DISCUSS_FORBIDDEN_FIELDS = [
  'documents',
  'documentTypeId',
  'editorContent',
  'sectionContents',
  'patientMetadata',
  'identifiedPackageContent',
  'medicationPlanState',
  'pageHeading',
  'text',
] as const

export function assertDiscussContextCompact(value: unknown): void {
  const json = JSON.stringify(value)
  for (const field of CI_DISCUSS_FORBIDDEN_FIELDS) {
    if (json.includes(`"${field}"`)) {
      throw new Error(`Discuss context must not include forbidden field "${field}"`)
    }
  }
}
