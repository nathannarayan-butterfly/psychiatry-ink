/**
 * Strip common identifier patterns from clinical imprint evidence text.
 * Conservative: imprints must never retain patient names, DOB, or contact data.
 */

const REDACTED = '[redacted]'

const PATTERNS: RegExp[] = [
  // Email
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // Phone (DE/international-ish)
  /(?:\+49|0049|0)\s*[\d\s\-/()]{6,18}/g,
  // ISO and German DOB
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g,
  // Salutation + surname
  /\b(?:Herr|Frau|Hr\.|Fr\.)\s+[A-ZÄÖÜ][a-zäöüß-]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)?\b/g,
  // Patient + name token
  /\b(?:Patient|Patientin)\s+[A-ZÄÖÜ][a-zäöüß-]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)?\b/g,
  // KVNR / Versichertennummer
  /\b[A-Z]\d{9}\b/g,
  /\b\d{10}\b/g,
  // Aktenzeichen / case file numbers with label
  /\b(?:Aktenzeichen|AZ|Fallnummer|Patienten[- ]?Nr\.?)\s*[:#]?\s*[\w/-]+/gi,
]

export function redactIdentifierPatterns(text: string): string {
  if (!text.trim()) return text

  let result = text
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, REDACTED)
  }
  return result.replace(/\s{2,}/g, ' ').trim()
}
