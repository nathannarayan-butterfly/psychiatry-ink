/**
 * Clinical-intelligence layer for the Diagnostik → Verlauf (lab-trend) view.
 *
 * The Verlauf view used to render a trend graph for *every* numeric lab analyte,
 * which buries the clinically meaningful ones. This module curates that set: it
 * maps the patient's CURRENT medication onto the lab parameters a psychiatrist
 * actually monitors for those drugs, plus always surfaces drug serum levels
 * (Spiegel).
 *
 * Everything is DERIVED from real app data — the active medication plan (passed
 * in as substance names) and the available lab analyte names. Nothing is
 * fabricated; an unrecognised drug simply contributes no rules (and the UI keeps
 * a "show all" escape hatch so nothing is permanently hidden).
 *
 * The drug → analyte mapping below encodes conservative, standard psychiatric
 * monitoring knowledge (agranulocytosis monitoring for clozapine, prolactin for
 * risperidone/paliperidone/amisulpride, renal/thyroid for lithium, hepatic +
 * platelets + ammonia for valproate, etc.). It is intentionally data-driven and
 * extensible: add a row to {@link DRUG_LAB_RULES} or {@link ANALYTE_DEFS}.
 */

import { getDrugsForSubstance } from '../../data/psychDrugReference/index'

// ---------------------------------------------------------------------------
// Canonical analyte categories
// ---------------------------------------------------------------------------

export type AnalyteKey =
  | 'leukocytes'
  | 'neutrophils'
  | 'platelets'
  | 'hemoglobin'
  | 'crp'
  | 'troponin'
  | 'ck'
  | 'glucose'
  | 'hba1c'
  | 'lipids'
  | 'weight'
  | 'liverEnzymes'
  | 'bilirubin'
  | 'ammonia'
  | 'creatinine'
  | 'egfr'
  | 'urea'
  | 'sodium'
  | 'potassium'
  | 'calcium'
  | 'tsh'
  | 'prolactin'
  | 'qtc'

interface AnalyteDef {
  key: AnalyteKey
  /** Short German label used in rationale captions. */
  labelDe: string
  /** Patterns matched (case-insensitively) against the raw lab parameter name. */
  patterns: RegExp[]
}

/**
 * Canonical analyte definitions with name matchers aligned to the German lab
 * parameter names the app actually parses (e.g. "Leukozyten", "GOT (AST)",
 * "eGFR (CKD-EPI)", "HbA1c", "Cholesterin gesamt"). Order matters only where
 * patterns could overlap — more specific entries come first.
 */
export const ANALYTE_DEFS: AnalyteDef[] = [
  { key: 'neutrophils', labelDe: 'Neutrophile/ANC', patterns: [/neutrophil/i, /\banc\b/i, /granulozyt/i, /stabkernige/i, /segmentkernige/i] },
  { key: 'leukocytes', labelDe: 'Leukozyten', patterns: [/leuko/i, /\bwbc\b/i] },
  { key: 'platelets', labelDe: 'Thrombozyten', patterns: [/thrombozyt/i, /platelet/i, /\bplt\b/i] },
  { key: 'hemoglobin', labelDe: 'Hämoglobin', patterns: [/h[aä]moglobin/i, /\bhb\b/i, /h[aä]matokrit/i] },
  { key: 'hba1c', labelDe: 'HbA1c', patterns: [/hba1c/i, /hb\s?a1c/i, /gly[ck]oh[aä]moglobin/i] },
  { key: 'glucose', labelDe: 'Glukose', patterns: [/glukose/i, /glucose/i, /blutzucker/i, /n[uü]chternzucker/i] },
  { key: 'lipids', labelDe: 'Lipide', patterns: [/cholesterin/i, /cholesterol/i, /\bldl\b/i, /\bhdl\b/i, /triglycerid/i, /\blipid/i] },
  { key: 'liverEnzymes', labelDe: 'Leberenzyme', patterns: [/\bgot\b/i, /\bgpt\b/i, /\bast\b/i, /\balt\b/i, /\bggt\b/i, /gamma-?gt/i, /transaminas/i, /leberenzym/i, /leberwert/i] },
  { key: 'bilirubin', labelDe: 'Bilirubin', patterns: [/bilirubin/i] },
  { key: 'ammonia', labelDe: 'Ammoniak', patterns: [/ammoniak/i, /ammonia/i, /\bnh3\b/i] },
  { key: 'ck', labelDe: 'CK', patterns: [/\bck\b/i, /\bcpk\b/i, /kreatinkinase/i, /creatinkinase/i, /kreatin-kinase/i] },
  { key: 'creatinine', labelDe: 'Kreatinin', patterns: [/kreatinin/i, /creatinin/i] },
  { key: 'egfr', labelDe: 'eGFR', patterns: [/egfr/i, /\bgfr\b/i, /ckd-?epi/i] },
  { key: 'urea', labelDe: 'Harnstoff', patterns: [/harnstoff/i, /\burea\b/i, /\bbun\b/i] },
  { key: 'crp', labelDe: 'CRP', patterns: [/\bcrp\b/i, /c-?reaktiv/i] },
  { key: 'troponin', labelDe: 'Troponin', patterns: [/troponin/i, /\btnt\b/i, /\btni\b/i] },
  { key: 'sodium', labelDe: 'Natrium', patterns: [/natrium/i, /sodium/i] },
  { key: 'potassium', labelDe: 'Kalium', patterns: [/kalium/i, /potassium/i] },
  { key: 'calcium', labelDe: 'Calcium', patterns: [/calcium/i, /kalzium/i] },
  { key: 'tsh', labelDe: 'TSH', patterns: [/\btsh\b/i, /thyreotropin/i, /schilddr[uü]se/i] },
  { key: 'prolactin', labelDe: 'Prolaktin', patterns: [/prolaktin/i, /prolactin/i] },
  { key: 'weight', labelDe: 'Gewicht/BMI', patterns: [/gewicht/i, /\bbmi\b/i, /body\s?mass/i, /k[oö]rpergewicht/i] },
  { key: 'qtc', labelDe: 'QTc', patterns: [/qtc/i, /qt-?zeit/i] },
]

