/** Verlauf feed pageType for basic somatic examination entries. */
export const SOMATIC_BEFUND_PAGE_TYPE = 'somatic-befund' as const

export type SomaticExamFinding = 'normal' | 'pathological' | 'not_examined'

export interface SomaticExamSection {
  finding: SomaticExamFinding | ''
  note?: string
}

export interface SomaticBefundVitals {
  bloodPressure?: string
  pulse?: string
  temperature?: string
  spo2?: string
  /** Körpergröße in cm (free text, e.g. "176" or "176 cm"). */
  height?: string
  /** Körpergewicht in kg (free text, e.g. "82" or "82 kg"). */
  weight?: string
}

/** Structured payload stored on Verlauf feed entries (`pageType: somatic-befund`). */
export interface SomaticBefundPayload {
  examDate: string
  generalCondition?: string
  vitals: SomaticBefundVitals
  heart: SomaticExamSection
  lungs: SomaticExamSection
  abdomen: SomaticExamSection
  extremities: SomaticExamSection
  skin: SomaticExamSection
  neurology: SomaticExamSection
  supplement?: string
}

export const SOMATIC_EXAM_SECTION_IDS = [
  'heart',
  'lungs',
  'abdomen',
  'extremities',
  'skin',
  'neurology',
] as const

export type SomaticExamSectionId = (typeof SOMATIC_EXAM_SECTION_IDS)[number]
