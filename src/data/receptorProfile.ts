import type { UiLanguage } from '../types/settings'
import type { ReceptorAction } from '../types/knowledgeBase'

type LocaleMap = Record<UiLanguage, string>

/**
 * Canonical receptor keys supported by the receptor-profile feature.
 * The list is intentionally open (config-driven) so additional targets can be
 * added later without touching the visualisations.
 */
export type ReceptorKey =
  | 'D2'
  | 'D3'
  | '5-HT2A'
  | '5-HT1A'
  | '5-HT2C'
  | 'H1'
  | 'M1'
  | 'alpha1'
  | 'alpha2'
  | 'SERT'
  | 'NET'
  | 'DAT'

/**
 * Burden tags wire a receptor into higher-level clinical scores that can be
 * derived later (sedation, anticholinergic load, EPS/prolactin, orthostasis,
 * metabolic, QT). They are structural hints only — no scoring is forced here.
 */
export type BurdenTag =
  | 'sedation'
  | 'anticholinergic'
  | 'eps'
  | 'prolactin'
  | 'orthostasis'
  | 'metabolic'

export interface ReceptorConfigEntry {
  key: ReceptorKey
  /** Short display label (language-independent receptor symbol). */
  label: string
  /** Default ordering for matrix rows / radar axes. */
  order: number
  /** Localised one-line clinical meaning. */
  clinicalMeaning: LocaleMap
  /** Higher-level burden categories this receptor contributes to. */
  burdenTags: BurdenTag[]
}

export const RECEPTOR_CONFIG: ReceptorConfigEntry[] = [
  {
    key: 'D2',
    label: 'D2',
    order: 0,
    burdenTags: ['eps', 'prolactin'],
    clinicalMeaning: {
      de: 'EPS/Prolaktin/antipsychotische Wirkung',
      en: 'EPS / prolactin / antipsychotic effect',
      fr: 'SEP / prolactine / effet antipsychotique',
      es: 'SEP / prolactina / efecto antipsicótico',
    },
  },
  {
    key: 'D3',
    label: 'D3',
    order: 1,
    burdenTags: [],
    clinicalMeaning: {
      de: 'antipsychotisch/motivational',
      en: 'antipsychotic / motivational',
      fr: 'antipsychotique / motivationnel',
      es: 'antipsicótico / motivacional',
    },
  },
  {
    key: '5-HT2A',
    label: '5-HT2A',
    order: 2,
    burdenTags: ['metabolic'],
    clinicalMeaning: {
      de: 'atypisches Antipsychotika-Profil',
      en: 'atypical antipsychotic profile',
      fr: 'profil antipsychotique atypique',
      es: 'perfil antipsicótico atípico',
    },
  },
  {
    key: '5-HT1A',
    label: '5-HT1A',
    order: 3,
    burdenTags: [],
    clinicalMeaning: {
      de: 'anxiolytisch/antidepressiv',
      en: 'anxiolytic / antidepressant',
      fr: 'anxiolytique / antidépresseur',
      es: 'ansiolítico / antidepresivo',
    },
  },
  {
    key: '5-HT2C',
    label: '5-HT2C',
    order: 4,
    burdenTags: ['metabolic'],
    clinicalMeaning: {
      de: 'Appetit/Gewicht',
      en: 'appetite / weight',
      fr: 'appétit / poids',
      es: 'apetito / peso',
    },
  },
  {
    key: 'H1',
    label: 'H1',
    order: 5,
    burdenTags: ['sedation', 'metabolic'],
    clinicalMeaning: {
      de: 'Sedierung/Gewichtszunahme',
      en: 'sedation / weight gain',
      fr: 'sédation / prise de poids',
      es: 'sedación / aumento de peso',
    },
  },
  {
    key: 'M1',
    label: 'M1',
    order: 6,
    burdenTags: ['anticholinergic'],
    clinicalMeaning: {
      de: 'anticholinerge Last',
      en: 'anticholinergic burden',
      fr: 'charge anticholinergique',
      es: 'carga anticolinérgica',
    },
  },
  {
    key: 'alpha1',
    label: 'α1',
    order: 7,
    burdenTags: ['orthostasis'],
    clinicalMeaning: {
      de: 'Orthostase/Sturzrisiko',
      en: 'orthostasis / fall risk',
      fr: 'orthostatisme / risque de chute',
      es: 'ortostatismo / riesgo de caídas',
    },
  },
  {
    key: 'alpha2',
    label: 'α2',
    order: 8,
    burdenTags: [],
    clinicalMeaning: {
      de: 'noradrenerg',
      en: 'noradrenergic',
      fr: 'noradrénergique',
      es: 'noradrenérgico',
    },
  },
  {
    key: 'SERT',
    label: 'SERT',
    order: 9,
    burdenTags: [],
    clinicalMeaning: {
      de: 'Serotonin-Wiederaufnahme (antidepressiv)',
      en: 'serotonin reuptake (antidepressant)',
      fr: 'recapture de la sérotonine (antidépresseur)',
      es: 'recaptación de serotonina (antidepresivo)',
    },
  },
  {
    key: 'NET',
    label: 'NET',
    order: 10,
    burdenTags: [],
    clinicalMeaning: {
      de: 'Noradrenalin-Wiederaufnahme',
      en: 'noradrenaline reuptake',
      fr: 'recapture de la noradrénaline',
      es: 'recaptación de noradrenalina',
    },
  },
  {
    key: 'DAT',
    label: 'DAT',
    order: 11,
    burdenTags: [],
    clinicalMeaning: {
      de: 'Dopamin-Wiederaufnahme',
      en: 'dopamine reuptake',
      fr: 'recapture de la dopamine',
      es: 'recaptación de dopamina',
    },
  },
]

