import type { GuidedEntryField } from '../../../types/guidedEntry'

const NORMAL_ABNORMAL = [
  { id: 'normal', labelKey: 'aufnahmeBefundFindingNormal' },
  { id: 'abnormal', labelKey: 'aufnahmeBefundFindingAbnormal' },
  { id: 'not_examined', labelKey: 'aufnahmeBefundFindingNotExamined' },
] as const

const YES_NO = [
  { id: 'yes', labelKey: 'guidedEntryYes' },
  { id: 'no', labelKey: 'guidedEntryNo' },
] as const

function findingField(id: string, labelKey: string): GuidedEntryField {
  return {
    id,
    type: 'select',
    labelKey,
    options: [...NORMAL_ABNORMAL],
  }
}

function findingNoteField(id: string, labelKey: string): GuidedEntryField {
  return {
    id: `${id}Note`,
    type: 'short_text',
    labelKey,
    placeholderKey: 'aufnahmeBefundNotePlaceholder',
    showWhen: {
      id: `${id}-note-visible`,
      fieldId: id,
      operator: 'in',
      value: ['abnormal', 'not_examined'],
    },
  }
}

export const somaticBefundFields: GuidedEntryField[] = [
  {
    id: 'generalCondition',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldGeneralCondition',
    options: [
      { id: 'normal', labelKey: 'aufnahmeBefundFindingNormal' },
      { id: 'abnormal', labelKey: 'aufnahmeBefundFindingAbnormal' },
    ],
  },
  findingNoteField('generalCondition', 'aufnahmeBefundFieldGeneralConditionNote'),
  {
    id: 'nutritionalState',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldNutritionalState',
    options: [
      { id: 'normal', labelKey: 'aufnahmeBefundNutritionNormal' },
      { id: 'adipose', labelKey: 'aufnahmeBefundNutritionAdipose' },
      { id: 'cachectic', labelKey: 'aufnahmeBefundNutritionCachectic' },
      { id: 'abnormal', labelKey: 'aufnahmeBefundFindingAbnormal' },
    ],
  },
  findingNoteField('nutritionalState', 'aufnahmeBefundFieldNutritionalStateNote'),
  findingField('skinMucosa', 'aufnahmeBefundFieldSkinMucosa'),
  findingNoteField('skinMucosa', 'aufnahmeBefundFieldSkinMucosaNote'),
  findingField('heartCirculation', 'aufnahmeBefundFieldHeartCirculation'),
  findingNoteField('heartCirculation', 'aufnahmeBefundFieldHeartCirculationNote'),
  findingField('lungs', 'aufnahmeBefundFieldLungs'),
  findingNoteField('lungs', 'aufnahmeBefundFieldLungsNote'),
  findingField('abdomen', 'aufnahmeBefundFieldAbdomen'),
  findingNoteField('abdomen', 'aufnahmeBefundFieldAbdomenNote'),
  findingField('musculoskeletal', 'aufnahmeBefundFieldMusculoskeletal'),
  findingNoteField('musculoskeletal', 'aufnahmeBefundFieldMusculoskeletalNote'),
  {
    id: 'pain',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldPain',
    options: [...YES_NO],
  },
  {
    id: 'painNote',
    type: 'short_text',
    labelKey: 'aufnahmeBefundFieldPainNote',
    placeholderKey: 'aufnahmeBefundNotePlaceholder',
    showWhen: { id: 'pain-note', fieldId: 'pain', operator: 'equals', value: 'yes' },
  },
  {
    id: 'vitals',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldVitals',
    options: [...NORMAL_ABNORMAL],
  },
  {
    id: 'vitalsNote',
    type: 'short_text',
    labelKey: 'aufnahmeBefundFieldVitalsNote',
    placeholderKey: 'aufnahmeBefundVitalsPlaceholder',
    showWhen: {
      id: 'vitals-note',
      fieldId: 'vitals',
      operator: 'in',
      value: ['abnormal', 'not_examined'],
    },
  },
  {
    id: 'somaticHistory',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldSomaticHistory',
    options: [
      { id: 'none', labelKey: 'aufnahmeBefundHistoryNone' },
      { id: 'yes', labelKey: 'guidedEntryYes' },
    ],
  },
  {
    id: 'somaticHistoryNote',
    type: 'textarea',
    labelKey: 'aufnahmeBefundFieldSomaticHistoryNote',
    showWhen: { id: 'history-note', fieldId: 'somaticHistory', operator: 'equals', value: 'yes' },
  },
  {
    id: 'currentComplaints',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldCurrentComplaints',
    options: [...YES_NO],
  },
  {
    id: 'currentComplaintsNote',
    type: 'textarea',
    labelKey: 'aufnahmeBefundFieldCurrentComplaintsNote',
    showWhen: {
      id: 'complaints-note',
      fieldId: 'currentComplaints',
      operator: 'equals',
      value: 'yes',
    },
  },
  {
    id: 'intoxWithdrawalInfectionInjury',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldIntoxWithdrawal',
    options: [...YES_NO],
  },
  {
    id: 'intoxWithdrawalInfectionInjuryNote',
    type: 'textarea',
    labelKey: 'aufnahmeBefundFieldIntoxWithdrawalNote',
    showWhen: {
      id: 'intox-note',
      fieldId: 'intoxWithdrawalInfectionInjury',
      operator: 'equals',
      value: 'yes',
    },
  },
  {
    id: 'otherFindings',
    type: 'textarea',
    labelKey: 'aufnahmeBefundFieldOtherFindings',
  },
]

