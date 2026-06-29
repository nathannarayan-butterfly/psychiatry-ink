import type { GuidedEntrySchema } from '../../../types/guidedEntry'

/**
 * Guided X-ray (Röntgen) report — mirrors the ECG/EEG befund schemas. Captures
 * the imaged region, technique, structured findings and the radiological
 * assessment, then assembles a deterministic narrative befund (#10).
 */
export const roentgenBefundSchema: GuidedEntrySchema = {
  itemType: 'befund-roentgen',
  titleKey: 'guidedEntryRoentgenTitle',
  descriptionKey: 'guidedEntryRoentgenDesc',
  fields: [
    {
      id: 'examDate',
      type: 'date',
      labelKey: 'guidedEntryFieldExamDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'region',
      type: 'select',
      labelKey: 'guidedEntryFieldRoentgenRegion',
      required: true,
      options: [
        { id: 'thorax', labelKey: 'guidedEntryRoentgenRegionThorax' },
        { id: 'abdomen', labelKey: 'guidedEntryRoentgenRegionAbdomen' },
        { id: 'skeleton', labelKey: 'guidedEntryRoentgenRegionSkeleton' },
        { id: 'spine', labelKey: 'guidedEntryRoentgenRegionSpine' },
        { id: 'skull', labelKey: 'guidedEntryRoentgenRegionSkull' },
        { id: 'other', labelKey: 'guidedEntryRoentgenRegionOther' },
      ],
    },
    {
      id: 'technique',
      type: 'short_text',
      labelKey: 'guidedEntryFieldRoentgenTechnique',
      placeholderKey: 'guidedEntryFieldRoentgenTechniquePlaceholder',
    },
    {
      id: 'findings',
      type: 'textarea',
      labelKey: 'guidedEntryFieldRoentgenFindings',
      placeholderKey: 'guidedEntryFieldRoentgenFindingsPlaceholder',
      required: true,
    },
    {
      id: 'assessment',
      type: 'textarea',
      labelKey: 'guidedEntryFieldRoentgenAssessment',
      required: true,
    },
  ],
  steps: [
    {
      id: 'basics',
      titleKey: 'guidedEntryStepRoentgenBasics',
      fieldIds: ['examDate', 'region', 'technique'],
    },
    {
      id: 'findings',
      titleKey: 'guidedEntryStepRoentgenFindings',
      fieldIds: ['findings', 'assessment'],
    },
  ],
  generation: [
    { headingKey: 'guidedEntryGenRoentgenTechnique', lines: ['{region}', '{technique}'] },
    { headingKey: 'guidedEntryGenRoentgenFindings', lines: ['{findings}'] },
    { headingKey: 'guidedEntryGenRoentgenAssessment', lines: ['{assessment}'] },
  ],
  // Patient-less only: the standalone widget captures the generated narrative and
  // saves it as a global note (it never calls `applyGuidedOutput`). The output
  // target is therefore informational; we intentionally do NOT route X-ray into
  // the patient `befund-record` store, which would require widening the core
  // `BefundType` across the Diagnostik/Anforderung subsystem (deferred).
  output: {
    kind: 'workspace-document',
  },
}
