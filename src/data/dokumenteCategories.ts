import type { DokumentCategory } from '../utils/dokumenteArchive'

export type CategoryFilter = 'all' | DokumentCategory

export type DokumenteCategoryLabelKey =
  | 'dokumenteCategoryAll'
  | 'dokumenteCategoryAnamnese'
  | 'dokumenteCategoryArztbrief'
  | 'dokumenteCategoryLaborbefunde'
  | 'dokumenteCategoryUntersuchungsbefunde'
  | 'dokumenteCategoryExterneBefunde'
  | 'dokumenteCategoryFormulare'

export interface CategoryTabConfig {
  id: CategoryFilter
  labelKey: DokumenteCategoryLabelKey
}

export const CATEGORY_TABS: CategoryTabConfig[] = [
  { id: 'all', labelKey: 'dokumenteCategoryAll' },
  { id: 'anamnese', labelKey: 'dokumenteCategoryAnamnese' },
  { id: 'arztbrief', labelKey: 'dokumenteCategoryArztbrief' },
  { id: 'laborbefunde', labelKey: 'dokumenteCategoryLaborbefunde' },
  { id: 'untersuchungsbefunde', labelKey: 'dokumenteCategoryUntersuchungsbefunde' },
  { id: 'externe-befunde', labelKey: 'dokumenteCategoryExterneBefunde' },
  { id: 'formulare', labelKey: 'dokumenteCategoryFormulare' },
]

/** Display order for grouped category sections in the "All" view. */
export const CATEGORY_ORDER: DokumentCategory[] = [
  'anamnese',
  'arztbrief',
  'laborbefunde',
  'untersuchungsbefunde',
  'externe-befunde',
  'formulare',
]

export function getCategoryLabelKey(category: DokumentCategory): DokumenteCategoryLabelKey {
  switch (category) {
    case 'anamnese': return 'dokumenteCategoryAnamnese'
    case 'arztbrief': return 'dokumenteCategoryArztbrief'
    case 'laborbefunde': return 'dokumenteCategoryLaborbefunde'
    case 'untersuchungsbefunde': return 'dokumenteCategoryUntersuchungsbefunde'
    case 'externe-befunde': return 'dokumenteCategoryExterneBefunde'
    case 'formulare': return 'dokumenteCategoryFormulare'
  }
}