const ANALYTE_LABEL: Record<AnalyteKey, string> = ANALYTE_DEFS.reduce(
  (acc, def) => {
    acc[def.key] = def.labelDe
    return acc
  },
  {} as Record<AnalyteKey, string>,
)

/** German display label for a canonical analyte key. */
export function analyteLabel(key: AnalyteKey): string {
  return ANALYTE_LABEL[key] ?? key
}

/**
 * Global clinical-importance ranking used to order the relevant set. Lower =
 * more important. Safety-critical / life-threatening monitoring (agranulocytosis,
 * myocarditis, hyponatremia) ranks above routine metabolic surveillance.
 */
const ANALYTE_PRIORITY: Record<AnalyteKey, number> = {
  neutrophils: 0,
  leukocytes: 1,
  troponin: 2,
  sodium: 3,
  platelets: 4,
  liverEnzymes: 5,
  ammonia: 6,
  creatinine: 7,
  egfr: 8,
  tsh: 9,
  calcium: 10,
  crp: 11,
  prolactin: 12,
  qtc: 13,
  hba1c: 14,
  glucose: 15,
  lipids: 16,
  weight: 17,
  bilirubin: 18,
  ck: 19,
  hemoglobin: 20,
  potassium: 21,
  urea: 22,
}

/** Match a raw lab parameter name onto a canonical analyte key, or null. */
export function matchAnalyteKey(name: string): AnalyteKey | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  for (const def of ANALYTE_DEFS) {
    if (def.patterns.some((p) => p.test(trimmed))) return def.key
  }
  return null
}

// ---------------------------------------------------------------------------
// Spiegel (drug serum level) detection — kept consistent with SpiegelwerteSection
// ---------------------------------------------------------------------------

const SPIEGEL_CATEGORY_PATTERNS = ['medikamentenspiegel', 'spiegel', 'druglevels', 'drug level', 'trough']

const SPIEGEL_DRUG_NAMES = [
  'lithium',
  'valproat',
  'valproinsäure',
  'valproinsaeure',
  'carbamazepin',
  'lamotrigin',
  'levetiracetam',
  'topiramat',
  'oxcarbazepin',
  'phenytoin',
  'zonisamid',
  'clonazepam',
  'clozapin',
  'norclozapin',
  'olanzapin',
  'quetiapin',
  'risperidon',
  'paliperidon',
  'aripiprazol',
  'haloperidol',
  'amisulprid',
  'ziprasidon',
  'fluoxetin',
  'sertralin',
  'citalopram',
  'escitalopram',
  'paroxetin',
  'venlafaxin',
  'duloxetin',
  'amitriptylin',
  'nortriptylin',
  'imipramin',
  'clomipramin',
  'mirtazapin',
  'bupropion',
  'spiegel',
  'talspiegel',
]

