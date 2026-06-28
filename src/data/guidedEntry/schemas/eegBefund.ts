import type { GuidedEntrySchema } from '../../../types/guidedEntry'

/**
 * Guided EEG finding schema for the patient-less ("standalone") workspace.
 *
 * Mirrors {@link ecgBefundSchema} in shape but is deliberately standalone-only:
 * its `output` is a plain `workspace-document` (a free-standing note) — NOT a
 * `befund-record`. The standalone Befund widget never calls `applyGuidedOutput`,
 * so this schema only ever produces editable narrative text that is saved as a
 * standalone note; it must never write a diagnostic befund record on a case.
 */
export const eegBefundSchema: GuidedEntrySchema = {
  itemType: 'befund-eeg',
  titleKey: 'guidedEntryEegTitle',
  descriptionKey: 'guidedEntryEegDesc',
  fields: [
    {
      id: 'examDate',
      type: 'date',
      labelKey: 'guidedEntryFieldExamDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'recordingType',
      type: 'select',
      labelKey: 'guidedEntryFieldEegRecordingType',
      options: [
        { id: 'routine', labelKey: 'guidedEntryEegRecordingRoutine' },
        { id: 'sleep', labelKey: 'guidedEntryEegRecordingSleep' },
        { id: 'sleepDeprived', labelKey: 'guidedEntryEegRecordingSleepDeprived' },
        { id: 'longterm', labelKey: 'guidedEntryEegRecordingLongterm' },
      ],
    },
    {
      id: 'backgroundRhythm',
      type: 'checkbox_group',
      labelKey: 'guidedEntryFieldEegBackground',
      required: true,
      options: [
        { id: 'alphaNormal', labelKey: 'guidedEntryEegBackgroundAlphaNormal' },
        { id: 'alphaSlowed', labelKey: 'guidedEntryEegBackgroundAlphaSlowed' },
        { id: 'disorganized', labelKey: 'guidedEntryEegBackgroundDisorganized' },
        { id: 'lowVoltage', labelKey: 'guidedEntryEegBackgroundLowVoltage' },
      ],
    },
    {
      id: 'symmetry',
      type: 'select',
      labelKey: 'guidedEntryFieldEegSymmetry',
      options: [
        { id: 'symmetric', labelKey: 'guidedEntryEegSymmetrySymmetric' },
        { id: 'asymmetric', labelKey: 'guidedEntryEegSymmetryAsymmetric' },
      ],
    },
    {
      id: 'epileptiform',
      type: 'checkbox_group',
      labelKey: 'guidedEntryFieldEegEpileptiform',
      options: [
        { id: 'none', labelKey: 'guidedEntryEegEpileptiformNone' },
        { id: 'focalSharp', labelKey: 'guidedEntryEegEpileptiformFocalSharp' },
        { id: 'spikeWave', labelKey: 'guidedEntryEegEpileptiformSpikeWave' },
        { id: 'generalized', labelKey: 'guidedEntryEegEpileptiformGeneralized' },
      ],
    },
    {
      id: 'slowing',
      type: 'textarea',
      labelKey: 'guidedEntryFieldEegSlowing',
      placeholderKey: 'guidedEntryFieldEegSlowingPlaceholder',
    },
    {
      id: 'activation',
      type: 'textarea',
      labelKey: 'guidedEntryFieldEegActivation',
      placeholderKey: 'guidedEntryFieldEegActivationPlaceholder',
    },
    {
      id: 'conclusion',
      type: 'textarea',
      labelKey: 'guidedEntryFieldEegConclusion',
      required: true,
    },
  ],
  steps: [
    {
      id: 'basics',
      titleKey: 'guidedEntryStepEegBasics',
      fieldIds: ['examDate', 'recordingType', 'backgroundRhythm', 'symmetry'],
    },
    {
      id: 'findings',
      titleKey: 'guidedEntryStepEegFindings',
      fieldIds: ['epileptiform', 'slowing', 'activation'],
    },
    {
      id: 'conclusion',
      titleKey: 'guidedEntryStepEegConclusion',
      fieldIds: ['conclusion'],
    },
  ],
  generation: [
    {
      headingKey: 'guidedEntryGenEegBackground',
      lines: ['{recordingType}', '{backgroundRhythm}', '{symmetry}'],
    },
    { headingKey: 'guidedEntryGenEegEpileptiform', lines: ['{epileptiform}', '{slowing}'] },
    { headingKey: 'guidedEntryGenEegActivation', lines: ['{activation}'] },
    { headingKey: 'guidedEntryGenEegConclusion', lines: ['{conclusion}'] },
  ],
  // Standalone-only: a free-standing note, never a diagnostic befund record.
  output: {
    kind: 'workspace-document',
    documentTypeId: 'befundung',
  },
}
