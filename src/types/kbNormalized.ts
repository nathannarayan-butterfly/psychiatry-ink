export type KbSubstanceStatus = 'ai_draft' | 'reviewed' | 'published' | 'archived'
export type KbReviewStatus = 'unreviewed' | 'in_review' | 'approved' | 'rejected'
export type KbSourceQuality =
  | 'ai_generated_unverified'
  | 'ai_generated_partial'
  | 'curated'
  | 'verified_smpc'
  | 'verified_guideline'

export interface KbSubstance {
  id: string
  genericName: string
  normalizedGenericName: string
  substanceClass: string | null
  category: string | null
  primaryPsychiatricUses: string[]
  mechanismSummary: string | null
  pharmacodynamicProfile: string | null
  clinicalPearls: string | null
  uncertaintyNotes: string | null
  pregnancyLactationCaution: string | null
  geriatricCaution: string | null
  hepaticRenalCaution: string | null
  contraindications: string[]
  severeRisks: string[]
  status: KbSubstanceStatus
  reviewStatus: KbReviewStatus
  sourceQuality: KbSourceQuality
  needsClinicalReview: boolean
  countryDefault: string
  createdAt: string
  updatedAt: string
}

export interface KbSubstanceTradeName {
  id: string
  substanceId: string
  tradeName: string
  countryCode: string | null
  isPrimary: boolean
}

export interface KbReceptorAffinity {
  id: string
  substanceId: string
  receptor: string
  affinityPercent: number | null
  effectType: string
  confidence: string
  explanation: string | null
  isEstimated: boolean
}

export interface KbSideEffect {
  id: string
  substanceId: string
  effect: string
  system: string | null
  frequency: string
  severity: string
  isSevereRisk: boolean
  note: string | null
}

export interface KbMonitoringRecommendation {
  id: string
  substanceId: string
  parameter: string
  intervalText: string | null
  rationale: string | null
  priority: string
}

export interface KbDosageGuidance {
  id: string
  substanceId: string
  population: string
  startDose: string | null
  targetDose: string | null
  maxDose: string | null
  titrationNotes: string | null
  administrationNotes: string | null
}

export interface KbInteractionNote {
  id: string
  substanceId: string
  interactsWith: string
  severity: string
  mechanism: string | null
  clinicalManagement: string | null
}

export interface KbSource {
  id: string
  substanceId: string
  sourceType: string
  citation: string
  url: string | null
  accessedAt: string | null
}

export interface KbAiGeneration {
  id: string
  substanceId: string | null
  genericName: string
  provider: string
  model: string
  promptVersion: string
  status: 'success' | 'failed_validation' | 'failed_api' | 'dry_run'
  rawResponse: unknown
  validatedPayload: unknown
  validationErrors: unknown
  createdAt: string
}

export interface KbSubstanceDetail extends KbSubstance {
  tradeNames: KbSubstanceTradeName[]
  receptorAffinities: KbReceptorAffinity[]
  sideEffects: KbSideEffect[]
  monitoring: KbMonitoringRecommendation[]
  dosageGuidance: KbDosageGuidance[]
  interactions: KbInteractionNote[]
  sources: KbSource[]
  latestGeneration: KbAiGeneration | null
}
