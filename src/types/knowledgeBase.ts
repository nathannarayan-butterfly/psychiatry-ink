export type DrugSectionKey =
  | 'kurzprofil'
  | 'steckbrief'
  | 'wirkmechanismus'
  | 'rezeptorprofil'
  | 'pharmakokinetik'
  | 'indikationen'
  | 'dosierung'
  | 'nebenwirkungen'
  | 'kontraindikationen'
  | 'wechselwirkungen'
  | 'qtc'
  | 'kontrollen'
  | 'besonderheiten'
  | 'umstellung'
  | 'schwangerschaft'
  | 'niereLeber'
  | 'ueberdosierung'
  | 'absetzen'
  | 'merksaetze'
  | 'quellen'
  | 'custom'

/**
 * Render strategy for a section. Absent ⇒ `'text'` so every legacy section (and
 * any stored drug predating the structured model) renders unchanged. UI code
 * MUST resolve via `kind ?? 'text'`.
 */
export type DrugSectionKind =
  | 'text'
  | 'pk'
  | 'titration'
  | 'taper'
  | 'depot'
  | 'sideEffects'
  | 'cyp'
  | 'glance'

// ── Structured section payloads (all optional / all-nullable numerics) ────────
// These are additive: a section keeps its free-text `content` as the canonical
// narrative; the structured payload only powers the reading-mode graphs. When a
// payload is absent the section degrades gracefully to its text content.

/** Pharmacokinetic numeric summary (kind: 'pk'). Numbers are nullable. */
export interface PharmacokineticData {
  halfLifeHours?: number | null
  /** Free-text qualifier, e.g. "aktiver Metabolit 9-OH 24 h". */
  halfLifeNote?: string
  tmaxHours?: number | null
  timeToSteadyStateDays?: number | null
  bioavailabilityPercent?: number | null
  proteinBindingPercent?: number | null
  /** Therapeutic drug-monitoring reference range. */
  tdm?: {
    lowNgMl?: number | null
    highNgMl?: number | null
    unit?: string
    note?: string
  }
  /** True when values are estimated rather than from SmPC / a reference. */
  isEstimated?: boolean
  sourceNote?: string
}

/** A single dosing step on a titration / taper schedule. */
export interface TitrationStep {
  label?: string
  /** Day offset from start (day 0 = first dose). */
  startDay: number
  /** Target daily dose at this step; null marks a stop / unknown. */
  doseMg: number | null
  note?: string
}

/** An ordered titration (up) or taper (down) schedule (kind: 'titration'|'taper'). */
export interface TitrationSchedule {
  unit?: string
  steps: TitrationStep[]
  targetDoseMg?: number | null
  maxDoseMg?: number | null
  isEstimated?: boolean
}

/** A loading injection within a depot switching regimen. */
export interface DepotLoadingDose {
  /** Day offset from depot initiation (day 0 = first injection). */
  day: number
  doseLabel: string
  route?: string
  note?: string
}

/** A long-acting injectable (LAI / depot) switching option (kind: 'depot'). */
export interface DepotOption {
  name: string
  brandName?: string
  injectionIntervalDays: number
  loadingRegimen: DepotLoadingDose[]
  /** Days of oral antipsychotic overlap required (0 ⇒ "kein orales Overlap"). */
  oralOverlapDays: number
  doseEquivalence?: string
  timeToSteadyStateWeeks?: number | null
  /** Day the first regular maintenance injection is due. */
  firstMaintenanceDay?: number | null
  /** Allowed +/- window (days) for a maintenance injection. */
  flexWindowDays?: number | null
  postInjectionMonitoring?: string
  /** Short-acting acetate (e.g. Acuphase) — NOT a maintenance depot. */
  isShortActingNotDepot?: boolean
  isEstimated?: boolean
  sourceNote?: string
}

export type SideEffectFrequency =
  | 'veryCommon'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'unknown'

export type SideEffectSeverity = 'mild' | 'moderate' | 'severe' | 'dangerous'

/** A single adverse-effect row (kind: 'sideEffects'). */
export interface SideEffectEntry {
  effect: string
  /** Organ system / grouping, e.g. "metabolisch", "EPS", "kardial". */
  system?: string
  frequency: SideEffectFrequency
  severity: SideEffectSeverity
  note?: string
}

export type CypRole = 'substrate' | 'inhibitor' | 'inducer'

export interface CypEnzymeInvolvement {
  enzyme: string
  role: CypRole
  /** Qualitative strength, e.g. "stark" / "schwach" / "major". */
  strength?: string
  note?: string
}

export interface CypInteraction {
  withDrugOrClass: string
  severity: 'major' | 'moderate' | 'minor'
  effect: string
}

