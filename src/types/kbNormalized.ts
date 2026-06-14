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
  // ── German localization (bilingual; English columns above stay as source) ──
  substanceClassDe: string | null
  mechanismSummaryDe: string | null
  pharmacodynamicProfileDe: string | null
  clinicalPearlsDe: string | null
  uncertaintyNotesDe: string | null
  pregnancyLactationCautionDe: string | null
  geriatricCautionDe: string | null
  hepaticRenalCautionDe: string | null
  primaryPsychiatricUsesDe: string[] | null
  contraindicationsDe: string[] | null
  severeRisksDe: string[] | null
  translationStatus: string
  translatedAt: string | null
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
  explanationDe: string | null
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
  effectDe: string | null
  systemDe: string | null
  noteDe: string | null
}

export interface KbMonitoringRecommendation {
  id: string
  substanceId: string
  parameter: string
  intervalText: string | null
  rationale: string | null
  priority: string
  parameterDe: string | null
  intervalTextDe: string | null
  rationaleDe: string | null
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
  populationDe: string | null
  startDoseDe: string | null
  targetDoseDe: string | null
  maxDoseDe: string | null
  titrationNotesDe: string | null
  administrationNotesDe: string | null
}

export interface KbInteractionNote {
  id: string
  substanceId: string
  interactsWith: string
  severity: string
  mechanism: string | null
  clinicalManagement: string | null
  interactsWithDe: string | null
  mechanismDe: string | null
  clinicalManagementDe: string | null
}

export interface KbSource {
  id: string
  substanceId: string
  sourceType: string
  citation: string
  url: string | null
  accessedAt: string | null
}

export interface KbCountryPreparation {
  id: string
  substanceId: string
  countryCode: string
  dosageForm: string
  strengthValue: string
  strengthUnit: string
  route: string
  tradeName: string | null
  verificationStatus: string
  notes: string | null
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
  countryPreparations: KbCountryPreparation[]
  latestGeneration: KbAiGeneration | null
}
