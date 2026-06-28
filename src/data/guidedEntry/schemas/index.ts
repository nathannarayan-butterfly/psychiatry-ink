import type { GuidedEntryItemType, GuidedEntrySchema } from '../../../types/guidedEntry'
import { ecgBefundSchema } from './ecgBefund'
import { eegBefundSchema } from './eegBefund'
import { psychopathFindingSchema } from './psychopathFinding'
import { psychopathFindingQuickSchema } from './psychopathFindingQuick'
import { riskUpdateQuickSchema } from './riskUpdateQuick'
import { anamneseNeuroBefundSchema } from './anamneseNeuroBefund'
import { anamneseSomaticBefundSchema } from './anamneseSomaticBefund'
import { somaticBefundQuickSchema } from './somaticBefundQuick'
import { verlaufBroadSchema } from './verlaufBroad'
import { verlaufNoteQuickSchema } from './verlaufNoteQuick'
import { verlaufRisikoSchema } from './verlaufRisiko'
import { verlaufShortSchema } from './verlaufShort'
import { vitalsQuickSchema } from './vitalsQuick'

const REGISTRY: Record<GuidedEntryItemType, GuidedEntrySchema> = {
  'verlauf-short': verlaufShortSchema,
  'verlauf-broad': verlaufBroadSchema,
  'verlauf-risiko': verlaufRisikoSchema,
  'verlauf-note-quick': verlaufNoteQuickSchema,
  'psychopath-finding': psychopathFindingSchema,
  'psychopath-quick': psychopathFindingQuickSchema,
  'risk-update-quick': riskUpdateQuickSchema,
  'befund-ecg': ecgBefundSchema,
  'befund-eeg': eegBefundSchema,
  'somatic-befund-quick': somaticBefundQuickSchema,
  'vitalwerte-quick': vitalsQuickSchema,
  'anamnese-somatic-befund': anamneseSomaticBefundSchema,
  'anamnese-neuro-befund': anamneseNeuroBefundSchema,
}

export const GUIDED_ENTRY_ITEM_TYPES = Object.keys(REGISTRY) as GuidedEntryItemType[]

export function getGuidedEntrySchema(itemType: GuidedEntryItemType): GuidedEntrySchema {
  const schema = REGISTRY[itemType]
  if (!schema) throw new Error(`Unknown guided entry item type: ${itemType}`)
  return schema
}

export function listGuidedEntrySchemas(): GuidedEntrySchema[] {
  return Object.values(REGISTRY)
}

export function resolveGuidedItemTypeFromWorkspace(
  pageId: string,
  variantId?: string,
  sectionId?: string,
): GuidedEntryItemType | null {
  if (pageId === 'aufnahme' && sectionId === 'somatischer-befund') return 'anamnese-somatic-befund'
  if (pageId === 'aufnahme' && sectionId === 'neurologischer-befund') return 'anamnese-neuro-befund'
  if (pageId === 'befundung' && sectionId === 'befund-ecg') return 'befund-ecg'
  if (pageId === 'psychopath') return 'psychopath-finding'
  if (pageId === 'verlauf') {
    if (sectionId === 'risiko') return 'verlauf-risiko'
    if (variantId === 'broad') return 'verlauf-broad'
    return 'verlauf-short'
  }
  return null
}

export function isGuidedEntrySupported(
  pageId: string,
  variantId?: string,
  sectionId?: string,
): boolean {
  const itemType = resolveGuidedItemTypeFromWorkspace(pageId, variantId, sectionId)
  return itemType !== null && itemType in REGISTRY
}