/** True when a (category, parameter) pair represents a drug serum level. */
export function isSpiegelAnalyte(paramName: string, categoryLabel = '', categoryId = ''): boolean {
  const name = paramName.toLowerCase()
  const cat = `${categoryLabel} ${categoryId}`.toLowerCase()
  if (SPIEGEL_CATEGORY_PATTERNS.some((p) => cat.includes(p))) return true
  return SPIEGEL_DRUG_NAMES.some((drug) => name.includes(drug))
}

// ---------------------------------------------------------------------------
// Drug → relevant lab analytes
// ---------------------------------------------------------------------------

interface AnalyteRule {
  key: AnalyteKey
  /** Concise German reason shown in the rationale caption. */
  reason: string
}

interface DrugLabRule {
  /** Canonical German display label (e.g. "Clozapin"). */
  label: string
  /** Matched against the accent/space-insensitive normalised substance name. */
  match: RegExp
  /** Relevant analytes, ordered by drug-specific clinical importance. */
  analytes: AnalyteRule[]
}

/**
 * Curated, conservative monitoring rules per substance (and brand aliases).
 * Drug serum levels (Spiegel) are NOT listed here — they are always surfaced
 * separately by {@link isSpiegelAnalyte}.
 */
export const DRUG_LAB_RULES: DrugLabRule[] = [
  {
    label: 'Clozapin',
    match: /clozapin|clozapine|clozaril|leponex|elcrit/,
    analytes: [
      { key: 'neutrophils', reason: 'Agranulozytose-Monitoring' },
      { key: 'leukocytes', reason: 'Agranulozytose-Monitoring' },
      { key: 'crp', reason: 'Myokarditis-Screening' },
      { key: 'troponin', reason: 'Myokarditis-Screening' },
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
      { key: 'glucose', reason: 'metabolisches Monitoring' },
      { key: 'hba1c', reason: 'metabolisches Monitoring' },
      { key: 'lipids', reason: 'metabolisches Monitoring' },
      { key: 'weight', reason: 'metabolisches Monitoring' },
    ],
  },
  {
    label: 'Olanzapin',
    match: /olanzapin|olanzapine|zyprexa/,
    analytes: [
      { key: 'hba1c', reason: 'hohe metabolische Last' },
      { key: 'glucose', reason: 'hohe metabolische Last' },
      { key: 'lipids', reason: 'hohe metabolische Last' },
      { key: 'weight', reason: 'hohe metabolische Last' },
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
    ],
  },
  {
    label: 'Quetiapin',
    match: /quetiapin|quetiapine|seroquel/,
    analytes: [
      { key: 'hba1c', reason: 'metabolisches Monitoring' },
      { key: 'glucose', reason: 'metabolisches Monitoring' },
      { key: 'lipids', reason: 'metabolisches Monitoring' },
      { key: 'weight', reason: 'metabolisches Monitoring' },
      { key: 'qtc', reason: 'QTc-Verlängerung' },
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
    ],
  },
  {
    label: 'Risperidon/Paliperidon',
    match: /risperidon|risperidone|risperdal|paliperidon|paliperidone|invega|xeplion|trevicta/,
    analytes: [
      { key: 'prolactin', reason: 'Hyperprolaktinämie' },
      { key: 'hba1c', reason: 'metabolisches Monitoring' },
      { key: 'glucose', reason: 'metabolisches Monitoring' },
      { key: 'lipids', reason: 'metabolisches Monitoring' },
      { key: 'weight', reason: 'metabolisches Monitoring' },
      { key: 'qtc', reason: 'QTc-Verlängerung' },
    ],
  },
  {
    label: 'Amisulprid',
    match: /amisulprid|amisulpride|solian/,
    analytes: [
      { key: 'prolactin', reason: 'Hyperprolaktinämie' },
      { key: 'qtc', reason: 'QTc-Verlängerung' },
    ],
  },
  {
    label: 'Aripiprazol',
    match: /aripiprazol|aripiprazole|abilify|brexpiprazol|cariprazin/,
    analytes: [
      { key: 'glucose', reason: 'metabolisches Monitoring' },
      { key: 'hba1c', reason: 'metabolisches Monitoring' },
      { key: 'lipids', reason: 'metabolisches Monitoring' },
      { key: 'weight', reason: 'metabolisches Monitoring' },
    ],
  },
  {
    label: 'Ziprasidon',
    match: /ziprasidon|ziprasidone|zeldox|geodon/,
    analytes: [{ key: 'qtc', reason: 'QTc-Verlängerung' }],
  },
  {
    label: 'Typisches Antipsychotikum',
    match: /haloperidol|haldol|flupentixol|fluphenazin|zuclopenthixol|perphenazin|benperidol|pimozid|melperon|pipamperon|levomepromazin|chlorprothixen/,
    analytes: [
      { key: 'qtc', reason: 'QTc-Verlängerung' },
      { key: 'prolactin', reason: 'Hyperprolaktinämie' },
    ],
  },
  {
    label: 'Lithium',
    match: /lithium|quilonum|hypnorex|priadel|litarex/,
    analytes: [
      { key: 'creatinine', reason: 'Nephrotoxizität' },
      { key: 'egfr', reason: 'Nephrotoxizität' },
      { key: 'tsh', reason: 'Hypothyreose' },
      { key: 'calcium', reason: 'Hyperparathyreoidismus' },
    ],
  },
  {
    label: 'Valproat',
    match: /valproat|valproins|valproic|divalproex|depakine|orfiril|ergenyl|convulex|valproinsaeure/,
    analytes: [
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
      { key: 'platelets', reason: 'Thrombozytopenie' },
      { key: 'ammonia', reason: 'Hyperammonämie' },
    ],
  },
  {
    label: 'Carbamazepin',
    match: /carbamazepin|carbamazepine|tegretol|timonil|finlepsin/,
    analytes: [
      { key: 'leukocytes', reason: 'Leukopenie/Agranulozytose' },
      { key: 'sodium', reason: 'Hyponatriämie (SIADH)' },
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
    ],
  },
  {
    label: 'Oxcarbazepin',
    match: /oxcarbazepin|oxcarbazepine|trileptal|eslicarbazepin/,
    analytes: [{ key: 'sodium', reason: 'Hyponatriämie (SIADH)' }],
  },
  {
    label: 'Lamotrigin',
    // Monitoring is primarily clinical (Hautausschlag/DRESS); minimal routine labs.
    match: /lamotrigin|lamotrigine|lamictal/,
    analytes: [],
  },
  {
    label: 'SSRI',
    match: /citalopram|escitalopram|sertralin|fluoxetin|paroxetin|fluvoxamin/,
    analytes: [{ key: 'sodium', reason: 'Hyponatriämie (SIADH)' }],
  },
  {
    label: 'SNRI',
    match: /venlafaxin|desvenlafaxin|duloxetin|milnacipran/,
    analytes: [{ key: 'sodium', reason: 'Hyponatriämie (SIADH)' }],
  },
  {
    label: 'Trizyklikum',
    match: /amitriptylin|nortriptylin|imipramin|clomipramin|doxepin|trimipramin|opipramol/,
    analytes: [
      { key: 'qtc', reason: 'QTc-Verlängerung' },
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
    ],
  },
  {
    label: 'Mirtazapin',
    match: /mirtazapin|mianserin/,
    analytes: [
      { key: 'lipids', reason: 'metabolisches Monitoring' },
      { key: 'weight', reason: 'metabolisches Monitoring' },
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
    ],
  },
]

