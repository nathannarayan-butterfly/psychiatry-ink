import type { GuidedEntrySchema } from '../../../types/guidedEntry'

const EXAM_FINDING_OPTIONS = [
  { id: 'normal', labelKey: 'guidedEntrySomaticFindingNormal' },
  { id: 'pathological', labelKey: 'guidedEntrySomaticFindingPathological' },
  { id: 'not_examined', labelKey: 'guidedEntrySomaticFindingNotExamined' },
] as const

/** Compact somatic exam for Verlauf — vitals + brief system review. */
export const somaticBefundQuickSchema: GuidedEntrySchema = {
  itemType: 'somatic-befund-quick',
  titleKey: 'verlaufSomaticBefundModalTitle',
  descriptionKey: 'verlaufSomaticBefundModalDesc',
  fields: [
    {
      id: 'examDate',
      type: 'date',
      labelKey: 'guidedEntryFieldExamDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'generalCondition',
      type: 'select',
      labelKey: 'guidedEntryFieldSomaticGeneralCondition',
      options: [
        { id: 'unremarkable', labelKey: 'guidedEntrySomaticGeneralUnremarkable' },
        { id: 'reduced', labelKey: 'guidedEntrySomaticGeneralReduced' },
        { id: 'severely_reduced', labelKey: 'guidedEntrySomaticGeneralSeverelyReduced' },
        { id: 'agitated', labelKey: 'guidedEntrySomaticGeneralAgitated' },
      ],
    },
    {
      id: 'bloodPressure',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticBloodPressure',
      placeholderKey: 'guidedEntryFieldSomaticBloodPressurePlaceholder',
    },
    {
      id: 'pulse',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticPulse',
      placeholderKey: 'guidedEntryFieldSomaticPulsePlaceholder',
    },
    {
      id: 'temperature',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticTemperature',
      placeholderKey: 'guidedEntryFieldSomaticTemperaturePlaceholder',
    },
    {
      id: 'spo2',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticSpo2',
      placeholderKey: 'guidedEntryFieldSomaticSpo2Placeholder',
    },
    {
      id: 'height',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticHeight',
      placeholderKey: 'guidedEntryFieldSomaticHeightPlaceholder',
    },
    {
      id: 'weight',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticWeight',
      placeholderKey: 'guidedEntryFieldSomaticWeightPlaceholder',
    },
    {
      id: 'heartFinding',
      type: 'select',
      labelKey: 'guidedEntryFieldSomaticHeart',
      options: [...EXAM_FINDING_OPTIONS],
    },
    {
      id: 'heartNote',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticHeartNote',
      placeholderKey: 'guidedEntryFieldSomaticSectionNotePlaceholder',
    },
    {
      id: 'lungsFinding',
      type: 'select',
      labelKey: 'guidedEntryFieldSomaticLungs',
      options: [...EXAM_FINDING_OPTIONS],
    },
    {
      id: 'lungsNote',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticLungsNote',
      placeholderKey: 'guidedEntryFieldSomaticSectionNotePlaceholder',
    },
    {
      id: 'abdomenFinding',
      type: 'select',
      labelKey: 'guidedEntryFieldSomaticAbdomen',
      options: [...EXAM_FINDING_OPTIONS],
    },
    {
      id: 'abdomenNote',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticAbdomenNote',
      placeholderKey: 'guidedEntryFieldSomaticSectionNotePlaceholder',
    },
    {
      id: 'extremitiesFinding',
      type: 'select',
      labelKey: 'guidedEntryFieldSomaticExtremities',
      options: [...EXAM_FINDING_OPTIONS],
    },
    {
      id: 'extremitiesNote',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticExtremitiesNote',
      placeholderKey: 'guidedEntryFieldSomaticSectionNotePlaceholder',
    },
    {
      id: 'skinFinding',
      type: 'select',
      labelKey: 'guidedEntryFieldSomaticSkin',
      options: [...EXAM_FINDING_OPTIONS],
    },
    {
      id: 'skinNote',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticSkinNote',
      placeholderKey: 'guidedEntryFieldSomaticSectionNotePlaceholder',
    },
    {
      id: 'neurologyFinding',
      type: 'select',
      labelKey: 'guidedEntryFieldSomaticNeurology',
      options: [...EXAM_FINDING_OPTIONS],
    },
    {
      id: 'neurologyNote',
      type: 'short_text',
      labelKey: 'guidedEntryFieldSomaticNeurologyNote',
      placeholderKey: 'guidedEntryFieldSomaticSectionNotePlaceholder',
    },
    {
      id: 'supplement',
      type: 'textarea',
      labelKey: 'guidedEntryFieldSomaticSupplement',
      placeholderKey: 'guidedEntryFieldSomaticSupplementPlaceholder',
    },
  ],
  steps: [
    {
      id: 'vitals',
      titleKey: 'guidedEntryStepSomaticVitals',
      fieldIds: [
        'examDate',
        'generalCondition',
        'bloodPressure',
        'pulse',
        'temperature',
        'spo2',
        'height',
        'weight',
      ],
    },
    {
      id: 'systems',
      titleKey: 'guidedEntryStepSomaticSystems',
      fieldIds: [
        'heartFinding',
        'heartNote',
        'lungsFinding',
        'lungsNote',
        'abdomenFinding',
        'abdomenNote',
        'extremitiesFinding',
        'extremitiesNote',
        'skinFinding',
        'skinNote',
        'neurologyFinding',
        'neurologyNote',
      ],
    },
    {
      id: 'supplement',
      titleKey: 'guidedEntryStepSomaticSupplement',
      fieldIds: ['supplement'],
    },
  ],
  generation: [
    {
      headingKey: 'guidedEntryGenSomaticGeneral',
      lines: ['{generalCondition}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticVitals',
      lines: ['{bloodPressure}', '{pulse}', '{temperature}', '{spo2}', '{height}', '{weight}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticHeart',
      lines: ['{heartFinding}', '{heartNote}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticLungs',
      lines: ['{lungsFinding}', '{lungsNote}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticAbdomen',
      lines: ['{abdomenFinding}', '{abdomenNote}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticExtremities',
      lines: ['{extremitiesFinding}', '{extremitiesNote}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticSkin',
      lines: ['{skinFinding}', '{skinNote}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticNeurology',
      lines: ['{neurologyFinding}', '{neurologyNote}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticSupplement',
      lines: ['{supplement}'],
    },
  ],
  output: {
    kind: 'verlauf-feed',
    verlaufPageType: 'somatic-befund',
  },
}
