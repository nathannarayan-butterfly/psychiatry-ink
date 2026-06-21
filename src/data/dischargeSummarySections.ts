import type {
  DischargeSummaryDocumentType,
  DischargeSummaryRegion,
  DischargeSummarySectionDefinition,
} from '../types/dischargeSummary'

export const DISCHARGE_DEFAULT_SIGNATURE =
  'Yours sincerely,\n\n[Name, Title]\n[Organisation / Ward]'

const SHORT_SECTIONS: DischargeSummarySectionDefinition[] = [
  {
    id: 'header',
    labelEn: 'Header',
    fetchModule: 'identity',
    localIdentity: true,
    flowSection: true,
  },
  {
    id: 'patient-details',
    labelEn: 'Patient Details',
    fetchModule: 'identity',
    localIdentity: true,
  },
  {
    id: 'admission-details',
    labelEn: 'Admission Details',
    labelUk: 'Admission Details',
    labelUs: 'Admission Details',
    fetchModule: 'admission',
  },
  {
    id: 'diagnoses',
    labelEn: 'Diagnoses',
    fetchModule: 'diagnosis',
  },
  {
    id: 'reason-for-admission',
    labelEn: 'Reason for Admission',
    fetchModule: 'aufnahme',
  },
  {
    id: 'brief-relevant-history',
    labelEn: 'Brief Relevant History',
    fetchModule: 'anamnesis',
  },
  {
    id: 'mse-admission',
    labelEn: 'Mental State on Admission',
    fetchModule: 'psychopath',
  },
  {
    id: 'hospital-course',
    labelEn: 'Hospital Course / Treatment and Progress',
    labelUk: 'Hospital Course / Treatment and Progress',
    labelUs: 'Hospital Course / Treatment and Progress',
    fetchModule: 'verlauf',
    aiDefault: true,
    aiCapable: true,
  },
  {
    id: 'mse-discharge',
    labelEn: 'Mental State at Discharge',
    fetchModule: 'psychopath',
  },
  {
    id: 'risk-assessment-discharge',
    labelEn: 'Risk Assessment at Discharge',
    fetchModule: 'risk',
    aiCapable: true,
  },
  {
    id: 'medication-discharge',
    labelEn: 'Medication on Discharge',
    fetchModule: 'medication',
  },
  {
    id: 'allergies-adrs',
    labelEn: 'Allergies and Adverse Drug Reactions',
    fetchModule: 'medication',
  },
  {
    id: 'investigations',
    labelEn: 'Investigations / Relevant Results',
    fetchModule: 'diagnostics',
  },
  {
    id: 'discharge-plan-followup',
    labelEn: 'Discharge Plan and Follow-up',
    fetchModule: 'therapy',
  },
  {
    id: 'discharge-recommendations',
    labelEn: 'Discharge Recommendations / Special Instructions',
    fetchModule: 'risk',
    aiDefault: true,
    aiCapable: true,
  },
  {
    id: 'sign-off',
    labelEn: 'Sign-off',
    fetchModule: 'identity',
    localIdentity: true,
    flowSection: true,
  },
]

