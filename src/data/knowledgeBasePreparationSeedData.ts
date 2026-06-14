import type { MedicationMarketAvailability } from '../types/knowledgeBase'

const SEED_TS = '2026-06-13T00:00:00.000Z'

const SEED_ACTOR = {
  createdByUserId: 'system-seed',
  createdByDisplayName: 'Seed',
  lastModifiedByUserId: 'system-seed',
  lastModifiedByDisplayName: 'Seed',
}

function compactPrep(
  partial: Omit<MedicationMarketAvailability, 'createdAt' | 'verificationStatus' | 'lastVerifiedAt' | 'route'> & {
    route?: string
    verificationStatus?: MedicationMarketAvailability['verificationStatus']
  },
): MedicationMarketAvailability {
  return {
    route: 'oral',
    prescriptionStatus: 'verschreibungspflichtig',
    marketStatus: 'available',
    sourceName: 'Fachinformation / AMIce',
    sourceReference: 'Offline seed — verify against current SmPC.',
    verificationStatus: partial.verificationStatus ?? 'imported_verified',
    lastVerifiedAt: SEED_TS,
    createdAt: SEED_TS,
    ...SEED_ACTOR,
    ...partial,
  }
}

export const KB_PREPARATION_SEED_DATA: MedicationMarketAvailability[] = [
  compactPrep({
    id: 'seed-prep-amisulpride-de-tablet-50',
    substanceId: 'amisulprid',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Amisulprid',
    strengthValue: '50',
    strengthUnit: 'mg',
    dosageForm: 'Tabletten',
  }),
  compactPrep({
    id: 'seed-prep-amisulpride-de-tablet-100',
    substanceId: 'amisulprid',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Amisulprid',
    strengthValue: '100',
    strengthUnit: 'mg',
    dosageForm: 'Tabletten',
  }),
  compactPrep({
    id: 'seed-prep-amisulpride-de-tablet-200',
    substanceId: 'amisulprid',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Amisulprid',
    strengthValue: '200',
    strengthUnit: 'mg',
    dosageForm: 'Tabletten',
  }),
  compactPrep({
    id: 'seed-prep-amisulpride-de-film-400',
    substanceId: 'amisulprid',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Amisulprid',
    strengthValue: '400',
    strengthUnit: 'mg',
    dosageForm: 'Filmtabletten',
  }),
  compactPrep({
    id: 'seed-prep-amisulpride-de-solution-100',
    substanceId: 'amisulprid',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Amisulprid',
    strengthValue: '100',
    strengthUnit: 'mg/ml',
    dosageForm: 'Lösung zum Einnehmen',
  }),
  compactPrep({
    id: 'seed-prep-risperidone-de-tablet-05',
    substanceId: 'seed-risperidone-002',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Risperidon',
    strengthValue: '0.5',
    strengthUnit: 'mg',
    dosageForm: 'Tabletten',
  }),
  compactPrep({
    id: 'seed-prep-risperidone-de-tablet-1',
    substanceId: 'seed-risperidone-002',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Risperidon',
    strengthValue: '1',
    strengthUnit: 'mg',
    dosageForm: 'Tabletten',
  }),
  compactPrep({
    id: 'seed-prep-risperidone-de-tablet-2',
    substanceId: 'seed-risperidone-002',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Risperidon',
    strengthValue: '2',
    strengthUnit: 'mg',
    dosageForm: 'Filmtabletten',
  }),
  compactPrep({
    id: 'seed-prep-risperidone-de-solution-1',
    substanceId: 'seed-risperidone-002',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Risperidon',
    strengthValue: '1',
    strengthUnit: 'mg/ml',
    dosageForm: 'Lösung zum Einnehmen',
  }),
  compactPrep({
    id: 'seed-prep-risperidone-de-depot-25',
    substanceId: 'seed-risperidone-002',
    countryCode: 'DE',
    tradeName: 'Risperdal Consta',
    genericName: 'Risperidon',
    strengthValue: '25',
    strengthUnit: 'mg',
    dosageForm: 'Depot-Injektion',
    route: 'intramuscular',
  }),
  compactPrep({
    id: 'seed-prep-sertraline-de-tablet-50',
    substanceId: 'seed-sertraline-005',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Sertralin',
    strengthValue: '50',
    strengthUnit: 'mg',
    dosageForm: 'Filmtabletten',
  }),
  compactPrep({
    id: 'seed-prep-sertraline-de-tablet-100',
    substanceId: 'seed-sertraline-005',
    countryCode: 'DE',
    tradeName: '',
    genericName: 'Sertralin',
    strengthValue: '100',
    strengthUnit: 'mg',
    dosageForm: 'Filmtabletten',
  }),
]
