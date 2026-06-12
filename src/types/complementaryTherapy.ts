/**
 * Complementary therapies — compact per-case documentation for non-pharmacological,
 * non-psychotherapy treatments (Ergotherapie, Sporttherapie, Musiktherapie, …).
 *
 * The Therapie module overview shows ONLY the five summary fields; detailed planning
 * and a session/participation log live in the editable detail panel. Therapy types are
 * either chosen from a default list or added as free-text custom names, since the menu
 * of complementary therapies differs from hospital to hospital.
 *
 * Stored per case as an array, write-through to localStorage and additively into the
 * encrypted workspace vault.
 */

export const COMPLEMENTARY_THERAPY_VERSION = 1

export type ComplementaryTherapyStatus = 'active' | 'planned' | 'paused' | 'completed'

export const COMPLEMENTARY_THERAPY_STATUSES: ComplementaryTherapyStatus[] = [
  'active',
  'planned',
  'paused',
  'completed',
]

/** A single dated entry in the participation/session log. */
export interface ComplementaryTherapySession {
  id: string
  date: string
  note: string
}

export interface ComplementaryTherapy {
  id: string
  /** From the default list or a custom free-text name. */
  name: string
  status: ComplementaryTherapyStatus
  frequency?: string
  /** Main therapeutic goal — shown in the overview card. */
  mainGoal?: string
  /** Short participation/response note — shown in the overview card. */
  participationStatus?: string
  setting?: string
  additionalGoals?: string
  startDate?: string
  notes?: string
  sessions?: ComplementaryTherapySession[]
  nextFocus?: string
  createdAt: string
  updatedAt: string
}

/**
 * Default therapy types offered in the "+ Therapie hinzufügen" picker. Each id maps to a
 * translation key (resolved by the component); users may also enter a custom name.
 */
export const DEFAULT_COMPLEMENTARY_THERAPY_TYPES = [
  'ergotherapie',
  'sporttherapie',
  'musiktherapie',
  'kunsttherapie',
  'skillgruppe',
  'fokusgruppe',
  'psychoedukation',
  'suchtgruppe',
  'entspannungstraining',
  'arbeitstherapie',
  'gruppentherapien',
] as const

export type DefaultComplementaryTherapyType = (typeof DEFAULT_COMPLEMENTARY_THERAPY_TYPES)[number]

export function createComplementaryTherapy(name: string): ComplementaryTherapy {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    status: 'planned',
    frequency: '',
    mainGoal: '',
    participationStatus: '',
    setting: '',
    additionalGoals: '',
    startDate: '',
    notes: '',
    sessions: [],
    nextFocus: '',
    createdAt: now,
    updatedAt: now,
  }
}

/** Normalizes a possibly-partial therapy (e.g. from an older vault payload) to the current shape. */
export function ensureComplementaryTherapy(
  therapy: Partial<ComplementaryTherapy> | null | undefined,
): ComplementaryTherapy | null {
  if (!therapy || typeof therapy.id !== 'string' || typeof therapy.name !== 'string') {
    return null
  }
  const now = new Date().toISOString()
  const status = COMPLEMENTARY_THERAPY_STATUSES.includes(
    therapy.status as ComplementaryTherapyStatus,
  )
    ? (therapy.status as ComplementaryTherapyStatus)
    : 'planned'
  return {
    id: therapy.id,
    name: therapy.name,
    status,
    frequency: therapy.frequency ?? '',
    mainGoal: therapy.mainGoal ?? '',
    participationStatus: therapy.participationStatus ?? '',
    setting: therapy.setting ?? '',
    additionalGoals: therapy.additionalGoals ?? '',
    startDate: therapy.startDate ?? '',
    notes: therapy.notes ?? '',
    sessions: Array.isArray(therapy.sessions)
      ? therapy.sessions.filter(
          (s): s is ComplementaryTherapySession =>
            !!s && typeof s.id === 'string' && typeof s.date === 'string' && typeof s.note === 'string',
        )
      : [],
    nextFocus: therapy.nextFocus ?? '',
    createdAt: therapy.createdAt ?? now,
    updatedAt: therapy.updatedAt ?? now,
  }
}

/** Normalizes an array of therapies, dropping malformed entries. */
export function ensureComplementaryTherapies(
  list: unknown,
): ComplementaryTherapy[] {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => ensureComplementaryTherapy(item as Partial<ComplementaryTherapy>))
    .filter((item): item is ComplementaryTherapy => item !== null)
}
