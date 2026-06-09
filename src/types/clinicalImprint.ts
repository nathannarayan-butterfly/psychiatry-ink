export type ClinicalSourceType =
  | 'anamnesis'
  | 'verlauf'
  | 'arztbrief'
  | 'medication'
  | 'lab'
  | 'risk'
  | 'diagnosis'
  | 'manual_note'
  | 'ai_generation'

export type ClinicalDomain =
  | 'psychopathology'
  | 'diagnosis'
  | 'medication'
  | 'risk'
  | 'functioning'
  | 'somatic'
  | 'lab'
  | 'therapy'
  | 'social'
  | 'legal'
  | 'administrative'

export type CourseDirection =
  | 'new'
  | 'improved'
  | 'worsened'
  | 'stable'
  | 'fluctuating'
  | 'resolved'
  | 'unclear'

export type EvidenceStrength =
  | 'direct_observation'
  | 'patient_report'
  | 'third_party_report'
  | 'inferred'
  | 'unclear'

export interface EvidenceQuoteRange {
  start: number
  end: number
}

export interface StructuredClinicalMetadata {
  patientId: string
  caseId: string
  sourceType: ClinicalSourceType
  sourceId: string
  sourceDate: string
  createdAt: string
  readableClinicalSentence: string
  clinicalDomain: ClinicalDomain
  symptoms: string[]
  severity: string | null
  courseDirection: CourseDirection | null
  affect: string | null
  drive: string | null
  thoughtForm: string | null
  thoughtContent: string | null
  perception: string | null
  selfDisturbance: string | null
  cognition: string | null
  sleep: string | null
  cooperation: string | null
  insight: string | null
  riskSelf: string | null
  riskOthers: string | null
  aggression: string | null
  suicidality: string | null
  functioning: string | null
  socialInteraction: string | null
  hygieneSelfCare: string | null
  medicationMentioned: string[]
  medicationResponse: string | null
  sideEffects: string | null
  adherence: string | null
  diagnosisHints: string[]
  differentialDiagnosisHints: string[]
  uncertainty: string | null
  evidenceStrength: EvidenceStrength
  evidenceText: string | null
  evidenceQuoteRange: EvidenceQuoteRange | null
  analysisEligible: boolean
  excludeReason: string | null
}

/** One structured clinical memory entry — stored inside encrypted workspace payload. */
export type ClinicalImprintEntry = StructuredClinicalMetadata & {
  /** Stable key for upsert: `${sourceType}:${sourceId}` */
  imprintKey: string
}

export interface ClinicalImprintRecord extends ClinicalImprintEntry {}

export interface ClinicalImprintIndex {
  version: number
  updatedAt: string
  imprints: ClinicalImprintRecord[]
}

export interface ClinicalImprintJob {
  caseId: string
  sourceType: ClinicalSourceType
  sourceId: string
  text: string
  sourceDate?: string
  documentTypeId?: string
  sectionLabel?: string
  evidenceStrength?: EvidenceStrength
}
