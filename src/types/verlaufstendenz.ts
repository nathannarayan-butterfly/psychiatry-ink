/** Overall course-tendency category for the Verlaufstendenz overview module. */
export type VerlaufstendenzTrend =
  | 'deutlich_gebessert'
  | 'leicht_gebessert'
  | 'stabil'
  | 'schwankend'
  | 'leicht_verschlechtert'
  | 'deutlich_verschlechtert'
  | 'kritisch_handlungsrelevant'
  | 'nicht_beurteilbar'

/** Criteria domain scored independently before aggregation. */
export type VerlaufstendenzDomain =
  | 'safety_risk'
  | 'core_psychopathology'
  | 'ward_behavior'
  | 'sleep_drive_affect'
  | 'insight_compliance'
  | 'somatic_side_effects'
  | 'social_functioning'

/** Per-domain directional assessment. */
export type VerlaufstendenzDomainDirection =
  | 'deutlich_gebessert'
  | 'leicht_gebessert'
  | 'stabil'
  | 'leicht_verschlechtert'
  | 'deutlich_verschlechtert'
  | 'gemischt'
  | 'nicht_beurteilbar'

export type VerlaufstendenzConfidence = 'high' | 'medium' | 'low' | 'insufficient'

export type VerlaufstendenzWindowPreset = '7d' | '14d' | 'admission' | 'custom'

export interface VerlaufstendenzEvidence {
  id: string
  snippet: string
  /** Human-readable source label, e.g. Verlauf, PPB, Medikation. */
  sourceLabel: string
  /** Optional stable reference (feed entry id, imprint key, …). */
  sourceRef?: string
  dateIso?: string
}

export interface VerlaufstendenzDomainResult {
  domain: VerlaufstendenzDomain
  direction: VerlaufstendenzDomainDirection
  evidence: VerlaufstendenzEvidence[]
}

export interface VerlaufstendenzSourceEntry {
  id: string
  dateIso: string
  dateLabel: string
  text: string
  sourceLabel: string
}

export interface VerlaufstendenzComputed {
  trend: VerlaufstendenzTrend
  rationaleSentence: string
  confidence: VerlaufstendenzConfidence
  domains: VerlaufstendenzDomainResult[]
  sourceEntries: VerlaufstendenzSourceEntry[]
  computedAt: string
  windowPreset: VerlaufstendenzWindowPreset
  windowStartIso: string | null
  windowEndIso: string | null
}

export interface VerlaufstendenzClinicianOverride {
  trend: VerlaufstendenzTrend
  rationaleSentence: string
  acceptedAt: string
  windowPreset: VerlaufstendenzWindowPreset
  customWindowStart?: string
  customWindowEnd?: string
}

export const VERLAUFSTENDENZ_STATE_VERSION = 1 as const

export interface VerlaufstendenzState {
  version: typeof VERLAUFSTENDENZ_STATE_VERSION
  updatedAt: string
  windowPreset: VerlaufstendenzWindowPreset
  customWindowStart?: string
  customWindowEnd?: string
  /** Last rule-based computation snapshot (draft). */
  draft: VerlaufstendenzComputed | null
  /** Clinician-approved override — takes precedence over draft when set. */
  approved: VerlaufstendenzClinicianOverride | null
}