export const neuroBefundFields: GuidedEntryField[] = [
  findingField('consciousnessOrientation', 'aufnahmeBefundFieldConsciousness'),
  findingNoteField('consciousnessOrientation', 'aufnahmeBefundFieldConsciousnessNote'),
  findingField('speech', 'aufnahmeBefundFieldSpeech'),
  findingNoteField('speech', 'aufnahmeBefundFieldSpeechNote'),
  findingField('cranialNerves', 'aufnahmeBefundFieldCranialNerves'),
  findingNoteField('cranialNerves', 'aufnahmeBefundFieldCranialNervesNote'),
  findingField('motor', 'aufnahmeBefundFieldMotor'),
  findingNoteField('motor', 'aufnahmeBefundFieldMotorNote'),
  findingField('sensitivity', 'aufnahmeBefundFieldSensitivity'),
  findingNoteField('sensitivity', 'aufnahmeBefundFieldSensitivityNote'),
  findingField('reflexes', 'aufnahmeBefundFieldReflexes'),
  findingNoteField('reflexes', 'aufnahmeBefundFieldReflexesNote'),
  findingField('coordination', 'aufnahmeBefundFieldCoordination'),
  findingNoteField('coordination', 'aufnahmeBefundFieldCoordinationNote'),
  findingField('gait', 'aufnahmeBefundFieldGait'),
  findingNoteField('gait', 'aufnahmeBefundFieldGaitNote'),
  {
    id: 'epiMotorFindings',
    type: 'checkbox_group',
    labelKey: 'aufnahmeBefundFieldEpiMotor',
    options: [
      { id: 'none', labelKey: 'aufnahmeBefundEpiNone' },
      { id: 'tremor', labelKey: 'aufnahmeBefundEpiTremor' },
      { id: 'rigidity', labelKey: 'aufnahmeBefundEpiRigidity' },
      { id: 'akathisia', labelKey: 'aufnahmeBefundEpiAkathisia' },
      { id: 'dyskinesia', labelKey: 'aufnahmeBefundEpiDyskinesia' },
    ],
  },
  {
    id: 'epiMotorFindingsNote',
    type: 'short_text',
    labelKey: 'aufnahmeBefundFieldEpiMotorNote',
    placeholderKey: 'aufnahmeBefundNotePlaceholder',
  },
  {
    id: 'extrapyramidalOther',
    type: 'textarea',
    labelKey: 'aufnahmeBefundFieldExtrapyramidalOther',
  },
  {
    id: 'focalDeficits',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldFocalDeficits',
    options: [...YES_NO],
  },
  {
    id: 'focalDeficitsNote',
    type: 'textarea',
    labelKey: 'aufnahmeBefundFieldFocalDeficitsNote',
    showWhen: { id: 'focal-note', fieldId: 'focalDeficits', operator: 'equals', value: 'yes' },
  },
  {
    id: 'seizuresSyncopeEvents',
    type: 'select',
    labelKey: 'aufnahmeBefundFieldSeizuresSyncope',
    options: [...YES_NO],
  },
  {
    id: 'seizuresSyncopeEventsNote',
    type: 'textarea',
    labelKey: 'aufnahmeBefundFieldSeizuresSyncopeNote',
    showWhen: {
      id: 'events-note',
      fieldId: 'seizuresSyncopeEvents',
      operator: 'equals',
      value: 'yes',
    },
  },
]
