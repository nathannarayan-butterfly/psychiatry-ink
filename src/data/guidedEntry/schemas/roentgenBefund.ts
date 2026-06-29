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
  // Patient-context: routes the generated narrative into the case Diagnostik
  // `befund-record` store as a structured Röntgen befund (mirrors the ECG guided
  // flow). The field ids above match `roentgenSchema` so answers map 1:1 onto the
  // structured befund and render via the generic befund renderer. The standalone
  // (patient-less) widget never calls `applyGuidedOutput`, so it keeps saving the
  // narrative as a free-standing note regardless of this output target.
  output: {
    kind: 'befund-record',
    befundType: 'roentgen',
  },
}
