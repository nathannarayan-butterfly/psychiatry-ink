/** Versioned KB release consumed by Psychiatry.ink (read-only clinical app). */
export interface KbRelease {
  id: string
  versionLabel: string
  source: string
  publishedAt: string
  syncedAt: string
  notes: string | null
  isCurrent: boolean
  snapshotMetadata: Record<string, unknown> | null
  createdAt: string
}

export type KbProvenanceSourceType =
  | 'ai_draft'
  | 'user_contribution'
  | 'fachinformation'
  | 'fda_label'
  | 'stahl'
  | 'guideline'
  | 'literature'
  | 'curated'
  | 'unknown'

export interface KbFieldProvenance {
  id: string
  substanceId: string
  fieldPath: string
  valueSnapshot: unknown
  sourceType: KbProvenanceSourceType
  sourceCitation: string | null
  sourceUrl: string | null
  contributorUserId: string | null
  contributionId: string | null
  confidence: string | null
  createdAt: string
}
