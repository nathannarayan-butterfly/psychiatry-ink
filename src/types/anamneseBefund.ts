import type { GuidedEntryFieldValues } from './guidedEntry'

/** Aufnahme section ids for embedded somatic / neurological exam subsections. */
export const AUFNAHME_SOMATISCHER_BEFUND_SECTION_ID = 'somatischer-befund'
export const AUFNAHME_NEUROLOGISCHER_BEFUND_SECTION_ID = 'neurologischer-befund'
/** Aufnahme section id for the embedded psychopathological exam subsection. */
export const AUFNAHME_PSYCHOPATH_BEFUND_SECTION_ID = 'psychopathologischer-befund'

export const AUFNAHME_BEFUND_SECTION_IDS = [
  AUFNAHME_SOMATISCHER_BEFUND_SECTION_ID,
  AUFNAHME_NEUROLOGISCHER_BEFUND_SECTION_ID,
] as const

export type AufnahmeBefundSectionId = (typeof AUFNAHME_BEFUND_SECTION_IDS)[number]

/**
 * Entry modes for the structured Aufnahme subsections.
 * - somatic/neuro use `short | long | guided`
 * - psychopath uses `short (Kurz) | amdp | guided (Geführt) | free (Freitext)`
 */
export type AufnahmeBefundInputMode = 'short' | 'long' | 'guided' | 'amdp' | 'free'

export interface AufnahmeSectionMetadata {
  inputMode: AufnahmeBefundInputMode
  /** Structured answers for long / guided modes — used by Neu generieren. */
  structuredAnswers?: GuidedEntryFieldValues
  generatedAt?: string
  /** True after user edits generated text in the section textarea. */
  manuallyEdited?: boolean
}

export function isAufnahmeBefundSection(sectionId: string): sectionId is AufnahmeBefundSectionId {
  return (AUFNAHME_BEFUND_SECTION_IDS as readonly string[]).includes(sectionId)
}

export function isAufnahmePsychopathSection(sectionId: string): boolean {
  return sectionId === AUFNAHME_PSYCHOPATH_BEFUND_SECTION_ID
}

/**
 * Sections that carry structured entry metadata (mode + manual-edit tracking):
 * the somatic/neuro Befund plus the Psychopathologischer Befund.
 */
export function isAufnahmeStructuredSection(sectionId: string): boolean {
  return isAufnahmeBefundSection(sectionId) || isAufnahmePsychopathSection(sectionId)
}
