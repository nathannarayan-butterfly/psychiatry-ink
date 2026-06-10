export type ReceptorProfile = {
  d2?: string
  serotonin5HT2A?: string
  h1?: string
  m1?: string
  alpha1?: string
  d3?: string
  serotonin5HT1A?: string
  netSert?: string
  norepinephrine?: string
  gaba?: string
  notes?: string
}

export type MonitoringRule = {
  parameter: string
  frequency?: string
  warningThreshold?: string
  noteDe: string
  noteEn: string
}

export type InteractionEntry = {
  interactsWith: string
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated'
  mechanismNote?: string
  clinicalNoteDe: string
  clinicalNoteEn: string
}

export type LabWarningRule = {
  labParameter: string
  condition: string
  warningDe: string
  warningEn: string
  severity: 'caution' | 'reduce_dose' | 'contraindicated'
}

export type DrugReference = {
  id: string
  genericName: string
  brandNamesDACH?: string[]
  atcCode?: string
  substanceClass: string
  formulations: string[]
  strengthsDACH: string[]
  routesOfAdmin?: string[]

  kurzinfoDe: string
  kurzinfoEn: string

  receptorProfile?: ReceptorProfile

  commonSideEffectsDe: string[]
  commonSideEffectsEn: string[]
  seriousSideEffectsDe: string[]
  seriousSideEffectsEn: string[]

  monitoringRules: MonitoringRule[]
  interactions: InteractionEntry[]
  labWarnings: LabWarningRule[]

  renalDosing?: string
  hepaticDosing?: string
  pregnancyCategory?: string

  tabletSplittable?: boolean
  liquidFormAvailable?: boolean
  depotAvailable?: boolean

  sources: string[]
  lastReviewed: string
  contentDisclaimer: 'documentation_support_only'
}
