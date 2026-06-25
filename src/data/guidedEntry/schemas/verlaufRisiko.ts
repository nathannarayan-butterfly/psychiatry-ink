import type { GuidedEntrySchema } from '../../../types/guidedEntry'

/** Focused risk/safety update — conditional follow-up step example. */
export const verlaufRisikoSchema: GuidedEntrySchema = {
  itemType: 'verlauf-risiko',
  titleKey: 'guidedEntryVerlaufRisikoTitle',
  descriptionKey: 'guidedEntryVerlaufRisikoDesc',
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
      id: 'suicideMeasures',
      type: 'checkbox_group',
      labelKey: 'guidedEntryFieldSuicideMeasures',
      showWhen: {
        id: 'sm',
        fieldId: 'suicideRisk',
        operator: 'not_equals',
        value: 'none',
      },
      options: [
        { id: 'observation', labelKey: 'guidedEntryMeasureObservation' },
        { id: 'contract', labelKey: 'guidedEntryMeasureContract' },
        { id: 'medication', labelKey: 'guidedEntryMeasureMedication' },
        { id: 'environment', labelKey: 'guidedEntryMeasureEnvironment' },
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
      id: 'violenceMeasures',
      type: 'textarea',
      labelKey: 'guidedEntryFieldViolenceMeasures',
      placeholderKey: 'guidedEntryFieldViolenceMeasuresPlaceholder',
      showWhen: {
        id: 'vm',
        fieldId: 'violenceRisk',
        operator: 'not_equals',
        value: 'none',
      },
    },
    {
      id: 'summary',
      type: 'textarea',
      labelKey: 'guidedEntryFieldRiskSummary',
      required: true,
    },
  ],
  steps: [
    {
      id: 'suicide',
      titleKey: 'guidedEntryStepSuicideRisk',
      fieldIds: ['assessmentDate', 'suicideRisk', 'suicideMeasures'],
    },
    {
      id: 'violence',
      titleKey: 'guidedEntryStepViolenceRisk',
      fieldIds: ['violenceRisk', 'violenceMeasures'],
    },
    {
      id: 'summary',
      titleKey: 'guidedEntryStepRiskSummary',
      fieldIds: ['summary'],
    },
  ],
  generation: [
    {
      headingKey: 'guidedEntryGenSuicideRisk',
      lines: ['{suicideRisk}', '{suicideMeasures}'],
    },
    {
      headingKey: 'guidedEntryGenViolenceRisk',
      lines: ['{violenceRisk}', '{violenceMeasures}'],
    },
    { headingKey: 'guidedEntryGenRiskSummary', lines: ['{summary}'] },
  ],
  output: {
    kind: 'workspace-section',
    documentTypeId: 'verlauf',
    variantId: 'broad',
    sectionId: 'risiko',
  },
}