/** CYP450 / interaction profile (kind: 'cyp'). */
export interface CypProfile {
  enzymes: CypEnzymeInvolvement[]
  interactions?: CypInteraction[]
  qtcRisk?: 'low' | 'moderate' | 'high'
  isEstimated?: boolean
}

/** At-a-glance KPI strip payload (kind: 'glance'). All fields optional/derived. */
export interface GlanceData {
  drugClass?: string
  halfLifeSummary?: string
  primaryTargets?: string[]
  qtcRisk?: 'low' | 'moderate' | 'high'
  pregnancy?: string
  lactation?: string
  depotAvailable?: boolean
  isEstimated?: boolean
}

export interface DrugSection {
  id: string
  key: DrugSectionKey
  label: string
  content: string
  isDefault: boolean
  isCollapsedByDefault: boolean
  order: number
  hidden: boolean
  /** Render strategy. Absent ⇒ 'text' (100% backward compatible). */
  kind?: DrugSectionKind
  // ── Optional structured payloads (only the one matching `kind` is used) ──
  pk?: PharmacokineticData
  titration?: TitrationSchedule
  depotOptions?: DepotOption[]
  sideEffects?: SideEffectEntry[]
  cyp?: CypProfile
  glance?: GlanceData
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

/** Current structured-data model version produced by the redesigned KB. */
export const DATA_MODEL_VERSION = 2 as const
export type DataModelVersion = 1 | 2

export type KnowledgeBaseVerificationStatus =
  | 'draft'
  | 'ai_draft'
  | 'reviewed'
  | 'verified'
  | 'deprecated'

export type PrescribingCountryCode = 'DE' | 'CH' | 'AT' | 'UK'

export type PreparationVerificationStatus =
  | 'unverified'
  | 'ai_draft'
  | 'manually_verified'
  | 'imported_verified'

export interface KnowledgeBaseAuditFields {
  createdByUserId?: string
  createdByDisplayName?: string
  lastModifiedAt?: string
  lastModifiedByUserId?: string
  lastModifiedByDisplayName?: string
  lastReviewedAt?: string
  lastReviewedByUserId?: string
  lastReviewedByDisplayName?: string
}

export interface MedicationMarketAvailability extends KnowledgeBaseAuditFields {
  id: string
  substanceId: string
  countryCode: PrescribingCountryCode
  tradeName: string
  genericName: string
  strengthValue: string
  strengthUnit: string
  dosageForm: string
  route: string
  packageSize?: string
  productIdentifierType?: 'PZN' | 'AMIceId' | 'nationalProductCode' | string
  productIdentifier?: string
  prescriptionStatus?: string
  marketStatus?: string
  sourceName?: string
  sourceUrl?: string
  sourceReference?: string
  lastVerifiedAt?: string
  verificationStatus: PreparationVerificationStatus
  notes?: string
  createdAt: string
}

export interface KnowledgeBaseDrug {
  id: string
  collectionId?: string
  /**
   * Structured-data model version. Absent / 1 → predates the structured
   * sections (PK / titration / depot / side-effects / CYP). Stamped on load by
   * `migrateDataModel` without touching content.
   */
  dataModelVersion?: DataModelVersion
  genericName: string
  brandNames: string[]
  drugClass: string
  category: string
  atcCode?: string
  tags?: string[]
  /**
   * @deprecated Active/inactive status is no longer surfaced in the UI. Kept
   * optional for backward compatibility with existing stored data and seeds.
   */
  status?: DrugStatus
  authorEditor?: string
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  createdByDisplayName?: string
  lastModifiedAt?: string
  lastModifiedByUserId?: string
  lastModifiedByDisplayName?: string
  lastReviewedAt?: string
  lastReviewedByUserId?: string
  lastReviewedByDisplayName?: string
  verificationStatus?: KnowledgeBaseVerificationStatus
  sourceHierarchyLevel?: string
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
  kind: DrugSectionKind
}[] = [
  { key: 'kurzprofil', label: 'Kurzprofil / Overview', isCollapsedByDefault: false, order: 0, kind: 'text' },
  { key: 'steckbrief', label: 'Steckbrief / At a Glance', isCollapsedByDefault: false, order: 1, kind: 'glance' },
  { key: 'wirkmechanismus', label: 'Wirkmechanismus / Mechanism of Action', isCollapsedByDefault: false, order: 2, kind: 'text' },
  { key: 'rezeptorprofil', label: 'Rezeptorprofil / Receptor Profile', isCollapsedByDefault: true, order: 3, kind: 'text' },
  { key: 'pharmakokinetik', label: 'Pharmakokinetik / Pharmacokinetics', isCollapsedByDefault: true, order: 4, kind: 'pk' },
  { key: 'indikationen', label: 'Indikationen / Indications', isCollapsedByDefault: false, order: 5, kind: 'text' },
  { key: 'dosierung', label: 'Dosierung & Titration / Dosing', isCollapsedByDefault: false, order: 6, kind: 'titration' },
  { key: 'umstellung', label: 'Umstellung & Depot / Switching & LAI', isCollapsedByDefault: true, order: 7, kind: 'depot' },
  { key: 'nebenwirkungen', label: 'Nebenwirkungen / Side Effects', isCollapsedByDefault: false, order: 8, kind: 'sideEffects' },
  { key: 'kontraindikationen', label: 'Kontraindikationen / Contraindications', isCollapsedByDefault: true, order: 9, kind: 'text' },
  { key: 'wechselwirkungen', label: 'Wechselwirkungen & CYP450 / Interactions', isCollapsedByDefault: true, order: 10, kind: 'cyp' },
  { key: 'qtc', label: 'QTc / EKG', isCollapsedByDefault: true, order: 11, kind: 'text' },
  { key: 'kontrollen', label: 'Kontrollen / Monitoring', isCollapsedByDefault: true, order: 12, kind: 'text' },
  { key: 'schwangerschaft', label: 'Schwangerschaft / Stillzeit', isCollapsedByDefault: true, order: 13, kind: 'text' },
  { key: 'niereLeber', label: 'Niere / Leber-Anpassung', isCollapsedByDefault: true, order: 14, kind: 'text' },
  { key: 'ueberdosierung', label: 'Überdosierung / Toxizität', isCollapsedByDefault: true, order: 15, kind: 'text' },
  { key: 'absetzen', label: 'Absetzen / Taper', isCollapsedByDefault: true, order: 16, kind: 'taper' },
  { key: 'besonderheiten', label: 'Besonderheiten / Special Clinical Notes', isCollapsedByDefault: false, order: 17, kind: 'text' },
  { key: 'merksaetze', label: 'Merksätze / Clinical Pearls', isCollapsedByDefault: true, order: 18, kind: 'text' },
  { key: 'quellen', label: 'Quellen / References', isCollapsedByDefault: true, order: 19, kind: 'text' },
]

/** Structured payloads that can be attached to default sections at creation. */
export type SectionStructuredOverrides = Partial<
  Record<
    DrugSectionKey,
    Pick<DrugSection, 'pk' | 'titration' | 'depotOptions' | 'sideEffects' | 'cyp' | 'glance'>
  >
>

export function createDefaultSections(
  overrides: Partial<Record<DrugSectionKey, string>> = {},
  structured: SectionStructuredOverrides = {},
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
    kind: template.kind,
    ...(structured[template.key] ?? {}),
  }))
}

