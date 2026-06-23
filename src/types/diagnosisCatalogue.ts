/** Catalogue coding system — independent of criterion trees. */
export type CatalogueSystem = 'ICD10GM' | 'ICD10WHO' | 'ICD11MMS' | 'DSM5TR' | 'LOCAL'

export type CatalogueSearchSystem = CatalogueSystem | 'ALL'

export type CatalogueSearchScope = 'psychiatric' | 'somatic' | 'all'

export type DiagnosisStatus =
  | 'confirmed'
  | 'suspected'
  | 'rule_out'
  | 'historical'
  | 'differential'
  | 'remitted'

/** Clinical category for case-file diagnoses (display + sorting). */
export type DiagnosisClinicalCategory =
  | 'primary'
  | 'secondary'
  | 'differential'
  | 'suspected'
  | 'rule_out'
  | 'historical'
  | 'remitted'
  | 'comorbidity'

/** Clinical certainty / lifecycle — orthogonal to category where applicable. */
export type DiagnosisConfirmationStatus =
  | 'confirmed'
  | 'active'
  | 'under_review'
  | 'anamnesis_only'

export type DiagnosisRole =
  | 'main'
  | 'secondary'
  | 'somatic_secondary'
  | 'comorbidity'

export type CriteriaSystem = 'ICD10' | 'ICD11' | 'DSM'

export type CriteriaSupportStatus = 'native' | 'fallback' | 'unavailable'

export interface DiagnosisCatalogueSearchHit {
  diagnosisEntryId: string
  system: CatalogueSystem
  catalogueVersion: string
  code: string
  title: string
  shortTitle?: string
  chapterCode?: string
  chapterTitle?: string
  blockCode?: string
  blockTitle?: string
  isCategory: boolean
  isSelectable: boolean
  criteriaAvailable: boolean
}

export interface DiagnosisCatalogueCoverage {
  catalogues: Array<{
    system: CatalogueSystem
    version: string
    language: string
    active: boolean
    importedAt: string
    entryCount: number
    psychiatricCount: number
    somaticCount: number
    withCriteriaLinks: number
    withoutCriteriaLinks: number
  }>
  totals: {
    psychiatric: number
    icd10Psychiatric: number
    icd11Psychiatric: number
    withCriteriaLinks: number
    withoutCriteriaLinks: number
  }
}
