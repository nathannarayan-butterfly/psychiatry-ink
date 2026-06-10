export type LabImportMethod = 'paste' | 'csv' | 'fhir' | 'hl7' | 'hospital_feed'

export interface LabImportSettings {
  defaultImportMethod: LabImportMethod
  /** Placeholder — persisted preference, not yet applied during import. */
  autoMapLoinc: boolean
  /** Placeholder — persisted preference, not yet applied during import. */
  showMedLabCorrelationHints: boolean
}

export const DEFAULT_LAB_IMPORT_SETTINGS: LabImportSettings = {
  defaultImportMethod: 'paste',
  autoMapLoinc: false,
  showMedLabCorrelationHints: false,
}

export const LAB_IMPORT_METHOD_IDS: LabImportMethod[] = [
  'paste',
  'csv',
  'fhir',
  'hl7',
  'hospital_feed',
]

export function isLabImportMethodFunctional(method: LabImportMethod): boolean {
  return method === 'paste'
}
