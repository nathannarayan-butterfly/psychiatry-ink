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

/**
 * LEGACY receptor-profile pharmacodynamic action types (clinician-entered,
 * 1–5 score model). Retained for backward-compatible display of v1 entries.
 * New v2 profiles use {@link ReceptorAction} instead.
 */
export type LegacyReceptorAction =
  | 'antagonist'
  | 'partial-agonist'
  | 'agonist'
  | 'reuptake-inhibition'
  | 'unknown'

/** Confidence / provenance of a single legacy (1–5) receptor score. */
export type ReceptorConfidence = 'curated' | 'estimated' | 'unknown'

/**
 * LEGACY detailed receptor-profile entry. Scores use a 0–5 affinity/strength
 * scale: 0 none · 1 negligible · 2 mild · 3 moderate · 4 strong · 5 dominant.
 * Kept only so existing v1 entries remain readable; never written by the v2
 * generation/upgrade path.
 */
export interface ReceptorProfileDetail {
  /** 0..5 affinity / strength score */
  score: number
  action?: LegacyReceptorAction
  clinicalMeaning?: string
  confidence?: ReceptorConfidence
}

// ── v2 relative receptor-affinity model ──────────────────────────────────────
// CORE PRINCIPLE: affinityPercent is a *relative receptor affinity index (%)* —
// NOT receptor occupancy, NOT clinical blockade, NOT dose-dependent effect
// strength. Where real binding data exist they are stored raw (Ki/IC50/pKi) and
// a normalized percentage is derived for display.

/** Pharmacodynamic action at a receptor / transporter / enzyme (v2 model). */
export type ReceptorAction =
  | 'antagonist'
  | 'partial_agonist'
  | 'agonist'
  | 'inverse_agonist'
  | 'reuptake_inhibitor'
  | 'enzyme_inhibitor'
  | 'mixed'
  | 'unknown'

/** Strength of the underlying evidence for a single affinity entry. */
export type EvidenceQuality = 'high' | 'moderate' | 'low' | 'estimated' | 'unknown'

/** Clinical relevance weighting for a single receptor target. */
export type ReceptorClinicalRelevance = 'high' | 'moderate' | 'low' | 'uncertain'

/** Normalization scale identifier used by the v2 affinity model. */
export type AffinityScale = 'relative_log_ki_percent'

/** Current receptor-profile schema version produced by the v2 pipeline. */
export const RECEPTOR_PROFILE_VERSION = 2 as const
export type ReceptorProfileVersion = 1 | 2

/**
 * A single v2 receptor-affinity entry. `affinityPercent` is the relative
 * affinity index (0–100) used for display; raw scientific values are stored
 * when known and never invented.
 */
export interface ReceptorAffinityEntry {
  /** Receptor / transporter / enzyme target symbol (e.g. "D2", "5-HT2A", "SERT"). */
  target: string
  /** Relative receptor affinity index (0–100), or null when unknown. */
  affinityPercent: number | null
  /** Raw inhibition constant in nanomolar, when confidently known. */
  rawKiNm?: number | null
  /** Raw half-maximal inhibitory concentration in nanomolar, when known. */
  rawIc50Nm?: number | null
  /** Negative log10 of Ki (in molar), when known. */
  pKi?: number | null
  action: ReceptorAction
  clinicalRelevance?: ReceptorClinicalRelevance
  evidenceQuality: EvidenceQuality
  sourceNote?: string
  /** True when affinityPercent is an estimate rather than derived from raw data. */
  isEstimated?: boolean
}

/**
 * Snapshot of a pre-v2 (1–5 score) receptor profile, preserved verbatim when an
 * entry is upgraded so the original curated data is never lost.
 */
export interface LegacyReceptorProfileSnapshot {
  profile?: Record<string, number>
  details?: Record<string, ReceptorProfileDetail>
  /** ISO timestamp the snapshot was taken (i.e. when the upgrade ran). */
  archivedAt?: string
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
  /**
   * LEGACY: receptor key → score 0..5 (compact map). Retained for backward
   * compatibility; v2 entries use {@link receptorAffinityProfile}.
   */
  receptorProfile?: Record<string, number>
  /** LEGACY: receptor key → structured detail (action, clinical note, confidence). */
  receptorProfileDetails?: Record<string, ReceptorProfileDetail>

  // ── v2 relative receptor-affinity model ──
  /** Schema version of the receptor data. Absent / 1 → legacy 1–5 scores. */
  receptorProfileVersion?: ReceptorProfileVersion
  /** Normalization scale of {@link receptorAffinityProfile}. */
  affinityScale?: AffinityScale
  /** v2 relative receptor-affinity entries (the canonical "receptorProfile" of the v2 model). */
  receptorAffinityProfile?: ReceptorAffinityEntry[]
  /** Original 1–5 profile preserved when an entry was upgraded to v2. */
  legacyReceptorProfile?: LegacyReceptorProfileSnapshot
  /** ISO timestamp of the last v2 receptor-profile (re)generation. */
  lastReceptorProfileUpdatedAt?: string
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
