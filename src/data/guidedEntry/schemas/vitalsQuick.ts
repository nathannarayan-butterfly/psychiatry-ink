import type { GuidedEntrySchema } from '../../../types/guidedEntry'

/**
 * Focused vital-signs entry for the Verlauf feed. A lightweight subset of the
 * somatic-Befund quick exam — general condition + the core vitals — for fast
 * documentation of Vitalwerte without the full system review (Item 5). Saved as
 * a normal Verlauf text entry.
 */
export const vitalsQuickSchema: GuidedEntrySchema = {
  itemType: 'vitalwerte-quick',
  titleKey: 'verlaufVitalsModalTitle',
  descriptionKey: 'verlaufVitalsModalDesc',
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
  ],
  // The narrative is assembled by the dedicated `generateVitalsNarrative` path
  // (label: value lines); these segments are a deterministic fallback.
  generation: [
    {
      headingKey: 'guidedEntryGenSomaticGeneral',
      lines: ['{generalCondition}'],
    },
    {
      headingKey: 'guidedEntryGenSomaticVitals',
      lines: ['{bloodPressure}', '{pulse}', '{temperature}', '{spo2}', '{height}', '{weight}'],
    },
  ],
  output: {
    kind: 'verlauf-feed',
    verlaufPageType: 'verlauf',
  },
}
