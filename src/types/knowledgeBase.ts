export type DrugSectionKey =
  | 'kurzprofil'
  | 'wirkmechanismus'
  | 'rezeptorprofil'
  | 'indikationen'
  | 'dosierung'
  | 'nebenwirkungen'
  | 'kontraindikationen'
  | 'wechselwirkungen'
  | 'kontrollen'
  | 'besonderheiten'
  | 'umstellung'
  | 'schwangerschaft'
  | 'niereLeber'
  | 'merksaetze'
  | 'quellen'
  | 'custom'

export interface DrugSection {
  id: string
  key: DrugSectionKey
  label: string
  content: string
  isDefault: boolean
  isCollapsedByDefault: boolean
  order: number
  hidden: boolean
}

export type DrugStatus = 'active' | 'inactive'

export type DrugCategory =
  | 'Antipsychotika'
  | 'Antidepressiva'
  | 'Phasenprophylaktika'
  | 'Benzodiazepine'
  | 'Hypnotika'
  | 'ADHS'
  | 'Antidemenz'
  | 'Suchtmedizin'
  | 'Notfallmedikation'
  | 'Depotpräparate'

export const DRUG_CATEGORIES: DrugCategory[] = [
  'Antipsychotika',
  'Antidepressiva',
  'Phasenprophylaktika',
  'Benzodiazepine',
  'Hypnotika',
  'ADHS',
  'Antidemenz',
  'Suchtmedizin',
  'Notfallmedikation',
  'Depotpräparate',
]

/** Receptor-profile pharmacodynamic action types (clinician-entered). */
export type ReceptorAction =
  | 'antagonist'
  | 'partial-agonist'
  | 'agonist'
  | 'reuptake-inhibition'
  | 'unknown'

/** Confidence / provenance of a single receptor score. */
export type ReceptorConfidence = 'curated' | 'estimated' | 'unknown'

/**
 * Detailed receptor-profile entry. Scores use a 0–5 affinity/strength scale:
 * 0 none · 1 negligible · 2 mild · 3 moderate · 4 strong · 5 dominant.
 */
export interface ReceptorProfileDetail {
  /** 0..5 affinity / strength score */
  score: number
  action?: ReceptorAction
  clinicalMeaning?: string
  confidence?: ReceptorConfidence
}

export interface KnowledgeBaseDrug {
  id: string
  collectionId?: string
  genericName: string
  brandNames: string[]
  drugClass: string
  category: string
  atcCode?: string
  tags?: string[]
  status: DrugStatus
  authorEditor?: string
  createdAt: string
  updatedAt: string
  sections: DrugSection[]
  /** receptor key → score 0..5 (compact map used by visualisations) */
  receptorProfile?: Record<string, number>
  /** receptor key → structured detail (action, clinical note, confidence) */
  receptorProfileDetails?: Record<string, ReceptorProfileDetail>
}

// ── Knowledge Collections ────────────────────────────────────────────────────
// The Wissensdatenbank is organized as a library of Sammlungen (collections).
// Each collection has a template type that determines its inner view:
//   - 'notes'        → free-text note entries (title + content + tags)
//   - 'medications'  → structured 15-section drug profiles

export type KnowledgeCollectionType = 'notes' | 'medications'

export interface KnowledgeCollection {
  id: string
  name: string
  type: KnowledgeCollectionType
  icon?: string
  color?: string
  /** true for the two seeded collections; defaults may be renamed but not deleted */
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

/** Stable IDs for the seeded collections; existing data migrates onto these. */
export const DEFAULT_NOTES_COLLECTION_ID = 'kb-collection-notes-default'
export const DEFAULT_MEDICATIONS_COLLECTION_ID = 'kb-collection-medications-default'

const COLLECTIONS_SEED_TS = '2024-01-01T00:00:00.000Z'

export const DEFAULT_KNOWLEDGE_COLLECTIONS: KnowledgeCollection[] = [
  {
    id: DEFAULT_MEDICATIONS_COLLECTION_ID,
    name: 'Psychopharmakologie',
    type: 'medications',
    icon: 'flask',
    color: '#7c3aed',
    isDefault: true,
    createdAt: COLLECTIONS_SEED_TS,
    updatedAt: COLLECTIONS_SEED_TS,
  },
  {
    id: DEFAULT_NOTES_COLLECTION_ID,
    name: 'Klinisches Wissen',
    type: 'notes',
    icon: 'book',
    color: '#2563eb',
    isDefault: true,
    createdAt: COLLECTIONS_SEED_TS,
    updatedAt: COLLECTIONS_SEED_TS,
  },
]

export const DEFAULT_SECTION_TEMPLATES: {
  key: DrugSectionKey
  label: string
  isCollapsedByDefault: boolean
  order: number
}[] = [
  { key: 'kurzprofil', label: 'Kurzprofil / Overview', isCollapsedByDefault: false, order: 0 },
  { key: 'wirkmechanismus', label: 'Wirkmechanismus / Mechanism of Action', isCollapsedByDefault: false, order: 1 },
  { key: 'rezeptorprofil', label: 'Rezeptorprofil / Receptor Profile', isCollapsedByDefault: true, order: 2 },
  { key: 'indikationen', label: 'Indikationen / Indications', isCollapsedByDefault: false, order: 3 },
  { key: 'dosierung', label: 'Dosierung / Dosing', isCollapsedByDefault: false, order: 4 },
  { key: 'nebenwirkungen', label: 'Nebenwirkungen / Side Effects', isCollapsedByDefault: false, order: 5 },
  { key: 'kontraindikationen', label: 'Kontraindikationen / Contraindications', isCollapsedByDefault: true, order: 6 },
  { key: 'wechselwirkungen', label: 'Wechselwirkungen / Interactions', isCollapsedByDefault: true, order: 7 },
  { key: 'kontrollen', label: 'Kontrollen / Monitoring', isCollapsedByDefault: true, order: 8 },
  { key: 'besonderheiten', label: 'Besonderheiten / Special Clinical Notes', isCollapsedByDefault: false, order: 9 },
  { key: 'umstellung', label: 'Umstellung / Depot / Absetzen', isCollapsedByDefault: true, order: 10 },
  { key: 'schwangerschaft', label: 'Schwangerschaft / Stillzeit', isCollapsedByDefault: true, order: 11 },
  { key: 'niereLeber', label: 'Niere / Leber-Anpassung', isCollapsedByDefault: true, order: 12 },
  { key: 'merksaetze', label: 'Merksätze / Clinical Pearls', isCollapsedByDefault: true, order: 13 },
  { key: 'quellen', label: 'Quellen / References', isCollapsedByDefault: true, order: 14 },
]

export function createDefaultSections(
  overrides: Partial<Record<DrugSectionKey, string>> = {},
): DrugSection[] {
  return DEFAULT_SECTION_TEMPLATES.map((template) => ({
    id: `${template.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    key: template.key,
    label: template.label,
    content: overrides[template.key] ?? '',
    isDefault: true,
    isCollapsedByDefault: template.isCollapsedByDefault,
    order: template.order,
    hidden: false,
  }))
}
