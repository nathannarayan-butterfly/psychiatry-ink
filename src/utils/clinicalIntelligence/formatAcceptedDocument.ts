/**
 * Clinical Intelligence — human-readable document text for accepted findings.
 */

import type { UiLanguage } from '../../types/settings'
import type {
  CiConfidence,
  CiReviewStatus,
  ClinicalIntelligenceRunResponse,
  DimensionalFinding,
  MechanismHypothesis,
} from '../../types/clinicalIntelligence'

export const CI_DOCUMENT_PAGE_TYPE = 'clinical-intelligence-report'

export interface CiAcceptedDocumentLabels {
  titlePrefix: string
  headerCase: string
  headerRunDate: string
  headerSavedDate: string
  clinicianComment: string
  sectionDimensions: string
  sectionMechanisms: string
  severity: string
  confidence: string
  clinicalSummary: string
  longitudinalPattern: string
  uncertainty: string
  missingData: string
  clinicalImplication: string
  treatmentRelevance: string
  statusAccepted: string
  statusEdited: string
  disclaimer: string
  noAcceptedDimensions: string
  noAcceptedMechanisms: string
  confidenceLow: string
  confidenceModerate: string
  confidenceHigh: string
}

function isReviewedFinding(status: CiReviewStatus): boolean {
  return status === 'accepted' || status === 'edited'
}

function formatConfidence(confidence: CiConfidence, labels: CiAcceptedDocumentLabels): string {
  switch (confidence) {
    case 'low':
      return labels.confidenceLow
    case 'moderate':
      return labels.confidenceModerate
    case 'high':
      return labels.confidenceHigh
  }
}

function formatReviewStatus(status: CiReviewStatus, labels: CiAcceptedDocumentLabels): string {
  return status === 'edited' ? labels.statusEdited : labels.statusAccepted
}

function formatTimestamp(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatDimensionSection(
  finding: DimensionalFinding,
  labels: CiAcceptedDocumentLabels,
): string {
  const lines = [
    `## ${finding.dimensionName} (${formatReviewStatus(finding.reviewStatus, labels)})`,
    `${labels.severity}: ${finding.severity}/4`,
    `${labels.confidence}: ${formatConfidence(finding.confidence, labels)}`,
    `${labels.clinicalSummary}: ${finding.clinicalSummary}`,
  ]
  if (finding.longitudinalPattern.trim()) {
    lines.push(`${labels.longitudinalPattern}: ${finding.longitudinalPattern.trim()}`)
  }
  if (finding.uncertainty.trim()) {
    lines.push(`${labels.uncertainty}: ${finding.uncertainty.trim()}`)
  }
  if (finding.missingData.trim()) {
    lines.push(`${labels.missingData}: ${finding.missingData.trim()}`)
  }
  return lines.join('\n')
}

function formatMechanismSection(
  finding: MechanismHypothesis,
  labels: CiAcceptedDocumentLabels,
): string {
  const lines = [
    `## ${finding.label} (${formatReviewStatus(finding.reviewStatus, labels)})`,
    `${labels.confidence}: ${formatConfidence(finding.confidence, labels)}`,
    `${labels.clinicalImplication}: ${finding.clinicalImplication}`,
    `${labels.treatmentRelevance}: ${finding.treatmentRelevance}`,
  ]
  if (finding.uncertainty.trim()) {
    lines.push(`${labels.uncertainty}: ${finding.uncertainty.trim()}`)
  }
  return lines.join('\n')
}

export function formatCiAcceptedDocumentTitle(
  savedAt: string,
  locale: UiLanguage,
  titlePrefix: string,
): string {
  const dateLabel = formatTimestamp(savedAt, locale).split(',')[0]?.trim() ?? savedAt.slice(0, 10)
  return `${titlePrefix} — ${dateLabel}`
}

export function formatCiAcceptedDocumentContent(params: {
  caseId: string
  run: ClinicalIntelligenceRunResponse
  clinicianComment: string
  savedAt: string
  labels: CiAcceptedDocumentLabels
  locale: UiLanguage
}): string {
  const { caseId, run, clinicianComment, savedAt, labels, locale } = params
  const acceptedDimensions = run.dimensional.activeDimensions.filter((d) =>
    isReviewedFinding(d.reviewStatus),
  )
  const acceptedMechanisms = run.mechanism.activeMechanisms.filter((m) =>
    isReviewedFinding(m.reviewStatus),
  )

  const sections: string[] = [
    labels.titlePrefix,
    '='.repeat(Math.min(labels.titlePrefix.length, 48)),
    '',
    `${labels.headerCase}: ${caseId}`,
    `${labels.headerRunDate}: ${formatTimestamp(run.builtAt, locale)}`,
    `${labels.headerSavedDate}: ${formatTimestamp(savedAt, locale)}`,
    '',
  ]

  const comment = clinicianComment.trim()
  if (comment) {
    sections.push(labels.clinicianComment, '-'.repeat(labels.clinicianComment.length), comment, '')
  }

  sections.push(labels.sectionDimensions, '-'.repeat(labels.sectionDimensions.length), '')
  if (acceptedDimensions.length === 0) {
    sections.push(labels.noAcceptedDimensions, '')
  } else {
    sections.push(acceptedDimensions.map((d) => formatDimensionSection(d, labels)).join('\n\n'), '')
  }

  sections.push(labels.sectionMechanisms, '-'.repeat(labels.sectionMechanisms.length), '')
  if (acceptedMechanisms.length === 0) {
    sections.push(labels.noAcceptedMechanisms, '')
  } else {
    sections.push(acceptedMechanisms.map((m) => formatMechanismSection(m, labels)).join('\n\n'), '')
  }

  sections.push('---', labels.disclaimer)

  return sections.join('\n').trimEnd()
}
