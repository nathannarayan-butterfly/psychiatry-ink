import type { DiscussPackageContent, DiscussPackageSection } from '../../src/types/discussCase'

const IDENTIFIER_PATTERNS: RegExp[] = [
  /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, // dates
  /\b[A-Z]{2,3}[-\s]?\d{4,10}\b/g, // case/insurance numbers
  /\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, // phone
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // email
]

function redactIdentifiers(text: string, patientName?: string): string {
  let result = text
  if (patientName?.trim()) {
    const parts = patientName.trim().split(/\s+/).filter(Boolean)
    for (const part of parts) {
      if (part.length < 2) continue
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[REDACTED]')
    }
    const fullEscaped = patientName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(fullEscaped, 'gi'), '[REDACTED]')
  }
  for (const pattern of IDENTIFIER_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

function deidentifySection(section: DiscussPackageSection, patientName?: string): DiscussPackageSection {
  return {
    ...section,
    content: redactIdentifiers(section.content, patientName),
    label: redactIdentifiers(section.label, patientName),
  }
}

/**
 * Build a de-identified copy of a discussion package for external viewers.
 * Does not mutate the source package.
 */
export function deidentifyPackageContent(
  source: DiscussPackageContent,
  patientName?: string,
  patientLabel = 'Patient',
): DiscussPackageContent {
  return {
    ...source,
    patientLabel,
    isDeidentified: true,
    sections: source.sections.map((section) => deidentifySection(section, patientName)),
  }
}

/**
 * Return the package view appropriate for the viewer's permissions.
 */
export function resolvePackageForViewer(
  identified: DiscussPackageContent,
  deidentified: DiscussPackageContent,
  canViewIdentified: boolean,
): DiscussPackageContent {
  return canViewIdentified ? identified : deidentified
}