/**
 * Recommended monitoring analytes for a single substance (curated rules + class fallback).
 * Used by overview safety card to group parameters under each medication.
 */
export function getMonitoringAnalytesForSubstance(substance: string): AnalyteRule[] {
  const trimmed = substance.trim()
  if (!trimmed) return []
  const normalized = normalizeSubstance(trimmed)
  const explicit = DRUG_LAB_RULES.find((rule) => rule.match.test(normalized))
  if (explicit) return explicit.analytes
  return classFallbackAnalytes(trimmed)
}

/** lowercase + strip accents + drop separators, to match brand/generic loosely. */
function normalizeSubstance(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_\s]+/g, '')
}

/**
 * Class fallback for substances with no explicit curated rule. Uses the existing
 * psychopharmacology reference (`substanceClass`) so the relevant set degrades to
 * a sensible class default rather than hiding everything.
 */
function classFallbackAnalytes(substance: string): AnalyteRule[] {
  const ref = getDrugsForSubstance(substance)[0]
  if (!ref) return []
  const klass = ref.substanceClass.toLowerCase()
  if (/antipsychotik|antipsychotic|neurolept/.test(klass)) {
    return [
      { key: 'hba1c', reason: 'metabolisches Monitoring' },
      { key: 'glucose', reason: 'metabolisches Monitoring' },
      { key: 'lipids', reason: 'metabolisches Monitoring' },
      { key: 'weight', reason: 'metabolisches Monitoring' },
      { key: 'prolactin', reason: 'Hyperprolaktinämie' },
      { key: 'qtc', reason: 'QTc-Verlängerung' },
    ]
  }
  if (/antidepress|ssri|snri/.test(klass)) {
    return [{ key: 'sodium', reason: 'Hyponatriämie (SIADH)' }]
  }
  if (/mood stabilizer|stimmungsstabil|phasenprophyla|antikonvulsiv|antiepilept/.test(klass)) {
    return [
      { key: 'liverEnzymes', reason: 'Hepatotoxizität' },
      { key: 'sodium', reason: 'Hyponatriämie' },
    ]
  }
  return []
}

