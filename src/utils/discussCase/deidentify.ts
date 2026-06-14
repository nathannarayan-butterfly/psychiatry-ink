import type { DiscussPackageContent, DiscussPackageSection } from '../../types/discussCase'

const IDENTIFIER_PATTERNS: RegExp[] = [
  /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g,
  /\b[A-Z]{2,3}[-\s]?\d{4,10}\b/g,
  /\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
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
