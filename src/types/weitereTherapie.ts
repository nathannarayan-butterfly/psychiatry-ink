/**
 * Weitere Therapieverfahren — per-case documentation of neurostimulation / biological
 * treatments (EKT, rTMS, Neurofeedback, Lichttherapie, Ketamin/Esketamin, …) that are
 * neither pharmacological in the narrow sense nor psychotherapy / complementary therapy.
 *
 * The Therapie module overview card shows ONLY a compact set of summary fields; the full
 * documentation (common fields plus type-specific subsections) lives in the editable
 * right-side detail panel. Treatment types are chosen from a default list or added as
 * free-text custom names, since the menu differs between hospitals.
 *
 * Stored per case as an array, write-through to localStorage for crash/close durability and
 * additively into the encrypted workspace vault.
 */

export const WEITERE_THERAPIE_VERSION = 1

export type WeitereTherapieStatus =
  | 'planned'
  | 'ongoing'
  | 'paused'
  | 'completed'
  | 'declined'
  | 'contraindicated'

export const WEITERE_THERAPIE_STATUSES: WeitereTherapieStatus[] = [
  'planned',
  'ongoing',
  'paused',
  'completed',
  'declined',
  'contraindicated',
]

/** Type-specific optional documentation for EKT (electroconvulsive therapy). */
export interface WeitereTherapieEkt {
  legalConsentStatus?: string
  anesthesiaClearance?: string
  seizureQuality?: string
  electrodePlacement?: string
  numberOfSessions?: string
  cognitiveSideEffects?: string
  maintenancePlanning?: string
}

/** Type-specific optional documentation for rTMS (repetitive transcranial magnetic stimulation). */
export interface WeitereTherapieRtms {
  protocol?: string
  targetArea?: string
  stimulationFrequency?: string
  intensity?: string
  numberOfPulses?: string
  plannedSessions?: string
  completedSessions?: string
  response?: string
}

/** Type-specific optional documentation for Neurofeedback. */
export interface WeitereTherapieNeurofeedback {
  targetDomain?: string
  protocol?: string
  sessionCount?: string
  trainingResponse?: string
  adherence?: string
}

export interface WeitereTherapie {
  id: string
  /** From the default list or a custom free-text name. */
  type: string
  indication?: string
  clinicalGoal?: string
  status: WeitereTherapieStatus
  startDate?: string
  plannedSessions?: number
  completedSessions?: number
  frequency?: string
  responsible?: string
  consentDocumented?: boolean
  contraindicationsChecked?: boolean
  monitoring?: string
  response?: string
  sideEffects?: string
  nextReviewDate?: string
  notes?: string
  ekt?: WeitereTherapieEkt
  rtms?: WeitereTherapieRtms
  neurofeedback?: WeitereTherapieNeurofeedback
  createdAt: string
  updatedAt: string
}

/**
 * Default treatment types offered in the "+ Verfahren hinzufügen" picker. Each id maps to a
 * translation key (resolved by the component); users may also enter a custom name.
 * The `ekt` / `rtms` / `neurofeedback` ids drive the type-specific detail subsection.
 */
export const DEFAULT_WEITERE_THERAPIE_TYPES = [
  'ekt',
  'rtms',
  'neurofeedback',
  'lichttherapie',
  'schlafentzug',
  'ketamin',
  'biofeedback',
  'andere',
] as const

export type DefaultWeitereTherapieType = (typeof DEFAULT_WEITERE_THERAPIE_TYPES)[number]

export function createWeitereTherapie(type: string): WeitereTherapie {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    type: type.trim(),
    indication: '',
    clinicalGoal: '',
    status: 'planned',
    startDate: '',
    frequency: '',
    responsible: '',
    consentDocumented: false,
    contraindicationsChecked: false,
    monitoring: '',
    response: '',
    sideEffects: '',
    nextReviewDate: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return undefined
}

function ensureEkt(value: unknown): WeitereTherapieEkt | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  const group: WeitereTherapieEkt = {
    legalConsentStatus: optionalString(v.legalConsentStatus),
    anesthesiaClearance: optionalString(v.anesthesiaClearance),
    seizureQuality: optionalString(v.seizureQuality),
    electrodePlacement: optionalString(v.electrodePlacement),
    numberOfSessions: optionalString(v.numberOfSessions),
    cognitiveSideEffects: optionalString(v.cognitiveSideEffects),
    maintenancePlanning: optionalString(v.maintenancePlanning),
  }
  return Object.values(group).some((entry) => entry !== undefined) ? group : undefined
}

function ensureRtms(value: unknown): WeitereTherapieRtms | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  const group: WeitereTherapieRtms = {
    protocol: optionalString(v.protocol),
    targetArea: optionalString(v.targetArea),
    stimulationFrequency: optionalString(v.stimulationFrequency),
    intensity: optionalString(v.intensity),
    numberOfPulses: optionalString(v.numberOfPulses),
    plannedSessions: optionalString(v.plannedSessions),
    completedSessions: optionalString(v.completedSessions),
    response: optionalString(v.response),
  }
  return Object.values(group).some((entry) => entry !== undefined) ? group : undefined
}

function ensureNeurofeedback(value: unknown): WeitereTherapieNeurofeedback | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  const group: WeitereTherapieNeurofeedback = {
    targetDomain: optionalString(v.targetDomain),
    protocol: optionalString(v.protocol),
    sessionCount: optionalString(v.sessionCount),
    trainingResponse: optionalString(v.trainingResponse),
    adherence: optionalString(v.adherence),
  }
  return Object.values(group).some((entry) => entry !== undefined) ? group : undefined
}

/** Normalizes a possibly-partial entry (e.g. from an older vault payload) to the current shape. */
export function ensureWeitereTherapie(
  entry: Partial<WeitereTherapie> | null | undefined,
): WeitereTherapie | null {
  if (!entry || typeof entry.id !== 'string' || typeof entry.type !== 'string') {
    return null
  }
  const now = new Date().toISOString()
  const status = WEITERE_THERAPIE_STATUSES.includes(entry.status as WeitereTherapieStatus)
    ? (entry.status as WeitereTherapieStatus)
    : 'planned'
  return {
    id: entry.id,
    type: entry.type,
    indication: entry.indication ?? '',
    clinicalGoal: entry.clinicalGoal ?? '',
    status,
    startDate: entry.startDate ?? '',
    plannedSessions: optionalNumber(entry.plannedSessions),
    completedSessions: optionalNumber(entry.completedSessions),
    frequency: entry.frequency ?? '',
    responsible: entry.responsible ?? '',
    consentDocumented: entry.consentDocumented === true,
    contraindicationsChecked: entry.contraindicationsChecked === true,
    monitoring: entry.monitoring ?? '',
    response: entry.response ?? '',
    sideEffects: entry.sideEffects ?? '',
    nextReviewDate: entry.nextReviewDate ?? '',
    notes: entry.notes ?? '',
    ekt: ensureEkt(entry.ekt),
    rtms: ensureRtms(entry.rtms),
    neurofeedback: ensureNeurofeedback(entry.neurofeedback),
    createdAt: entry.createdAt ?? now,
    updatedAt: entry.updatedAt ?? now,
  }
}

/** Normalizes an array of entries, dropping malformed ones. */
export function ensureWeitereTherapien(list: unknown): WeitereTherapie[] {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => ensureWeitereTherapie(item as Partial<WeitereTherapie>))
    .filter((item): item is WeitereTherapie => item !== null)
}
