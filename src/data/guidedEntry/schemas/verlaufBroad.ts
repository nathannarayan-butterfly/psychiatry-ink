import type { GuidedEntrySchema } from '../../../types/guidedEntry'

export const verlaufBroadSchema: GuidedEntrySchema = {
  itemType: 'verlauf-broad',
  titleKey: 'guidedEntryVerlaufBroadTitle',
  descriptionKey: 'guidedEntryVerlaufBroadDesc',
  fields: [
    {
      id: 'visitDate',
      type: 'date',
      labelKey: 'guidedEntryFieldVisitDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'psychopathologie',
      type: 'textarea',
      labelKey: 'guidedEntryFieldPsychopathologie',
      prefillPath: 'case.psychopathSummary',
    },
    {
      id: 'stationsverhalten',
      type: 'textarea',
      labelKey: 'guidedEntryFieldStationsverhalten',
    },
    {
      id: 'risikoPresent',
      type: 'yes_no',
      labelKey: 'guidedEntryFieldRisikoPresent',
      required: true,
    },
    {
      id: 'risikoDetails',
      type: 'textarea',
      labelKey: 'guidedEntryFieldRisikoDetails',
      placeholderKey: 'guidedEntryFieldRisikoDetailsPlaceholder',
      showWhen: { id: 'rd', fieldId: 'risikoPresent', operator: 'checked' },
    },
    {
      id: 'compliance',
      type: 'textarea',
      labelKey: 'guidedEntryFieldCompliance',
    },
    {
      id: 'medikation',
      type: 'textarea',
      labelKey: 'guidedEntryFieldMedikationVerlauf',
      prefillPath: 'case.medications',
    },
    {
      id: 'beurteilungPlan',
      type: 'textarea',
      labelKey: 'guidedEntryFieldBeurteilungPlan',
      required: true,
    },
  ],
  steps: [
    {
      id: 'date',
      titleKey: 'guidedEntryStepDate',
      fieldIds: ['visitDate'],
    },
    {
      id: 'psychopath',
      titleKey: 'guidedEntryStepPsychopathologie',
      fieldIds: ['psychopathologie', 'stationsverhalten'],
    },
    {
      id: 'risiko',
      titleKey: 'guidedEntryStepRisiko',
      descriptionKey: 'guidedEntryStepRisikoDesc',
      fieldIds: ['risikoPresent', 'risikoDetails'],
    },
    {
      id: 'rest',
      titleKey: 'guidedEntryStepRestVerlauf',
      fieldIds: ['compliance', 'medikation', 'beurteilungPlan'],
    },
  ],
  generation: [
    { headingKey: 'guidedEntrySectionPsychopathologie', lines: ['{psychopathologie}'] },
    { headingKey: 'guidedEntrySectionStationsverhalten', lines: ['{stationsverhalten}'] },
    {
      headingKey: 'guidedEntrySectionRisiko',
      showWhen: { id: 'rp', fieldId: 'risikoPresent', operator: 'checked' },
      lines: ['{risikoDetails}'],
    },
    { headingKey: 'guidedEntrySectionCompliance', lines: ['{compliance}'] },
    { headingKey: 'guidedEntrySectionMedikation', lines: ['{medikation}'] },
    { headingKey: 'guidedEntrySectionBeurteilungPlan', lines: ['{beurteilungPlan}'] },
  ],
  output: {
    kind: 'workspace-document',
    documentTypeId: 'verlauf',
    variantId: 'broad',
  },
}
