import type { GuidedEntrySchema } from '../../../types/guidedEntry'

/** Compact Schnell-Befund — essential AMDP domains for overview quick entry. */
export const psychopathFindingQuickSchema: GuidedEntrySchema = {
  itemType: 'psychopath-quick',
  titleKey: 'overviewQuickPsychopathTitle',
  descriptionKey: 'overviewQuickPsychopathDesc',
  fields: [
    {
      id: 'examDate',
      type: 'date',
      labelKey: 'guidedEntryFieldExamDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'consciousness',
      type: 'select',
      labelKey: 'overviewQuickPsychopathConsciousness',
      required: true,
      options: [
        { id: 'clear', labelKey: 'overviewQuickPsychopathConsciousnessClear' },
        { id: 'clouded', labelKey: 'overviewQuickPsychopathConsciousnessClouded' },
        { id: 'somnolent', labelKey: 'overviewQuickPsychopathConsciousnessSomnolent' },
        { id: 'stupor', labelKey: 'overviewQuickPsychopathConsciousnessStupor' },
      ],
    },
    {
      id: 'orientation',
      type: 'select',
      labelKey: 'overviewQuickPsychopathOrientation',
      required: true,
      options: [
        { id: 'oriented', labelKey: 'overviewQuickPsychopathOrientationFull' },
        { id: 'partial', labelKey: 'overviewQuickPsychopathOrientationPartial' },
        { id: 'disoriented', labelKey: 'overviewQuickPsychopathOrientationDisoriented' },
      ],
    },
    {
      id: 'mood',
      type: 'select',
      labelKey: 'guidedEntryFieldMood',
      required: true,
      options: [
        { id: 'euthym', labelKey: 'guidedEntryMoodEuthym' },
        { id: 'depressed', labelKey: 'guidedEntryMoodDepressed' },
        { id: 'elevated', labelKey: 'guidedEntryMoodElevated' },
        { id: 'anxious', labelKey: 'guidedEntryMoodAnxious' },
        { id: 'irritable', labelKey: 'guidedEntryMoodIrritable' },
        { id: 'labile', labelKey: 'guidedEntryMoodLabile' },
      ],
    },
    {
      id: 'drive',
      type: 'select',
      labelKey: 'overviewQuickPsychopathDrive',
      required: true,
      options: [
        { id: 'normal', labelKey: 'overviewQuickPsychopathDriveNormal' },
        { id: 'reduced', labelKey: 'overviewQuickPsychopathDriveReduced' },
        { id: 'increased', labelKey: 'overviewQuickPsychopathDriveIncreased' },
        { id: 'inhibited', labelKey: 'overviewQuickPsychopathDriveInhibited' },
        { id: 'agitated', labelKey: 'overviewQuickPsychopathDriveAgitated' },
      ],
    },
    {
      id: 'suicidality',
      type: 'select',
      labelKey: 'overviewQuickPsychopathSuicidality',
      required: true,
      options: [
        { id: 'none', labelKey: 'overviewQuickPsychopathSuicidalityNone' },
        { id: 'passive', labelKey: 'overviewQuickPsychopathSuicidalityPassive' },
        { id: 'active', labelKey: 'overviewQuickPsychopathSuicidalityActive' },
        { id: 'attempt', labelKey: 'overviewQuickPsychopathSuicidalityAttempt' },
        { id: 'unclear', labelKey: 'overviewQuickPsychopathSuicidalityUnclear' },
      ],
    },
    {
      id: 'psychoticSymptoms',
      type: 'yes_no',
      labelKey: 'guidedEntryFieldPsychoticSymptoms',
      required: true,
    },
    {
      id: 'psychoticDetails',
      type: 'textarea',
      labelKey: 'guidedEntryFieldPsychoticDetails',
      placeholderKey: 'overviewQuickPsychopathPsychoticPlaceholder',
      showWhen: { id: 'pd', fieldId: 'psychoticSymptoms', operator: 'checked' },
    },
    {
      id: 'additionalNotes',
      type: 'textarea',
      labelKey: 'overviewQuickPsychopathAdditionalNotes',
      placeholderKey: 'overviewQuickPsychopathAdditionalNotesPlaceholder',
    },
  ],
  steps: [
    {
      id: 'quick',
      titleKey: 'overviewQuickPsychopathStepTitle',
      fieldIds: [
        'examDate',
        'consciousness',
        'orientation',
        'mood',
        'drive',
        'suicidality',
        'psychoticSymptoms',
        'psychoticDetails',
        'additionalNotes',
      ],
    },
  ],
  generation: [
    {
      headingKey: 'overviewQuickPsychopathGenCore',
      lines: ['{consciousness}', '{orientation}', '{mood}', '{drive}', '{suicidality}'],
    },
    {
      headingKey: 'guidedEntryGenPsychotic',
      showWhen: { id: 'ps', fieldId: 'psychoticSymptoms', operator: 'checked' },
      lines: ['{psychoticDetails}'],
    },
    {
      headingKey: 'overviewQuickPsychopathGenNotes',
      lines: ['{additionalNotes}'],
    },
  ],
  output: {
    kind: 'psychopath-overview',
  },
}
