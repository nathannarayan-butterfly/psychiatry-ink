import type { GuidedEntrySchema } from '../../../types/guidedEntry'

export const ecgBefundSchema: GuidedEntrySchema = {
  itemType: 'befund-ecg',
  titleKey: 'guidedEntryEcgTitle',
  descriptionKey: 'guidedEntryEcgDesc',
  fields: [
    {
      id: 'examDate',
      type: 'date',
      labelKey: 'guidedEntryFieldExamDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'rhythm',
      type: 'checkbox_group',
      labelKey: 'guidedEntryFieldEcgRhythm',
      required: true,
      options: [
        { id: 'sinus', labelKey: 'guidedEntryEcgRhythmSinus' },
        { id: 'af', labelKey: 'guidedEntryEcgRhythmAf' },
        { id: 'aflutter', labelKey: 'guidedEntryEcgRhythmFlutter' },
        { id: 'irregular', labelKey: 'guidedEntryEcgRhythmIrregular' },
      ],
    },
    {
      id: 'rate',
      type: 'short_text',
      labelKey: 'guidedEntryFieldEcgRate',
      placeholderKey: 'guidedEntryFieldEcgRatePlaceholder',
    },
    {
      id: 'axis',
      type: 'select',
      labelKey: 'guidedEntryFieldEcgAxis',
      options: [
        { id: 'normal', labelKey: 'guidedEntryEcgAxisNormal' },
        { id: 'left', labelKey: 'guidedEntryEcgAxisLeft' },
        { id: 'right', labelKey: 'guidedEntryEcgAxisRight' },
        { id: 'indeterminate', labelKey: 'guidedEntryEcgAxisIndeterminate' },
      ],
    },
    {
      id: 'intervals',
      type: 'textarea',
      labelKey: 'guidedEntryFieldEcgIntervals',
      placeholderKey: 'guidedEntryFieldEcgIntervalsPlaceholder',
    },
    {
      id: 'stT',
      type: 'textarea',
      labelKey: 'guidedEntryFieldEcgStT',
    },
    {
      id: 'conclusion',
      type: 'textarea',
      labelKey: 'guidedEntryFieldEcgConclusion',
      required: true,
    },
  ],
  steps: [
    {
      id: 'basics',
      titleKey: 'guidedEntryStepEcgBasics',
      fieldIds: ['examDate', 'rhythm', 'rate', 'axis'],
    },
    {
      id: 'morphology',
      titleKey: 'guidedEntryStepEcgMorphology',
      fieldIds: ['intervals', 'stT'],
    },
    {
      id: 'conclusion',
      titleKey: 'guidedEntryStepEcgConclusion',
      fieldIds: ['conclusion'],
    },
  ],
  generation: [
    {
      headingKey: 'guidedEntryGenEcgRhythm',
      lines: ['{rhythm}', '{rate}'],
    },
    { headingKey: 'guidedEntryGenEcgAxis', lines: ['{axis}'] },
    { headingKey: 'guidedEntryGenEcgIntervals', lines: ['{intervals}'] },
    { headingKey: 'guidedEntryGenEcgStT', lines: ['{stT}'] },
    { headingKey: 'guidedEntryGenEcgConclusion', lines: ['{conclusion}'] },
  ],
  output: {
    kind: 'befund-record',
    befundType: 'ecg',
  },
}
