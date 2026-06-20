import type { DiscussPackageContent, DiscussPackageSection } from '../../src/types/discussCase'

/**
 * Identifier patterns that are scrubbed from any free-text field before it
 * leaves the trust boundary toward an external LLM provider. Each pattern is
 * intentionally conservative — false positives are preferable to PHI leakage.
 *
 * Used by:
 *  - {@link deidentifyText} (this module)
 *  - {@link deidentifyPackageContent} (this module)
 *  - {@link sanitizeLlmPayload} in `server/services/safeLlmEgress.ts`
 */
export const IDENTIFIER_PATTERNS: RegExp[] = [
  // German numeric dates: DD.MM.YYYY / DD.MM.YY
  /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g,
  // ISO 8601 date: YYYY-MM-DD
  /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
  // Slash dates: DD/MM/YYYY (and 2-digit year variant)
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  // Hyphen DMY dates: DD-MM-YYYY (avoid colliding with ISO via the 4-digit year being last)
  /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
  // German month names with day + year: e.g. "12. April 1978" / "12 Januar 1978"
  /\b\d{1,2}\.?\s?(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{2,4}\b/gi,
  // English month names with day + year: "12 April 1978", "April 12, 1978"
  /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4}\b/gi,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{2,4}\b/gi,
  // Case / insurance / institution-style identifiers (AOK / TK / AZ / DEMO …)
  /\b[A-Z]{2,3}[-\s]?\d{4,10}\b/g,
  // KVNR (new German Krankenversichertennummer) — 1 letter + 9 digits.
  /\b[A-Z]\d{9}\b/g,
  // International phone with country code: "+49 30 1234567", "+1-555-123-4567"
  /\+\d{1,3}[\s./-]?\d{2,5}[\s./-]?\d{3,10}(?:[\s./-]?\d{2,10})?/g,
  // Generic phone (DE / 3-segment) fallback: "030-123 4567"
  /\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
  // Email addresses
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  // RFC-4122 UUIDs (often used as case IDs)
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // DEMO-* / AZ-* style internal case refs
  /\bDEMO[-_][A-Z0-9-]+\b/gi,
]

/**
 * Authoritative, server-side de-identification of a free-text string.
 *
 * Reuses the same identifier patterns as the package redactor so every
 * LLM-bound free-text path (discuss-case questions, clinical/lab notes) can be
 * scrubbed before prompt assembly. The client `is_deidentified` claim is never
 * trusted — this is recomputed here regardless of what the client asserts.
 */
export function deidentifyText(text: string, patientName?: string): string {
  if (!text) return text
  return redactIdentifiers(text, patientName)
}

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
