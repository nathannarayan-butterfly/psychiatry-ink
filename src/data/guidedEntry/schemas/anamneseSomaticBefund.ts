import type { GuidedEntrySchema } from '../../../types/guidedEntry'
import { somaticBefundFields } from './anamneseBefundFields'

/** Step-by-step somatic exam wizard for Aufnahme Anamnese (~10 steps). */
export const anamneseSomaticBefundSchema: GuidedEntrySchema = {
  itemType: 'anamnese-somatic-befund',
  titleKey: 'aufnahmeBefundSomaticGuidedTitle',
  descriptionKey: 'aufnahmeBefundSomaticGuidedDesc',
  fields: somaticBefundFields,
  steps: [
    {
      id: 'general',
      titleKey: 'aufnahmeBefundStepSomaticGeneral',
      fieldIds: ['generalCondition', 'generalConditionNote'],
    },
    {
      id: 'nutrition',
      titleKey: 'aufnahmeBefundStepSomaticNutrition',
      fieldIds: ['nutritionalState', 'nutritionalStateNote'],
    },
    {
      id: 'complaints',
      titleKey: 'aufnahmeBefundStepSomaticComplaints',
      fieldIds: ['currentComplaints', 'currentComplaintsNote'],
    },
    {
      id: 'vitals',
      titleKey: 'aufnahmeBefundStepSomaticVitals',
      fieldIds: ['vitals', 'vitalsNote'],
    },
    {
      id: 'heart',
      titleKey: 'aufnahmeBefundStepSomaticHeart',
      fieldIds: ['heartCirculation', 'heartCirculationNote'],
    },
    {
      id: 'lungs',
      titleKey: 'aufnahmeBefundStepSomaticLungs',
      fieldIds: ['lungs', 'lungsNote'],
    },
    {
      id: 'abdomen',
      titleKey: 'aufnahmeBefundStepSomaticAbdomen',
      fieldIds: ['abdomen', 'abdomenNote'],
    },
    {
      id: 'pain-injury',
      titleKey: 'aufnahmeBefundStepSomaticPainInjury',
      fieldIds: [
        'pain',
        'painNote',
        'intoxWithdrawalInfectionInjury',
        'intoxWithdrawalInfectionInjuryNote',
      ],
    },
    {
      id: 'history',
      titleKey: 'aufnahmeBefundStepSomaticHistory',
      fieldIds: ['somaticHistory', 'somaticHistoryNote', 'otherFindings'],
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
    sectionId: 'somatischer-befund',
  },
}
