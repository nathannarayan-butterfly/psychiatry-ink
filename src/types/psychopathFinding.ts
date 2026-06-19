import type { CourseDirection } from './clinicalImprint'
import type {
  PsychopathDomainAssessment,
  PsychopathExtractFields,
} from '../schemas/psychopath/extraction'

/** Provenance of a psychopathological finding entry. */
export type PsychopathFindingSource =
  | 'overview'
  | 'aufnahme'
  | 'import'
  | 'psychopath-page'
  | 'verlauf'
  | 'manual'

/** Versioned AI-extracted structured PPB snapshot (reviewable, keyed by source hash). */
export interface PsychopathAiStructuredSnapshot {
  version: 1
  sourceTextHash: string
  extractedAt: string
  /** When the clinician accepted the extraction into the overview display. */
  acceptedAt?: string
  status: 'pending' | 'accepted'
  fields: PsychopathExtractFields
  /** Tri-state AMDP domain assessments — primary structured output. */
  domains?: PsychopathDomainAssessment[]
  courseDirection: CourseDirection | null
  confidence: 'high' | 'medium' | 'low'
  mock?: boolean
}

/** One dated psychopathological finding (current or historical). */
export interface PsychopathFindingEntry {
  id: string
  /** Clinical date of the finding (ISO). */
  date: string
  text: string
  source: PsychopathFindingSource
  courseDirection: CourseDirection | null
  /** When the entry was saved to the overview store. */
  savedAt: string
}

/** Versioned overview psychopathology store — current finding + prior versions. */
export interface PsychopathFindingState {
  version: 1
  updatedAt: string
  current: PsychopathFindingEntry | null
  /** Prior findings, newest first. */
  history: PsychopathFindingEntry[]
  /** AI-extracted structured domains — cached by sourceTextHash. */
  aiStructured?: PsychopathAiStructuredSnapshot | null
}

export const PSYCHOPATH_FINDING_STATE_VERSION = 1 as const
