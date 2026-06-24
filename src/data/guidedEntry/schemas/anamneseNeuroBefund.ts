import type { GuidedEntrySchema } from '../../../types/guidedEntry'
import { neuroBefundFields } from './anamneseBefundFields'

/** Step-by-step neurological exam wizard for Aufnahme Anamnese (~10 steps). */
export const anamneseNeuroBefundSchema: GuidedEntrySchema = {
  itemType: 'anamnese-neuro-befund',
  titleKey: 'aufnahmeBefundNeuroGuidedTitle',
  descriptionKey: 'aufnahmeBefundNeuroGuidedDesc',
  fields: neuroBefundFields,
  steps: [
    {
      id: 'consciousness',
      titleKey: 'aufnahmeBefundStepNeuroConsciousness',
      fieldIds: ['consciousnessOrientation', 'consciousnessOrientationNote'],
    },
    {
      id: 'speech',
      titleKey: 'aufnahmeBefundStepNeuroSpeech',
      fieldIds: ['speech', 'speechNote'],
    },
    {
      id: 'motor',
      titleKey: 'aufnahmeBefundStepNeuroMotor',
      fieldIds: ['motor', 'motorNote'],
    },
    {
      id: 'sensitivity',
      titleKey: 'aufnahmeBefundStepNeuroSensitivity',
      fieldIds: ['sensitivity', 'sensitivityNote'],
    },
    {
      id: 'coordination',
      titleKey: 'aufnahmeBefundStepNeuroCoordination',
      fieldIds: ['coordination', 'coordinationNote'],
    },
    {
      id: 'gait',
      titleKey: 'aufnahmeBefundStepNeuroGait',
      fieldIds: ['gait', 'gaitNote'],
    },
    {
      id: 'epi-motor',
      titleKey: 'aufnahmeBefundStepNeuroEpiMotor',
      fieldIds: ['epiMotorFindings', 'epiMotorFindingsNote', 'extrapyramidalOther'],
    },
    {
      id: 'focal',
      titleKey: 'aufnahmeBefundStepNeuroFocal',
      fieldIds: ['focalDeficits', 'focalDeficitsNote'],
    },
    {
      id: 'events',
      titleKey: 'aufnahmeBefundStepNeuroEvents',
      fieldIds: ['seizuresSyncopeEvents', 'seizuresSyncopeEventsNote'],
    },
    {
      id: 'review',
      titleKey: 'aufnahmeBefundStepGenerate',
      fieldIds: [],
    },
  ],
  generation: [],
  output: {
    kind: 'workspace-section',
    documentTypeId: 'aufnahme',
    sectionId: 'neurologischer-befund',
  },
}
