import type { GuidedEntrySchema } from '../../../types/guidedEntry'

export const verlaufShortSchema: GuidedEntrySchema = {
  itemType: 'verlauf-short',
  titleKey: 'guidedEntryVerlaufShortTitle',
  descriptionKey: 'guidedEntryVerlaufShortDesc',
  fields: [
    {
      id: 'visitDate',
      type: 'date',
      labelKey: 'guidedEntryFieldVisitDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'setting',
      type: 'select',
      labelKey: 'guidedEntryFieldSetting',
      required: true,
      options: [
        { id: 'ward_round', labelKey: 'guidedEntrySettingWardRound' },
        { id: 'visit', labelKey: 'guidedEntrySettingVisit' },
        { id: 'phone', labelKey: 'guidedEntrySettingPhone' },
        { id: 'outpatient', labelKey: 'guidedEntrySettingOutpatient' },
      ],
    },
    {
      id: 'subjective',
      type: 'textarea',
      labelKey: 'guidedEntryFieldSubjective',
      placeholderKey: 'guidedEntryFieldSubjectivePlaceholder',
      required: true,
    },
    {
      id: 'mentalState',
      type: 'textarea',
      labelKey: 'guidedEntryFieldMentalState',
      placeholderKey: 'guidedEntryFieldMentalStatePlaceholder',
      prefillPath: 'case.psychopathSummary',
    },
    {
      id: 'behavior',
      type: 'textarea',
      labelKey: 'guidedEntryFieldBehavior',
      placeholderKey: 'guidedEntryFieldBehaviorPlaceholder',
    },
    {
      id: 'medicationTolerance',
      type: 'textarea',
      labelKey: 'guidedEntryFieldMedTolerance',
      placeholderKey: 'guidedEntryFieldMedTolerancePlaceholder',
      prefillPath: 'case.medications',
    },
    {
      id: 'plan',
      type: 'textarea',
      labelKey: 'guidedEntryFieldPlan',
      placeholderKey: 'guidedEntryFieldPlanPlaceholder',
      required: true,
    },
  ],
  steps: [
    {
      id: 'context',
      titleKey: 'guidedEntryStepContext',
      descriptionKey: 'guidedEntryStepContextDesc',
      fieldIds: ['visitDate', 'setting'],
    },
    {
      id: 'clinical',
      titleKey: 'guidedEntryStepClinical',
      descriptionKey: 'guidedEntryStepClinicalDesc',
      fieldIds: ['subjective', 'mentalState', 'behavior'],
    },
    {
      id: 'planning',
      titleKey: 'guidedEntryStepPlanning',
      descriptionKey: 'guidedEntryStepPlanningDesc',
      fieldIds: ['medicationTolerance', 'plan'],
    },
  ],
  generation: [
    {
      headingKey: 'guidedEntryGenSubjective',
      lines: ['{subjective}'],
    },
    {
      headingKey: 'guidedEntryGenMentalState',
      lines: ['{mentalState}'],
    },
    {
      headingKey: 'guidedEntryGenBehavior',
      lines: ['{behavior}'],
    },
    {
      headingKey: 'guidedEntryGenMedTolerance',
      lines: ['{medicationTolerance}'],
    },
    {
      headingKey: 'guidedEntryGenPlan',
      lines: ['{plan}'],
    },
  ],
  output: {
    kind: 'verlauf-feed',
    verlaufPageType: 'verlauf',
  },
}