// ---------------------------------------------------------------------------
// Relevance computation
// ---------------------------------------------------------------------------

export interface AnalyteRationale {
  /** Drug display label that makes this analyte relevant. */
  drug: string
  /** Concise clinical reason. */
  reason: string
}

export interface LabRelevance {
  /** Active substances that matched a curated rule or class fallback. */
  recognizedDrugs: string[]
  /** Active substances with no matching rule (kept transparent for the UI). */
  unrecognizedDrugs: string[]
  /** Canonical analyte key → de-duplicated rationale list. */
  rationaleByKey: Map<AnalyteKey, AnalyteRationale[]>
}

/**
 * Build the medication-driven relevance map for a patient's active regimen.
 * `activeSubstances` are substance display names from the current plan.
 */
export function buildLabRelevance(activeSubstances: string[]): LabRelevance {
  const rationaleByKey = new Map<AnalyteKey, AnalyteRationale[]>()
  const recognizedDrugs: string[] = []
  const unrecognizedDrugs: string[] = []

  const addRationale = (key: AnalyteKey, drug: string, reason: string) => {
    const list = rationaleByKey.get(key) ?? []
    if (!list.some((r) => r.drug === drug && r.reason === reason)) {
      list.push({ drug, reason })
    }
    rationaleByKey.set(key, list)
  }

  for (const substance of activeSubstances) {
    const trimmed = substance.trim()
    if (!trimmed) continue
    const normalized = normalizeSubstance(trimmed)

    const explicit = DRUG_LAB_RULES.find((rule) => rule.match.test(normalized))
    if (explicit) {
      recognizedDrugs.push(explicit.label)
      for (const a of explicit.analytes) addRationale(a.key, explicit.label, a.reason)
      continue
    }

    const fallback = classFallbackAnalytes(trimmed)
    if (fallback.length > 0) {
      recognizedDrugs.push(trimmed)
      for (const a of fallback) addRationale(a.key, trimmed, a.reason)
      continue
    }

    unrecognizedDrugs.push(trimmed)
  }

  return {
    recognizedDrugs: [...new Set(recognizedDrugs)],
    unrecognizedDrugs: [...new Set(unrecognizedDrugs)],
    rationaleByKey,
  }
}

// ---------------------------------------------------------------------------
// Per-analyte classification (consumed by the Verlauf view)
// ---------------------------------------------------------------------------

export interface AnalyteClassification {
  /** Drug serum level → always shown, independent of medication. */
  isSpiegel: boolean
  /** Should this analyte be in the default (relevant) view? */
  isRelevant: boolean
  /** Sort key; lower = more important. Infinity when not relevant. */
  priority: number
  /** Why the analyte is relevant (empty for Spiegel / irrelevant). */
  rationale: AnalyteRationale[]
}

/**
 * Classify a single lab parameter against the medication-driven relevance map.
 * Spiegel analytes are always relevant and sort first.
 */
export function classifyAnalyte(
  paramName: string,
  relevance: LabRelevance,
  categoryLabel = '',
  categoryId = '',
): AnalyteClassification {
  if (isSpiegelAnalyte(paramName, categoryLabel, categoryId)) {
    return { isSpiegel: true, isRelevant: true, priority: -1, rationale: [] }
  }
  const key = matchAnalyteKey(paramName)
  if (key) {
    const rationale = relevance.rationaleByKey.get(key)
    if (rationale && rationale.length > 0) {
      return {
        isSpiegel: false,
        isRelevant: true,
        priority: ANALYTE_PRIORITY[key] ?? 50,
        rationale,
      }
    }
  }
  return { isSpiegel: false, isRelevant: false, priority: Number.POSITIVE_INFINITY, rationale: [] }
}

/** Compact rationale caption, e.g. "Relevant für Clozapin: Agranulozytose-Monitoring". */
export function formatRationaleCaption(rationale: AnalyteRationale[]): string {
  if (rationale.length === 0) return ''
  const drugs = [...new Set(rationale.map((r) => r.drug))].join(', ')
  const reasons = [...new Set(rationale.map((r) => r.reason))].join(' · ')
  return `Relevant für ${drugs}: ${reasons}`
}
