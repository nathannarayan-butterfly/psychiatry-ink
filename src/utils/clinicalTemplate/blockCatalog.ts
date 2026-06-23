import type { UiTranslationKey } from '../../data/uiTranslations'
import type { ClinicalBinding, ClinicalTemplateCategory } from '../../types/clinicalTemplate'

export type PaletteGroup = 'basic' | 'clinical' | 'placeholders' | 'advanced'

export interface PaletteItem {
  /** Unique palette id — also the DnD draggable id and block-factory key. */
  id: string
  group: PaletteGroup
  labelKey: UiTranslationKey
  descKey: UiTranslationKey
  /** Clinical data domain a block reads from (shown as a badge). */
  binding?: ClinicalBinding
}

export const PALETTE_GROUPS: Array<{ id: PaletteGroup; labelKey: UiTranslationKey }> = [
  { id: 'basic', labelKey: 'vorlageGroupBasic' },
  { id: 'clinical', labelKey: 'vorlageGroupClinical' },
  { id: 'placeholders', labelKey: 'vorlageGroupPlaceholders' },
  { id: 'advanced', labelKey: 'vorlageGroupAdvanced' },
]

export const PALETTE_ITEMS: PaletteItem[] = [
  // Basic building blocks
  { id: 'heading', group: 'basic', labelKey: 'vorlageBlockHeading', descKey: 'vorlageBlockHeadingDesc' },
  { id: 'text', group: 'basic', labelKey: 'vorlageBlockText', descKey: 'vorlageBlockTextDesc' },
  { id: 'free_text', group: 'basic', labelKey: 'vorlageBlockFreeText', descKey: 'vorlageBlockFreeTextDesc' },
  { id: 'required_field', group: 'basic', labelKey: 'vorlageBlockRequiredField', descKey: 'vorlageBlockRequiredFieldDesc' },
  { id: 'checkbox', group: 'basic', labelKey: 'vorlageBlockCheckbox', descKey: 'vorlageBlockCheckboxDesc' },
  { id: 'checkbox_group', group: 'basic', labelKey: 'vorlageBlockCheckboxGroup', descKey: 'vorlageBlockCheckboxGroupDesc' },
  { id: 'select', group: 'basic', labelKey: 'vorlageBlockSelect', descKey: 'vorlageBlockSelectDesc' },
  { id: 'date', group: 'basic', labelKey: 'vorlageBlockDate', descKey: 'vorlageBlockDateDesc' },
  { id: 'table', group: 'basic', labelKey: 'vorlageBlockTable', descKey: 'vorlageBlockTableDesc' },

  // Clinical-source blocks
  { id: 'diagnosis', group: 'clinical', labelKey: 'vorlageBlockDiagnosis', descKey: 'vorlageBlockDiagnosisDesc', binding: 'diagnoses.current' },
  { id: 'medication', group: 'clinical', labelKey: 'vorlageBlockMedication', descKey: 'vorlageBlockMedicationDesc', binding: 'medication.current' },
  { id: 'laboratory', group: 'clinical', labelKey: 'vorlageBlockLaboratory', descKey: 'vorlageBlockLaboratoryDesc', binding: 'labs.latest' },
  { id: 'psychopathology', group: 'clinical', labelKey: 'vorlageBlockPsychopathology', descKey: 'vorlageBlockPsychopathologyDesc', binding: 'psychopathology.latest' },
  { id: 'risk', group: 'clinical', labelKey: 'vorlageBlockRisk', descKey: 'vorlageBlockRiskDesc', binding: 'risk.current' },
  { id: 'verlauf_summary', group: 'clinical', labelKey: 'vorlageBlockVerlauf', descKey: 'vorlageBlockVerlaufDesc', binding: 'verlauf.selectedRange' },
  { id: 'therapy', group: 'clinical', labelKey: 'vorlageBlockTherapy', descKey: 'vorlageBlockTherapyDesc', binding: 'therapy.current' },
  { id: 'social_therapy', group: 'clinical', labelKey: 'vorlageBlockSocialTherapy', descKey: 'vorlageBlockSocialTherapyDesc', binding: 'socialTherapy.current' },

  // Placeholders & signatures
  { id: 'patient_data', group: 'placeholders', labelKey: 'vorlageBlockPatientData', descKey: 'vorlageBlockPatientDataDesc', binding: 'patient.demographics' },
  { id: 'institution', group: 'placeholders', labelKey: 'vorlageBlockInstitution', descKey: 'vorlageBlockInstitutionDesc' },
  { id: 'signature', group: 'placeholders', labelKey: 'vorlageBlockSignature', descKey: 'vorlageBlockSignatureDesc' },

  // Advanced
  { id: 'ai_section', group: 'advanced', labelKey: 'vorlageBlockAiSection', descKey: 'vorlageBlockAiSectionDesc' },
  { id: 'conditional', group: 'advanced', labelKey: 'vorlageBlockConditional', descKey: 'vorlageBlockConditionalDesc' },
]

export const PALETTE_ITEMS_BY_ID = new Map(PALETTE_ITEMS.map((item) => [item.id, item]))

export const CLINICAL_TEMPLATE_CATEGORIES: Array<{ id: ClinicalTemplateCategory; labelKey: UiTranslationKey }> = [
  { id: 'arztbrief', labelKey: 'vorlageCategoryArztbrief' },
  { id: 'anamnese', labelKey: 'vorlageCategoryAnamnese' },
  { id: 'verlauf', labelKey: 'vorlageCategoryVerlauf' },
  { id: 'psychopathologischer-befund', labelKey: 'vorlageCategoryPsychBefund' },
  { id: 'aufklaerung', labelKey: 'vorlageCategoryAufklaerung' },
  { id: 'legal-forensic', labelKey: 'vorlageCategoryLegal' },
  { id: 'gutachten', labelKey: 'vorlageCategoryGutachten' },
  { id: 'konsil', labelKey: 'vorlageCategoryKonsil' },
  { id: 'custom', labelKey: 'vorlageCategoryCustom' },
]