export const RECEPTOR_KEYS: ReceptorKey[] = RECEPTOR_CONFIG.map((r) => r.key)

const RECEPTOR_BY_KEY = new Map<string, ReceptorConfigEntry>(
  RECEPTOR_CONFIG.map((entry) => [entry.key, entry]),
)

export function getReceptorConfig(key: string): ReceptorConfigEntry | undefined {
  return RECEPTOR_BY_KEY.get(key)
}

export function getReceptorLabel(key: string): string {
  return RECEPTOR_BY_KEY.get(key)?.label ?? key
}

export function getReceptorClinicalMeaning(key: string, language: UiLanguage): string {
  return RECEPTOR_BY_KEY.get(key)?.clinicalMeaning[language] ?? ''
}

// ── Score scale (0..5) ───────────────────────────────────────────────────────

export const RECEPTOR_SCORE_MIN = 0
export const RECEPTOR_SCORE_MAX = 5

const SCORE_LABELS: Record<number, LocaleMap> = {
  0: { de: 'keine', en: 'none', fr: 'aucune', es: 'ninguna' },
  1: { de: 'vernachlässigbar', en: 'negligible', fr: 'négligeable', es: 'insignificante' },
  2: { de: 'gering', en: 'mild', fr: 'faible', es: 'leve' },
  3: { de: 'moderat', en: 'moderate', fr: 'modérée', es: 'moderada' },
  4: { de: 'stark', en: 'strong', fr: 'forte', es: 'fuerte' },
  5: { de: 'dominant', en: 'dominant', fr: 'dominante', es: 'dominante' },
}

export function getScoreLabel(score: number, language: UiLanguage): string {
  const clamped = Math.max(RECEPTOR_SCORE_MIN, Math.min(RECEPTOR_SCORE_MAX, Math.round(score)))
  return SCORE_LABELS[clamped]?.[language] ?? String(clamped)
}

// ── Action types ─────────────────────────────────────────────────────────────

export const RECEPTOR_ACTIONS: ReceptorAction[] = [
  'antagonist',
  'partial-agonist',
  'agonist',
  'reuptake-inhibition',
  'unknown',
]

const ACTION_LABELS: Record<ReceptorAction, LocaleMap> = {
  antagonist: { de: 'Antagonist', en: 'Antagonist', fr: 'Antagoniste', es: 'Antagonista' },
  'partial-agonist': {
    de: 'Partialagonist',
    en: 'Partial agonist',
    fr: 'Agoniste partiel',
    es: 'Agonista parcial',
  },
  agonist: { de: 'Agonist', en: 'Agonist', fr: 'Agoniste', es: 'Agonista' },
  'reuptake-inhibition': {
    de: 'Wiederaufnahmehemmung',
    en: 'Reuptake inhibition',
    fr: 'Inhibition de la recapture',
    es: 'Inhibición de la recaptación',
  },
  unknown: { de: 'Unbekannt', en: 'Unknown', fr: 'Inconnu', es: 'Desconocido' },
}

export function getActionLabel(action: ReceptorAction, language: UiLanguage): string {
  return ACTION_LABELS[action][language]
}

// ── Per-drug colour palette (calm clinical hues, assigned by index) ───────────

export const RECEPTOR_DRUG_PALETTE: string[] = [
  '#2563eb', // blue
  '#0d9488', // teal
  '#d97706', // amber
  '#7c3aed', // violet
  '#db2777', // rose
  '#475569', // slate
]

export function getDrugColor(index: number): string {
  return RECEPTOR_DRUG_PALETTE[index % RECEPTOR_DRUG_PALETTE.length]!
}

// ── Optional user receptor config (localStorage) ──────────────────────────────
// Receptors can be hidden / reordered later. Persisted config defaults to the
// full ordered list; consumers fall back to RECEPTOR_CONFIG when absent.

export interface UserReceptorConfig {
  /** Ordered receptor keys (subset/superset of RECEPTOR_KEYS). */
  order: ReceptorKey[]
  /** Keys explicitly hidden by the user. */
  hidden: ReceptorKey[]
}

const USER_CONFIG_STORAGE_KEY = 'psychiatry-ink:receptorConfig'

export function defaultUserReceptorConfig(): UserReceptorConfig {
  return { order: [...RECEPTOR_KEYS], hidden: [] }
}

export function loadUserReceptorConfig(): UserReceptorConfig {
  try {
    const raw = localStorage.getItem(USER_CONFIG_STORAGE_KEY)
    if (!raw) return defaultUserReceptorConfig()
    const parsed = JSON.parse(raw) as Partial<UserReceptorConfig>
    const order = Array.isArray(parsed.order)
      ? (parsed.order.filter((k): k is ReceptorKey => RECEPTOR_BY_KEY.has(k)) as ReceptorKey[])
      : [...RECEPTOR_KEYS]
    // Append any newly-added receptors that are missing from a stored config.
    for (const key of RECEPTOR_KEYS) if (!order.includes(key)) order.push(key)
    const hidden = Array.isArray(parsed.hidden)
      ? (parsed.hidden.filter((k): k is ReceptorKey => RECEPTOR_BY_KEY.has(k)) as ReceptorKey[])
      : []
    return { order, hidden }
  } catch {
    return defaultUserReceptorConfig()
  }
}

export function saveUserReceptorConfig(config: UserReceptorConfig): void {
  try {
    localStorage.setItem(USER_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore storage errors
  }
}

/** Ordered, visible receptor keys derived from an (optional) user config. */
export function getOrderedReceptorKeys(config?: UserReceptorConfig): ReceptorKey[] {
  if (!config) return [...RECEPTOR_KEYS]
  const hidden = new Set(config.hidden)
  return config.order.filter((key) => !hidden.has(key))
}
