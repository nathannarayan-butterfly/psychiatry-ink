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
  /** English variant of {@link halfLifeNote} for `en` UI locale. */
  halfLifeNoteEn?: string
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
    /** English variant of {@link note} for `en` UI locale. */
    noteEn?: string
  }
  /** True when values are estimated rather than from SmPC / a reference. */
  isEstimated?: boolean
  sourceNote?: string
  /** English variant of {@link sourceNote} for `en` UI locale. */
  sourceNoteEn?: string
}

/** A single dosing step on a titration / taper schedule. */
export interface TitrationStep {
  label?: string
  /** English variant of {@link label} for `en` UI locale. */
  labelEn?: string
  /** Day offset from start (day 0 = first dose). */
  startDay: number
  /** Target daily dose at this step; null marks a stop / unknown. */
  doseMg: number | null
  note?: string
  /** English variant of {@link note} for `en` UI locale. */
  noteEn?: string
}

/** An ordered titration (up) or taper (down) schedule (kind: 'titration'|'taper'). */
export interface TitrationSchedule {
  unit?: string
  /** English variant of {@link unit} for `en` UI locale (defaults to {@link unit}). */
  unitEn?: string
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
  /** English variant of {@link doseLabel} for `en` UI locale. */
  doseLabelEn?: string
  route?: string
  /** English variant of {@link route} for `en` UI locale. */
  routeEn?: string
  note?: string
  /** English variant of {@link note} for `en` UI locale. */
  noteEn?: string
}

/** A long-acting injectable (LAI / depot) switching option (kind: 'depot'). */
export interface DepotOption {
  name: string
  /** English variant of {@link name} for `en` UI locale. */
  nameEn?: string
  brandName?: string
  injectionIntervalDays: number
  loadingRegimen: DepotLoadingDose[]
  /** Days of oral antipsychotic overlap required (0 ⇒ "kein orales Overlap"). */
  oralOverlapDays: number
  doseEquivalence?: string
  /** English variant of {@link doseEquivalence} for `en` UI locale. */
  doseEquivalenceEn?: string
  timeToSteadyStateWeeks?: number | null
  /** Day the first regular maintenance injection is due. */
  firstMaintenanceDay?: number | null
  /** Allowed +/- window (days) for a maintenance injection. */
  flexWindowDays?: number | null
  postInjectionMonitoring?: string
  /** English variant of {@link postInjectionMonitoring} for `en` UI locale. */
  postInjectionMonitoringEn?: string
  /** Short-acting acetate (e.g. Acuphase) — NOT a maintenance depot. */
  isShortActingNotDepot?: boolean
  isEstimated?: boolean
  sourceNote?: string
  /** English variant of {@link sourceNote} for `en` UI locale. */
  sourceNoteEn?: string
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
  /** English variant of {@link effect} for `en` UI locale. */
  effectEn?: string
  /** Organ system / grouping, e.g. "metabolisch", "EPS", "kardial". */
  system?: string
  /** English variant of {@link system} for `en` UI locale. */
  systemEn?: string
  frequency: SideEffectFrequency
  severity: SideEffectSeverity
  note?: string
  /** English variant of {@link note} for `en` UI locale. */
  noteEn?: string
}

export type CypRole = 'substrate' | 'inhibitor' | 'inducer'

export interface CypEnzymeInvolvement {
  enzyme: string
  role: CypRole
  /** Qualitative strength, e.g. "stark" / "schwach" / "major". */
  strength?: string
  /** English variant of {@link strength} for `en` UI locale. */
  strengthEn?: string
  note?: string
  /** English variant of {@link note} for `en` UI locale. */
  noteEn?: string
}

export interface CypInteraction {
  withDrugOrClass: string
  /** English variant of {@link withDrugOrClass} for `en` UI locale. */
  withDrugOrClassEn?: string
  severity: 'major' | 'moderate' | 'minor'
  effect: string
  /** English variant of {@link effect} for `en` UI locale. */
  effectEn?: string
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
  /** English variant of {@link drugClass} for `en` UI locale. */
  drugClassEn?: string
  halfLifeSummary?: string
  /** English variant of {@link halfLifeSummary} for `en` UI locale. */
  halfLifeSummaryEn?: string
  primaryTargets?: string[]
  qtcRisk?: 'low' | 'moderate' | 'high'
  pregnancy?: string
  /** English variant of {@link pregnancy} for `en` UI locale. */
  pregnancyEn?: string
  lactation?: string
  /** English variant of {@link lactation} for `en` UI locale. */
  lactationEn?: string
  depotAvailable?: boolean
  isEstimated?: boolean
}

