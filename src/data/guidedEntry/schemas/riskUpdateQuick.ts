import type { GuidedEntrySchema } from '../../../types/guidedEntry'

/** Compact risk update for Schnellaktion — suicide/violence/self-harm + note. */
export const riskUpdateQuickSchema: GuidedEntrySchema = {
  itemType: 'risk-update-quick',
  titleKey: 'overviewQuickRiskTitle',
  descriptionKey: 'overviewQuickRiskDesc',
  fields: [
    {
      id: 'assessmentDate',
      type: 'date',
      labelKey: 'guidedEntryFieldAssessmentDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'suicideRisk',
      type: 'select',
      labelKey: 'guidedEntryFieldSuicideRisk',
      required: true,
      options: [
        { id: 'none', labelKey: 'guidedEntryRiskNone' },
        { id: 'low', labelKey: 'guidedEntryRiskLow' },
        { id: 'moderate', labelKey: 'guidedEntryRiskModerate' },
        { id: 'high', labelKey: 'guidedEntryRiskHigh' },
      ],
    },
    {
      id: 'violenceRisk',
      type: 'select',
      labelKey: 'guidedEntryFieldViolenceRisk',
      required: true,
      options: [
        { id: 'none', labelKey: 'guidedEntryRiskNone' },
        { id: 'low', labelKey: 'guidedEntryRiskLow' },
        { id: 'moderate', labelKey: 'guidedEntryRiskModerate' },
        { id: 'high', labelKey: 'guidedEntryRiskHigh' },
      ],
    },
    {
      id: 'selfHarmRisk',
      type: 'select',
      labelKey: 'overviewQuickRiskSelfHarm',
      required: true,
      options: [
        { id: 'none', labelKey: 'guidedEntryRiskNone' },
        { id: 'low', labelKey: 'guidedEntryRiskLow' },
        { id: 'moderate', labelKey: 'guidedEntryRiskModerate' },
        { id: 'high', labelKey: 'guidedEntryRiskHigh' },
      ],
    },
    {
      id: 'note',
      type: 'textarea',
      labelKey: 'overviewQuickRiskNote',
      placeholderKey: 'overviewQuickRiskNotePlaceholder',
      required: true,
    },
  ],
  steps: [
    {
      id: 'quick',
      titleKey: 'overviewQuickRiskStepTitle',
      fieldIds: ['assessmentDate', 'suicideRisk', 'violenceRisk', 'selfHarmRisk', 'note'],
    },
  ],
  generation: [
    {
      headingKey: 'overviewQuickRiskGenAssessment',
      lines: ['{suicideRisk}', '{violenceRisk}', '{selfHarmRisk}'],
    },
    { headingKey: 'overviewQuickRiskGenNote', lines: ['{note}'] },
  ],
  output: {
    kind: 'workspace-section',
    documentTypeId: 'verlauf',
    variantId: 'broad',
    sectionId: 'risiko',
  },
}
