import type { CourseDirection, EvidenceStrength } from './clinicalImprint'

/**
 * ISDM V.1 — Layer 2a profile inside Clinical Analysis (diagnostic mapping subset).
 * Consumes clinical imprints; not a replacement for the ingestion layer.
 * See `clinicalAnalysis.ts` for the full three-layer model.
 */

export type AssessmentStandard =
  | 'local_clinical'
  | 'international_structured_diagnostic_mapping'

export type IsdmProfileId = 'international_structured_diagnostic_mapping'

export type IsdmPhenomenologyDomain =
  | 'appearance_behavior'
  | 'speech_language'
  | 'consciousness_orientation'
  | 'attention_concentration'
  | 'memory_cognition'
  | 'mood_affect'
  | 'drive_psychomotor_activity'
  | 'formal_thought_disorder'
  | 'thought_content'
  | 'delusions_overvalued_ideas'
  | 'perception_hallucinations'
  | 'self_experience_ego_disturbance'
  | 'anxiety_panic_phobic_symptoms'
  | 'obsessions_compulsions'
  | 'trauma_intrusions_dissociation'
  | 'somatic_preoccupation'
  | 'sleep_appetite_vegetative'
  | 'substance_related_features'
  | 'personality_interpersonal_style'
  | 'insight_judgment'
  | 'risk_self'
  | 'risk_others'
  | 'functional_impairment'

export const ISDM_PHENOMENOLOGY_DOMAINS: IsdmPhenomenologyDomain[] = [
  'appearance_behavior',
  'speech_language',
  'consciousness_orientation',
  'attention_concentration',
  'memory_cognition',
  'mood_affect',
  'drive_psychomotor_activity',
  'formal_thought_disorder',
  'thought_content',
  'delusions_overvalued_ideas',
  'perception_hallucinations',
  'self_experience_ego_disturbance',
  'anxiety_panic_phobic_symptoms',
  'obsessions_compulsions',
  'trauma_intrusions_dissociation',
  'somatic_preoccupation',
  'sleep_appetite_vegetative',
  'substance_related_features',
  'personality_interpersonal_style',
  'insight_judgment',
  'risk_self',
  'risk_others',
  'functional_impairment',
]

export type IsdmConfidence = 0 | 1 | 2 | 3 | 4

export type SymptomFindingPolarity = 'present' | 'absent' | 'unclear'

export interface SymptomFinding {
  id: string
  domain: IsdmPhenomenologyDomain
  label: string
  keywords: string[]
  evidenceStrength: EvidenceStrength
  sourceImprintKeys: string[]
  confidence: IsdmConfidence
  polarity: SymptomFindingPolarity
  notes?: string
}

export type CourseOnset = 'acute' | 'subacute' | 'insidious' | 'unclear'
export type CourseDuration = 'days' | 'weeks' | 'months' | 'years' | 'lifelong' | 'unclear'
export type CourseEpisodicity =
  | 'single_episode'
  | 'recurrent'
  | 'continuous'
  | 'unclear'

export interface CoursePattern {
  onset: CourseOnset
  duration: CourseDuration
  episodicity: CourseEpisodicity
  trajectory: CourseDirection[]
  contextualTriggers: string[]
  precipitants: string[]
  summary: string
}

export type SyndromeClusterType =
  | 'psychotic'
  | 'depressive'
  | 'manic'
  | 'anxiety'
  | 'trauma'
  | 'substance'
  | 'obsessive_compulsive'
  | 'eating'
  | 'personality'
  | 'cognitive'
  | 'mixed'
  | 'unspecified'

export interface SyndromeCluster {
  id: string
  clusterType: SyndromeClusterType
  label: string
  supportingFindings: string[]
  opposingFindings: string[]
  confidence: IsdmConfidence
  rationale: string
}

export interface DiagnosticCodingRef {
  code: string
  label: string
}

export interface DiagnosticMapping {
  id: string
  label: string
  codingSystems: {
    icd10?: DiagnosticCodingRef
    icd11?: DiagnosticCodingRef
    dsm5tr?: DiagnosticCodingRef
  }
  confidence: IsdmConfidence
  criteriaMet: string[]
  criteriaMissing: string[]
  exclusions: string[]
  differentials: string[]
  supportingClusters: string[]
  clinicianReviewRequired: true
}

export type InterviewGapDomain = IsdmPhenomenologyDomain | 'course' | 'risk' | 'functioning'

export type InterviewGapPriority = 'low' | 'medium' | 'high'

export interface InterviewGap {
  id: string
  domain: InterviewGapDomain
  priority: InterviewGapPriority
  question: string
  rationale: string
}

export type IsdmOverallUncertainty = 'low' | 'moderate' | 'high'

export interface IsdmClinicalAnalysis {
  caseId: string
  profileId: IsdmProfileId
  updatedAt: string
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  coursePattern: CoursePattern
  syndromeClusters: SyndromeCluster[]
  diagnosticMappings: DiagnosticMapping[]
  interviewGaps: InterviewGap[]
  overallUncertainty: IsdmOverallUncertainty
}

export const ISDM_ANALYSIS_VERSION = 1

export type IsdmPresence = 'not_assessed' | 'absent' | 'present' | 'unclear'

export interface IsdmDomainInput {
  presence: IsdmPresence
  /** 0–4 when presence is present */
  severity?: IsdmConfidence
  notes?: string
}

export interface IsdmInputState {
  version: number
  updatedAt: string
  domains: Record<IsdmPhenomenologyDomain, IsdmDomainInput>
}

export const ISDM_INPUT_VERSION = 1

export function createEmptyIsdmDomainInput(): IsdmDomainInput {
  return { presence: 'not_assessed' }
}

export function createEmptyIsdmInputState(): IsdmInputState {
  const domains = {} as Record<IsdmPhenomenologyDomain, IsdmDomainInput>
  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) {
    domains[domain] = createEmptyIsdmDomainInput()
  }
  return {
    version: ISDM_INPUT_VERSION,
    updatedAt: new Date().toISOString(),
    domains,
  }
}
