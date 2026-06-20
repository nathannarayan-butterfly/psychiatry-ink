import type { UiTranslationKey } from '../uiTranslations'

/** Token id stored on template fields — resolves at document generation time only. */
export type PatientDynamicKey =
  | 'patient.name'
  | 'patient.vorname'
  | 'patient.nachname'
  | 'patient.geburtsdatum'
  | 'patient.age'
  | 'patient.geschlecht'
  | 'patient.caseId'
  | 'case.aufnahmedatum'
  | 'case.entlassungsdatum'
  | 'case.aufenthaltsdauer'
  | 'patient.height'
  | 'patient.weight'
  | 'patient.bmi'
  | 'case.hauptdiagnose'
  | 'case.medikation_kurz'
  | 'clinician.name'
  | 'system.today'
  | 'system.documentDate'
  | 'patient.address'
  | 'patient.kostentraeger'

export type DynamicFieldCategory =
  | 'identity'
  | 'admission'
  | 'anthropometrics'
  | 'clinical'
  | 'contact'

export interface DynamicFieldDefinition {
  key: PatientDynamicKey
  category: DynamicFieldCategory
  labelKey: UiTranslationKey
  descriptionKey: UiTranslationKey
  /** Builder preview token, e.g. {{patient.name}} — never contains PHI. */
  token: string
}

export const DYNAMIC_FIELD_CATEGORIES: Array<{
  id: DynamicFieldCategory
  labelKey: UiTranslationKey
}> = [
  { id: 'identity', labelKey: 'templateDynamicCategoryIdentity' },
  { id: 'admission', labelKey: 'templateDynamicCategoryAdmission' },
  { id: 'anthropometrics', labelKey: 'templateDynamicCategoryAnthropometrics' },
  { id: 'clinical', labelKey: 'templateDynamicCategoryClinical' },
  { id: 'contact', labelKey: 'templateDynamicCategoryContact' },
]

export const DYNAMIC_FIELD_CATALOG: DynamicFieldDefinition[] = [
  {
    key: 'patient.name',
    category: 'identity',
    labelKey: 'templateDynamicPatientName',
    descriptionKey: 'templateDynamicPatientNameDesc',
    token: '{{patient.name}}',
  },
  {
    key: 'patient.vorname',
    category: 'identity',
    labelKey: 'templateDynamicPatientVorname',
    descriptionKey: 'templateDynamicPatientVornameDesc',
    token: '{{patient.vorname}}',
  },
  {
    key: 'patient.nachname',
    category: 'identity',
    labelKey: 'templateDynamicPatientNachname',
    descriptionKey: 'templateDynamicPatientNachnameDesc',
    token: '{{patient.nachname}}',
  },
  {
    key: 'patient.geburtsdatum',
    category: 'identity',
    labelKey: 'templateDynamicPatientGeburtsdatum',
    descriptionKey: 'templateDynamicPatientGeburtsdatumDesc',
    token: '{{patient.geburtsdatum}}',
  },
  {
    key: 'patient.age',
    category: 'identity',
    labelKey: 'templateDynamicPatientAge',
    descriptionKey: 'templateDynamicPatientAgeDesc',
    token: '{{patient.age}}',
  },
  {
    key: 'patient.geschlecht',
    category: 'identity',
    labelKey: 'templateDynamicPatientGeschlecht',
    descriptionKey: 'templateDynamicPatientGeschlechtDesc',
    token: '{{patient.geschlecht}}',
  },
  {
    key: 'patient.caseId',
    category: 'identity',
    labelKey: 'templateDynamicPatientCaseId',
    descriptionKey: 'templateDynamicPatientCaseIdDesc',
    token: '{{patient.caseId}}',
  },
  {
    key: 'case.aufnahmedatum',
    category: 'admission',
    labelKey: 'templateDynamicCaseAufnahmedatum',
    descriptionKey: 'templateDynamicCaseAufnahmedatumDesc',
    token: '{{case.aufnahmedatum}}',
  },
  {
    key: 'case.entlassungsdatum',
    category: 'admission',
    labelKey: 'templateDynamicCaseEntlassungsdatum',
    descriptionKey: 'templateDynamicCaseEntlassungsdatumDesc',
    token: '{{case.entlassungsdatum}}',
  },
  {
    key: 'case.aufenthaltsdauer',
    category: 'admission',
    labelKey: 'templateDynamicCaseAufenthaltsdauer',
    descriptionKey: 'templateDynamicCaseAufenthaltsdauerDesc',
    token: '{{case.aufenthaltsdauer}}',
  },
  {
    key: 'patient.height',
    category: 'anthropometrics',
    labelKey: 'templateDynamicPatientHeight',
    descriptionKey: 'templateDynamicPatientHeightDesc',
    token: '{{patient.height}}',
  },
  {
    key: 'patient.weight',
    category: 'anthropometrics',
    labelKey: 'templateDynamicPatientWeight',
    descriptionKey: 'templateDynamicPatientWeightDesc',
    token: '{{patient.weight}}',
  },
  {
    key: 'patient.bmi',
    category: 'anthropometrics',
    labelKey: 'templateDynamicPatientBmi',
    descriptionKey: 'templateDynamicPatientBmiDesc',
    token: '{{patient.bmi}}',
  },
  {
    key: 'case.hauptdiagnose',
    category: 'clinical',
    labelKey: 'templateDynamicCaseHauptdiagnose',
    descriptionKey: 'templateDynamicCaseHauptdiagnoseDesc',
    token: '{{case.hauptdiagnose}}',
  },
  {
    key: 'case.medikation_kurz',
    category: 'clinical',
    labelKey: 'templateDynamicCaseMedikationKurz',
    descriptionKey: 'templateDynamicCaseMedikationKurzDesc',
    token: '{{case.medikation_kurz}}',
  },
  {
    key: 'clinician.name',
    category: 'clinical',
    labelKey: 'templateDynamicClinicianName',
    descriptionKey: 'templateDynamicClinicianNameDesc',
    token: '{{clinician.name}}',
  },
  {
    key: 'system.today',
    category: 'clinical',
    labelKey: 'templateDynamicSystemToday',
    descriptionKey: 'templateDynamicSystemTodayDesc',
    token: '{{system.today}}',
  },
  {
    key: 'system.documentDate',
    category: 'clinical',
    labelKey: 'templateDynamicSystemDocumentDate',
    descriptionKey: 'templateDynamicSystemDocumentDateDesc',
    token: '{{system.documentDate}}',
  },
  {
    key: 'patient.address',
    category: 'contact',
    labelKey: 'templateDynamicPatientAddress',
    descriptionKey: 'templateDynamicPatientAddressDesc',
    token: '{{patient.address}}',
  },
  {
    key: 'patient.kostentraeger',
    category: 'contact',
    labelKey: 'templateDynamicPatientKostentraeger',
    descriptionKey: 'templateDynamicPatientKostentraegerDesc',
    token: '{{patient.kostentraeger}}',
  },
]

const catalogByKey = new Map(DYNAMIC_FIELD_CATALOG.map((def) => [def.key, def]))

export function getDynamicFieldDefinition(key: PatientDynamicKey): DynamicFieldDefinition | undefined {
  return catalogByKey.get(key)
}

export function isPatientDynamicKey(value: string): value is PatientDynamicKey {
  return catalogByKey.has(value as PatientDynamicKey)
}

export function dynamicFieldsByCategory(category: DynamicFieldCategory): DynamicFieldDefinition[] {
  return DYNAMIC_FIELD_CATALOG.filter((def) => def.category === category)
}
