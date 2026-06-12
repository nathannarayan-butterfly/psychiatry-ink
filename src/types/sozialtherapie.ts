/**
 * Sozialtherapie — compact per-case documentation of psychosocial treatment targets
 * relevant to the clinical course and discharge planning (housing, work, finances,
 * aftercare, …).
 *
 * The Therapie module overview shows ONLY the four summary fields (status, goal, current
 * measure, responsible role); detailed planning, tasks, notes and dates live in the
 * editable detail panel. Target areas are either chosen from the predefined list or added
 * as free-text custom names.
 *
 * Stored per case as an array, write-through to localStorage for crash/close durability.
 */

export const SOZIALTHERAPIE_VERSION = 1

export type SozialtherapieStatus =
  | 'open'
  | 'in-progress'
  | 'arranged'
  | 'resolved'
  | 'not-relevant'

export const SOZIALTHERAPIE_STATUSES: SozialtherapieStatus[] = [
  'open',
  'in-progress',
  'arranged',
  'resolved',
  'not-relevant',
]

/** A single actionable task within a psychosocial target area. */
export interface SozialtherapieTask {
  id: string
  text: string
  done: boolean
}

export interface SozialtherapieTarget {
  id: string
  /** Predefined area key (see DEFAULT_SOZIALTHERAPIE_AREAS) or a custom free-text name. */
  area: string
  status: SozialtherapieStatus
  goal?: string
  currentMeasure?: string
  /** e.g. Sozialdienst, Bezugspflege, Arzt, Betreuer. */
  responsibleRole?: string
  tasks?: SozialtherapieTask[]
  notes?: string
  nextSteps?: string
  dates?: string
  createdAt: string
  updatedAt: string
}

/**
 * Predefined psychosocial target areas offered when adding a card. Each id maps to a
 * translation key (resolved by the component); users may also enter a custom name.
 */
export const DEFAULT_SOZIALTHERAPIE_AREAS = [
  'wohnen',
  'arbeit',
  'finanzen',
  'familie',
  'recht',
  'nachsorge',
  'sozialdienst',
  'entlassvorbereitung',
] as const

export type DefaultSozialtherapieArea = (typeof DEFAULT_SOZIALTHERAPIE_AREAS)[number]

export function createSozialtherapieTarget(area: string): SozialtherapieTarget {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    area: area.trim(),
    status: 'open',
    goal: '',
    currentMeasure: '',
    responsibleRole: '',
    tasks: [],
    notes: '',
    nextSteps: '',
    dates: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function createSozialtherapieTask(text: string): SozialtherapieTask {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    done: false,
  }
}

/** Normalizes a possibly-partial target (e.g. from an older payload) to the current shape. */
export function ensureSozialtherapieTarget(
  target: Partial<SozialtherapieTarget> | null | undefined,
): SozialtherapieTarget | null {
  if (!target || typeof target.id !== 'string' || typeof target.area !== 'string') {
    return null
  }
  const now = new Date().toISOString()
  const status = SOZIALTHERAPIE_STATUSES.includes(target.status as SozialtherapieStatus)
    ? (target.status as SozialtherapieStatus)
    : 'open'
  return {
    id: target.id,
    area: target.area,
    status,
    goal: target.goal ?? '',
    currentMeasure: target.currentMeasure ?? '',
    responsibleRole: target.responsibleRole ?? '',
    tasks: Array.isArray(target.tasks)
      ? target.tasks.filter(
          (task): task is SozialtherapieTask =>
            !!task &&
            typeof task.id === 'string' &&
            typeof task.text === 'string' &&
            typeof task.done === 'boolean',
        )
      : [],
    notes: target.notes ?? '',
    nextSteps: target.nextSteps ?? '',
    dates: target.dates ?? '',
    createdAt: target.createdAt ?? now,
    updatedAt: target.updatedAt ?? now,
  }
}

/** Normalizes an array of targets, dropping malformed entries. */
export function ensureSozialtherapieTargets(list: unknown): SozialtherapieTarget[] {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => ensureSozialtherapieTarget(item as Partial<SozialtherapieTarget>))
    .filter((item): item is SozialtherapieTarget => item !== null)
}
