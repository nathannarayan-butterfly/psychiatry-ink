import type { GuidedEntrySchema } from '../../../types/guidedEntry'
import { defaultPsychopathSections } from '../../psychopathSections'
import {
  gePpbItemLabelKey,
  gePpbStepDescKey,
  gePpbStepTitleKey,
} from '../psychopathGuidedLabels'

export function buildPsychopathFindingSchema(): GuidedEntrySchema {
  const fields: GuidedEntrySchema['fields'] = [
    {
      id: 'examDate',
      type: 'date',
      labelKey: 'guidedEntryFieldExamDate',
      required: true,
      prefillPath: 'system.date',
    },
  ]

  const steps: GuidedEntrySchema['steps'] = [
    {
      id: 'exam-date',
      titleKey: 'guidedEntryStepPpbExamDate',
      fieldIds: ['examDate'],
    },
  ]

  for (const section of defaultPsychopathSections) {
    const checklistFieldId = `ppb-${section.id}`
    const notesFieldId = `ppb-notes-${section.id}`

    fields.push({
      id: checklistFieldId,
      type: 'checkbox_group',
      labelKey: gePpbStepTitleKey(section.id),
      options: (section.checklistItems ?? []).map((item) => ({
        id: item.id,
        labelKey: gePpbItemLabelKey(item.id),
      })),
    })

    fields.push({
      id: notesFieldId,
      type: 'textarea',
      labelKey: 'guidedEntryPpbSectionNotes',
      placeholderKey: 'guidedEntryPpbSectionNotesPlaceholder',
    })

    steps.push({
      id: section.id,
      titleKey: gePpbStepTitleKey(section.id),
      descriptionKey: section.description ? gePpbStepDescKey(section.id) : undefined,
      fieldIds: [checklistFieldId, notesFieldId],
    })
  }

  return {
    itemType: 'psychopath-finding',
    titleKey: 'guidedEntryPsychopathTitle',
    descriptionKey: 'guidedEntryPsychopathDesc',
    fields,
    steps,
    generation: [{ lines: ['{examDate}'] }],
    output: {
      kind: 'workspace-document',
      documentTypeId: 'psychopath',
      variantId: 'free',
    },
  }
}