const FULL_SECTIONS: DischargeSummarySectionDefinition[] = [
  { id: 'header', labelEn: 'Header', fetchModule: 'identity', localIdentity: true, flowSection: true },
  { id: 'patient-details', labelEn: 'Patient Details', fetchModule: 'identity', localIdentity: true },
  {
    id: 'admission-discharge-details',
    labelEn: 'Admission and Discharge Details',
    fetchModule: 'admission',
  },
  { id: 'diagnoses', labelEn: 'Diagnoses', fetchModule: 'diagnosis' },
  { id: 'reason-for-admission', labelEn: 'Reason for Admission', fetchModule: 'aufnahme' },
  {
    id: 'history-presenting-illness',
    labelEn: 'History of Presenting Illness',
    fetchModule: 'anamnesis',
  },
  {
    id: 'past-psychiatric-history',
    labelEn: 'Past Psychiatric History',
    fetchModule: 'anamnesis',
  },
  { id: 'substance-use-history', labelEn: 'Substance Use History', fetchModule: 'anamnesis' },
  {
    id: 'medical-surgical-history',
    labelEn: 'Medical and Surgical History',
    fetchModule: 'anamnesis',
  },
  { id: 'medication-history', labelEn: 'Medication History', fetchModule: 'medication' },
  { id: 'family-history', labelEn: 'Family History', fetchModule: 'anamnesis' },
  {
    id: 'personal-developmental-social-history',
    labelEn: 'Personal / Developmental / Social History',
    fetchModule: 'anamnesis',
  },
  { id: 'forensic-legal-history', labelEn: 'Forensic / Legal History', fetchModule: 'anamnesis' },
  { id: 'mse-admission', labelEn: 'MSE on Admission', fetchModule: 'psychopath' },
  {
    id: 'physical-neurological-examination',
    labelEn: 'Physical / Neurological Examination',
    fetchModule: 'anamnesis',
  },
  { id: 'investigations', labelEn: 'Investigations', fetchModule: 'diagnostics' },
  { id: 'risk-assessment', labelEn: 'Risk Assessment', fetchModule: 'risk', aiCapable: true },
  {
    id: 'diagnostic-formulation',
    labelEn: 'Diagnostic Formulation',
    fetchModule: 'diagnosis',
    aiCapable: true,
  },
  {
    id: 'treatment-hospital-course',
    labelEn: 'Treatment and Hospital Course',
    fetchModule: 'verlauf',
    aiDefault: true,
    aiCapable: true,
  },
  { id: 'mse-discharge', labelEn: 'MSE at Discharge', fetchModule: 'psychopath' },
  { id: 'medication-discharge', labelEn: 'Medication on Discharge', fetchModule: 'medication' },
  {
    id: 'medication-changes-admission',
    labelEn: 'Medication Changes During Admission',
    fetchModule: 'medication',
  },
  { id: 'allergies-adrs', labelEn: 'Allergies / Adverse Reactions', fetchModule: 'medication' },
  {
    id: 'capacity-consent-legal',
    labelEn: 'Capacity / Consent / Legal Status',
    fetchModule: 'legal',
  },
  { id: 'discharge-plan', labelEn: 'Discharge Plan', fetchModule: 'therapy' },
  {
    id: 'recommendations-instructions',
    labelEn: 'Recommendations / Special Instructions',
    fetchModule: 'risk',
    aiDefault: true,
    aiCapable: true,
  },
  { id: 'information-given-patient', labelEn: 'Information Given to Patient', fetchModule: 'therapy' },
  { id: 'copy-recipients', labelEn: 'Copy Recipients', fetchModule: 'identity', localIdentity: true },
  { id: 'sign-off', labelEn: 'Sign-off', fetchModule: 'identity', localIdentity: true, flowSection: true },
]

export function getDischargeSummarySections(
  documentType: DischargeSummaryDocumentType,
): DischargeSummarySectionDefinition[] {
  return documentType === 'short_discharge_summary' ? SHORT_SECTIONS : FULL_SECTIONS
}

export function getDischargeSummarySectionIds(documentType: DischargeSummaryDocumentType): string[] {
  return getDischargeSummarySections(documentType).map((s) => s.id)
}

export function getDischargeSummarySectionDefinition(
  documentType: DischargeSummaryDocumentType,
  sectionId: string,
): DischargeSummarySectionDefinition | undefined {
  return getDischargeSummarySections(documentType).find((s) => s.id === sectionId)
}

export function getDischargeSummarySectionLabel(
  def: DischargeSummarySectionDefinition,
  region: DischargeSummaryRegion,
): string {
  if (region === 'UK' && def.labelUk) return def.labelUk
  if (region === 'US' && def.labelUs) return def.labelUs
  return def.labelEn
}

export function isDischargeSummaryAiSection(sectionId: string): boolean {
  return (
    sectionId === 'hospital-course' ||
    sectionId === 'treatment-hospital-course' ||
    sectionId === 'discharge-recommendations' ||
    sectionId === 'recommendations-instructions' ||
    sectionId === 'diagnostic-formulation' ||
    sectionId === 'risk-assessment-discharge' ||
    sectionId === 'risk-assessment'
  )
}

export function defaultDischargeSummaryTitle(
  documentType: DischargeSummaryDocumentType,
  region: DischargeSummaryRegion,
): string {
  if (documentType === 'short_discharge_summary') {
    if (region === 'UK') return 'Short Discharge Summary'
    return 'Discharge Summary'
  }
  if (region === 'UK') return 'Full Psychiatric Discharge Summary'
  return 'Comprehensive Psychiatric Discharge Summary'
}
