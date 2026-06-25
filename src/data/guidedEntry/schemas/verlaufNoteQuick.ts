import type { GuidedEntrySchema } from '../../../types/guidedEntry'

/** Minimal Verlauf note for Schnellaktion — short text + optional status. */
export const verlaufNoteQuickSchema: GuidedEntrySchema = {
  itemType: 'verlauf-note-quick',
  titleKey: 'overviewQuickVerlaufTitle',
  descriptionKey: 'overviewQuickVerlaufDesc',
  fields: [
    {
      id: 'visitDate',
      type: 'date',
      labelKey: 'guidedEntryFieldVisitDate',
      required: true,
      prefillPath: 'system.date',
    },
    {
      id: 'note',
      type: 'textarea',
      labelKey: 'overviewQuickVerlaufNote',
      placeholderKey: 'overviewQuickVerlaufNotePlaceholder',
      required: true,
    },
    {
      id: 'status',
      type: 'select',
      labelKey: 'overviewQuickVerlaufStatus',
      options: [
        { id: 'stable', labelKey: 'overviewQuickVerlaufStatusStable' },
        { id: 'improved', labelKey: 'overviewQuickVerlaufStatusImproved' },
        { id: 'worsened', labelKey: 'overviewQuickVerlaufStatusWorsened' },
        { id: 'new', labelKey: 'overviewQuickVerlaufStatusNew' },
      ],
    },
    {
      id: 'mentalState',
      type: 'textarea',
      labelKey: 'overviewQuickVerlaufMentalState',
      placeholderKey: 'guidedEntryFieldMentalStatePlaceholder',
      prefillPath: 'case.psychopathSummary',
    },
  ],
  steps: [
    {
      id: 'quick',
      titleKey: 'overviewQuickVerlaufStepTitle',
      fieldIds: ['visitDate', 'note', 'status', 'mentalState'],
    },
  ],
  generation: [
    { headingKey: 'overviewQuickVerlaufGenNote', lines: ['{note}'] },
    { headingKey: 'overviewQuickVerlaufGenStatus', lines: ['{status}'] },
    { headingKey: 'guidedEntryGenMentalState', lines: ['{mentalState}'] },
  ],
  output: {
    kind: 'verlauf-feed',
    verlaufPageType: 'verlauf',
  },
}