export interface DrugSection {
  id: string
  key: DrugSectionKey
  label: string
  /** English variant of {@link label} for `en` UI locale (e.g. "Overview"). */
  labelEn?: string
  content: string
  /** English variant of {@link content} for `en` UI locale. */
  contentEn?: string
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
  /** Lightweight provenance hints projected from kb_field_provenance (read-only). */
  fieldProvenance?: Array<{ fieldPath: string; sourceType: string }>
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

// ── Default psychopharmacology classification ────────────────────────────────
// The canonical, researched *default* drug-class taxonomy for KB medication
// profiles. It is a defined enum (NOT free text) following the traditional
// German clinical psychopharmaka class system (this app is German-first), at a
// clinically useful granularity (e.g. antidepressant subclasses SSRI/SNRI/TZA…).
//
// This is COMPLEMENTARY to the existing fields and does not replace them:
//   - `category`  → coarse top-level group (filter chips); kept as-is.
//   - `drugClass` → free-text clinician label (e.g. "hochpotentes FGA"); kept.
//   - `atcCode`   → WHO ATC structured backbone; kept.
//   - `psychClass`→ NEW default classification enum (this taxonomy).
//   - `nbn`       → OPTIONAL complementary Neuroscience-based Nomenclature note
//                   (pharmacological domain + mode of action, free text).
//
// Existing entries without `psychClass` remain valid: readers resolve via
// {@link normalizePsychClass} / {@link DEFAULT_PSYCH_CLASS}.

export type PsychopharmacaClass =
  | 'antipsychotic_typical'
  | 'antipsychotic_atypical'
  | 'antidepressant_ssri'
  | 'antidepressant_snri'
  | 'antidepressant_tricyclic'
  | 'antidepressant_maoi'
  | 'antidepressant_nassa'
  | 'antidepressant_other'
  | 'mood_stabilizer'
  | 'anticonvulsant'
  | 'anxiolytic_benzodiazepine'
  | 'anxiolytic_other'
  | 'hypnotic'
  | 'psychostimulant'
  | 'antidementia'
  | 'addiction'
  | 'other'
  | 'unspecified'

/** Ordered list of all classes (drives select menus). */
export const PSYCHOPHARMACA_CLASSES: PsychopharmacaClass[] = [
  'antipsychotic_typical',
  'antipsychotic_atypical',
  'antidepressant_ssri',
  'antidepressant_snri',
  'antidepressant_tricyclic',
  'antidepressant_maoi',
  'antidepressant_nassa',
  'antidepressant_other',
  'mood_stabilizer',
  'anticonvulsant',
  'anxiolytic_benzodiazepine',
  'anxiolytic_other',
  'hypnotic',
  'psychostimulant',
  'antidementia',
  'addiction',
  'other',
  'unspecified',
]

/** Default classification for new / blank profiles (instead of "Auto"/empty). */
export const DEFAULT_PSYCH_CLASS: PsychopharmacaClass = 'unspecified'

const PSYCH_CLASS_SET = new Set<string>(PSYCHOPHARMACA_CLASSES)

/**
 * Coerce any stored value to a valid {@link PsychopharmacaClass}. Absent /
 * unknown values fall back to {@link DEFAULT_PSYCH_CLASS} so legacy entries
 * (which never had this field) keep rendering.
 */
export function normalizePsychClass(value: unknown): PsychopharmacaClass {
  return typeof value === 'string' && PSYCH_CLASS_SET.has(value)
    ? (value as PsychopharmacaClass)
    : DEFAULT_PSYCH_CLASS
}

/** True when the class still needs to be set (so AI/derivation may fill it). */
export function isPsychClassUnset(value: unknown): boolean {
  return normalizePsychClass(value) === 'unspecified'
}

/**
 * Coarse {@link DrugCategory} implied by a psychopharmaka class. Used to keep
 * the legacy `category` field populated (filter chips) when a class is chosen,
 * instead of leaving the old "Auto" default. `null` ⇒ no clean 1:1 mapping.
 */
export const PSYCH_CLASS_TO_CATEGORY: Record<PsychopharmacaClass, DrugCategory | null> = {
  antipsychotic_typical: 'Antipsychotika',
  antipsychotic_atypical: 'Antipsychotika',
  antidepressant_ssri: 'Antidepressiva',
  antidepressant_snri: 'Antidepressiva',
  antidepressant_tricyclic: 'Antidepressiva',
  antidepressant_maoi: 'Antidepressiva',
  antidepressant_nassa: 'Antidepressiva',
  antidepressant_other: 'Antidepressiva',
  mood_stabilizer: 'Phasenprophylaktika',
  anticonvulsant: 'Phasenprophylaktika',
  anxiolytic_benzodiazepine: 'Benzodiazepine',
  anxiolytic_other: null,
  hypnotic: 'Hypnotika',
  psychostimulant: 'ADHS',
  antidementia: 'Antidemenz',
  addiction: 'Suchtmedizin',
  other: null,
  unspecified: null,
}

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
  /** English variant of {@link clinicalMeaning} for `en` UI locale. */
  clinicalMeaningEn?: string
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
  /** English variant of {@link sourceNote} for `en` UI locale. */
  sourceNoteEn?: string
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

/**
 * Provenance of the English (`*En`) localized fields on a KB record.
 *
 * - `'machine'` — produced by automated machine translation (DeepSeek) and
 *   published immediately, unreviewed. The canonical German content and its
 *   {@link KnowledgeBaseVerificationStatus} are unaffected.
 * - `'human'` — curated or human-reviewed English.
 */
export type KbEnglishContentSource = 'machine' | 'human'

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
  /** English variant of {@link tradeName}. Brand names are usually language-neutral but EU/US trade names may diverge. */
  tradeNameEn?: string
  genericName: string
  /**
   * English (INN) spelling of {@link genericName}. The canonical German
   * spelling stays in {@link genericName}; consumers render this when the UI
   * locale is `en` (e.g. "Risperidone" instead of "Risperidon").
   */
  genericNameEn?: string
  strengthValue: string
  strengthUnit: string
  dosageForm: string
  /**
   * English variant of {@link dosageForm} (e.g. "Tablets" instead of
   * "Tabletten"). Falls back to {@link dosageForm} when absent.
   */
  dosageFormEn?: string
  route: string
  packageSize?: string
  productIdentifierType?: 'PZN' | 'AMIceId' | 'nationalProductCode' | string
  productIdentifier?: string
  prescriptionStatus?: string
  /** English variant of {@link prescriptionStatus} (e.g. "Prescription-only"). */
  prescriptionStatusEn?: string
  marketStatus?: string
  sourceName?: string
  /** English variant of {@link sourceName}. */
  sourceNameEn?: string
  sourceUrl?: string
  sourceReference?: string
  /** English variant of {@link sourceReference}. */
  sourceReferenceEn?: string
  lastVerifiedAt?: string
  verificationStatus: PreparationVerificationStatus
  notes?: string
  /** English variant of {@link notes}. */
  notesEn?: string
  createdAt: string
  /**
   * Provenance of the English (`*En`) fields — `'machine'` for unreviewed
   * DeepSeek machine translation. Does not affect {@link verificationStatus}.
   */
  enContentSource?: KbEnglishContentSource
  /** ISO timestamp of the last machine English-translation pass. */
  enTranslatedAt?: string
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
  /**
   * English (INN) spelling of {@link genericName} (e.g. "Risperidone" instead
   * of "Risperidon"). Falls back to {@link genericName} when absent.
   */
  genericNameEn?: string
  brandNames: string[]
  drugClass: string
  /** English variant of {@link drugClass} (e.g. "Atypical antipsychotic (SGA)"). */
  drugClassEn?: string
  category: string
  /** English variant of {@link category} (e.g. "Antipsychotics"). */
  categoryEn?: string
  /**
   * Default psychopharmacology classification (defined enum, German clinical
   * taxonomy). Absent ⇒ {@link DEFAULT_PSYCH_CLASS} ('unspecified'); resolve via
   * {@link normalizePsychClass}. This is the primary structured class field;
   * `category`/`drugClass` are retained for backward compatibility.
   */
  psychClass?: PsychopharmacaClass
  /**
   * OPTIONAL complementary Neuroscience-based Nomenclature (NbN) descriptor —
   * pharmacological domain + mode of action, e.g. "Serotonin – Reuptake
   * inhibitor (SERT)". Free text; populated by AI when known, never required.
   */
  nbn?: string
  atcCode?: string
  tags?: string[]
  /**
   * English variants of {@link tags}, index-aligned with the German list when
   * present. Falls back to {@link tags} when absent.
   */
  tagsEn?: string[]
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
  /** True when content is visible but individual clinician verification is still expected. */
  needsClinicalReview?: boolean
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
  /** KB release version tag when projected from normalized publish (psychopharmacology.wiki). */
  kbReleaseVersion?: string
  /** ISO timestamp of the KB release sync consumed by Psychiatry.ink. */
  kbReleaseSyncedAt?: string
  /**
   * Provenance of the English (`*En`) fields. `'machine'` ⇒ the English content
   * was produced by automated (DeepSeek) machine translation and is published
   * unreviewed; `'human'` ⇒ curated/reviewed English. Absent ⇒ unknown / legacy.
   * This NEVER changes {@link verificationStatus}, which continues to describe the
   * clinical sign-off of the canonical (German) content.
   */
  enContentSource?: KbEnglishContentSource
  /** ISO timestamp of the last machine English-translation pass over the `*En` fields. */
  enTranslatedAt?: string
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
  /** English display name for default collections when UI locale is `en`. */
  nameEn?: string
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
    nameEn: 'Psychopharmacology',
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
    nameEn: 'Clinical Knowledge',
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
  /** English-only label used when the UI locale is `en`. */
  labelEn: string
  isCollapsedByDefault: boolean
  order: number
  kind: DrugSectionKind
}[] = [
  { key: 'kurzprofil', label: 'Kurzprofil / Overview', labelEn: 'Overview', isCollapsedByDefault: false, order: 0, kind: 'text' },
  { key: 'steckbrief', label: 'Steckbrief / At a Glance', labelEn: 'At a Glance', isCollapsedByDefault: false, order: 1, kind: 'glance' },
  { key: 'wirkmechanismus', label: 'Wirkmechanismus / Mechanism of Action', labelEn: 'Mechanism of Action', isCollapsedByDefault: false, order: 2, kind: 'text' },
  { key: 'rezeptorprofil', label: 'Rezeptorprofil / Receptor Profile', labelEn: 'Receptor Profile', isCollapsedByDefault: true, order: 3, kind: 'text' },
  { key: 'pharmakokinetik', label: 'Pharmakokinetik / Pharmacokinetics', labelEn: 'Pharmacokinetics', isCollapsedByDefault: true, order: 4, kind: 'pk' },
  { key: 'indikationen', label: 'Indikationen / Indications', labelEn: 'Indications', isCollapsedByDefault: false, order: 5, kind: 'text' },
  { key: 'dosierung', label: 'Dosierung & Titration / Dosing', labelEn: 'Dosing & Titration', isCollapsedByDefault: false, order: 6, kind: 'titration' },
  { key: 'umstellung', label: 'Umstellung & Depot / Switching & LAI', labelEn: 'Switching & LAI', isCollapsedByDefault: true, order: 7, kind: 'depot' },
  { key: 'nebenwirkungen', label: 'Nebenwirkungen / Side Effects', labelEn: 'Side Effects', isCollapsedByDefault: false, order: 8, kind: 'sideEffects' },
  { key: 'kontraindikationen', label: 'Kontraindikationen / Contraindications', labelEn: 'Contraindications', isCollapsedByDefault: true, order: 9, kind: 'text' },
  { key: 'wechselwirkungen', label: 'Wechselwirkungen & CYP450 / Interactions', labelEn: 'Interactions & CYP450', isCollapsedByDefault: true, order: 10, kind: 'cyp' },
  { key: 'qtc', label: 'QTc / EKG', labelEn: 'QTc / ECG', isCollapsedByDefault: true, order: 11, kind: 'text' },
  { key: 'kontrollen', label: 'Kontrollen / Monitoring', labelEn: 'Monitoring', isCollapsedByDefault: true, order: 12, kind: 'text' },
  { key: 'schwangerschaft', label: 'Schwangerschaft / Stillzeit', labelEn: 'Pregnancy & Lactation', isCollapsedByDefault: true, order: 13, kind: 'text' },
  { key: 'niereLeber', label: 'Niere / Leber-Anpassung', labelEn: 'Renal & Hepatic Adjustment', isCollapsedByDefault: true, order: 14, kind: 'text' },
  { key: 'ueberdosierung', label: 'Überdosierung / Toxizität', labelEn: 'Overdose & Toxicity', isCollapsedByDefault: true, order: 15, kind: 'text' },
  { key: 'absetzen', label: 'Absetzen / Taper', labelEn: 'Discontinuation & Taper', isCollapsedByDefault: true, order: 16, kind: 'taper' },
  { key: 'besonderheiten', label: 'Besonderheiten / Special Clinical Notes', labelEn: 'Special Clinical Notes', isCollapsedByDefault: false, order: 17, kind: 'text' },
  { key: 'merksaetze', label: 'Merksätze / Clinical Pearls', labelEn: 'Clinical Pearls', isCollapsedByDefault: true, order: 18, kind: 'text' },
  { key: 'quellen', label: 'Quellen / References', labelEn: 'References', isCollapsedByDefault: true, order: 19, kind: 'text' },
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
  overridesEn: Partial<Record<DrugSectionKey, string>> = {},
): DrugSection[] {
  return DEFAULT_SECTION_TEMPLATES.map((template) => ({
    id: `${template.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    key: template.key,
    label: template.label,
    labelEn: template.labelEn,
    content: overrides[template.key] ?? '',
    contentEn: overridesEn[template.key],
    isDefault: true,
    isCollapsedByDefault: template.isCollapsedByDefault,
    order: template.order,
    hidden: false,
    kind: template.kind,
    ...(structured[template.key] ?? {}),
  }))
}

// ── Locale-aware accessors ───────────────────────────────────────────────────
// The seed data carries the canonical German string in the unsuffixed field
// (e.g. `content`) and the English translation in the parallel `*En` field
// (e.g. `contentEn`). These helpers return the right variant for the active UI
// language, falling back to the other variant when the requested one is empty
// so legacy entries (German-only) still render. All comparisons are
// case-insensitive on the language string ("en", "en-GB", "EN" all map to EN).

/**
 * True when the active UI language is English. Accepts `undefined` so callers
 * can pass whichever `language` prop they have without an extra guard.
 */
export function isEnglishKbLanguage(language: string | undefined | null): boolean {
  if (!language) return false
  const head = language.split('-')[0]?.toLowerCase()
  return head === 'en'
}

/**
 * Pick the language-appropriate variant of a KB text field. When the UI is
 * English and an English translation is present (non-empty), return it;
 * otherwise return the German source. The fallback is symmetric so an
 * English-only field still renders for German UI when the German variant is
 * missing.
 */
export function pickKbLocalizedText(
  de: string | undefined | null,
  en: string | undefined | null,
  language: string | undefined | null,
): string {
  if (isEnglishKbLanguage(language)) {
    const enTrimmed = (en ?? '').trim()
    if (enTrimmed) return en as string
    return de ?? ''
  }
  const deTrimmed = (de ?? '').trim()
  if (deTrimmed) return de as string
  return en ?? ''
}

/**
 * Pick the language-appropriate variant of a KB string array. Returns the
 * English list when (a) UI is English AND (b) the English list is present
 * and non-empty; otherwise returns the German source list (or [] when both
 * are absent).
 */
export function pickKbLocalizedList(
  de: readonly string[] | undefined | null,
  en: readonly string[] | undefined | null,
  language: string | undefined | null,
): string[] {
  if (isEnglishKbLanguage(language) && Array.isArray(en) && en.length > 0) {
    return [...en]
  }
  if (Array.isArray(de) && de.length > 0) return [...de]
  if (Array.isArray(en) && en.length > 0) return [...en]
  return []
}

/** Localized collection tile / header title. */
export function pickKbLocalizedCollectionName(
  collection: Pick<KnowledgeCollection, 'name' | 'nameEn'>,
  language: string | undefined | null,
): string {
  return pickKbLocalizedText(collection.name, collection.nameEn, language) || collection.name
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
