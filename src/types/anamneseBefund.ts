import type { GuidedEntryFieldValues } from './guidedEntry'

/** Aufnahme section ids for embedded somatic / neurological exam subsections. */
export const AUFNAHME_SOMATISCHER_BEFUND_SECTION_ID = 'somatischer-befund'
export const AUFNAHME_NEUROLOGISCHER_BEFUND_SECTION_ID = 'neurologischer-befund'

export const AUFNAHME_BEFUND_SECTION_IDS = [
  AUFNAHME_SOMATISCHER_BEFUND_SECTION_ID,
  AUFNAHME_NEUROLOGISCHER_BEFUND_SECTION_ID,
] as const

export type AufnahmeBefundSectionId = (typeof AUFNAHME_BEFUND_SECTION_IDS)[number]

export type AufnahmeBefundInputMode = 'short' | 'long' | 'guided'

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