// ── Safe section accessors ────────────────────────────────────────────────────
// All reading/editing UI resolves a section's render strategy + payload through
// these helpers so absent fields gracefully degrade (kind ?? 'text', [] / null).

export function getSectionKind(section: DrugSection): DrugSectionKind {
  return section.kind ?? 'text'
}

export function getDepotOptions(section: DrugSection): DepotOption[] {
  return Array.isArray(section.depotOptions) ? section.depotOptions : []
}

export function getTitrationSchedule(section: DrugSection): TitrationSchedule | null {
  const t = section.titration
  if (!t || !Array.isArray(t.steps) || t.steps.length === 0) return null
  return t
}

export function getSideEffects(section: DrugSection): SideEffectEntry[] {
  return Array.isArray(section.sideEffects) ? section.sideEffects : []
}

export function getCypProfile(section: DrugSection): CypProfile | null {
  const c = section.cyp
  if (!c) return null
  const hasEnzymes = Array.isArray(c.enzymes) && c.enzymes.length > 0
  const hasInteractions = Array.isArray(c.interactions) && c.interactions.length > 0
  if (!hasEnzymes && !hasInteractions && !c.qtcRisk) return null
  return c
}

export function getPharmacokinetics(section: DrugSection): PharmacokineticData | null {
  const p = section.pk
  if (!p) return null
  const hasAny =
    p.halfLifeHours != null ||
    p.tmaxHours != null ||
    p.timeToSteadyStateDays != null ||
    p.bioavailabilityPercent != null ||
    p.proteinBindingPercent != null ||
    (p.tdm != null && (p.tdm.lowNgMl != null || p.tdm.highNgMl != null)) ||
    !!p.halfLifeNote
  return hasAny ? p : null
}

/** True when a structured section carries renderable data for its kind. */
export function sectionHasStructuredData(section: DrugSection): boolean {
  switch (getSectionKind(section)) {
    case 'pk':
      return getPharmacokinetics(section) != null
    case 'titration':
    case 'taper':
      return getTitrationSchedule(section) != null
    case 'depot':
      return getDepotOptions(section).length > 0
    case 'sideEffects':
      return getSideEffects(section).length > 0
    case 'cyp':
      return getCypProfile(section) != null
    default:
      return false
  }
}
