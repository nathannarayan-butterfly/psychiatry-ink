/** Major Therapie tab page sections (non-medication therapies). */
export const THERAPY_PAGE_SECTIONS = [
  { key: 'weitere' },
  { key: 'psychotherapie' },
  { key: 'komplementaer' },
  { key: 'sozial' },
  { key: 'notizen' },
] as const

export type TherapyPageSectionKey = (typeof THERAPY_PAGE_SECTIONS)[number]['key']

/** Therapy areas that support structured planning (excludes journal notes). */
export const THERAPY_PLANNING_SECTIONS = THERAPY_PAGE_SECTIONS.filter(
  (section) => section.key !== 'notizen',
)

export type TherapyPlanningSectionKey = (typeof THERAPY_PLANNING_SECTIONS)[number]['key']

const THERAPY_PLANNING_KEY_SET = new Set<string>(
  THERAPY_PLANNING_SECTIONS.map((section) => section.key),
)

/** Workspace context-menu subsection id for a therapy planning type. */
export function therapyPlanningSubsectionId(key: TherapyPlanningSectionKey): string {
  return `therapy-${key}`
}

/** Parse a workspace subsection id back to a therapy planning type. */
export function parseTherapyPlanningSubsectionId(id: string): TherapyPlanningSectionKey | null {
  if (!id.startsWith('therapy-')) return null
  const key = id.slice('therapy-'.length)
  return THERAPY_PLANNING_KEY_SET.has(key) ? (key as TherapyPlanningSectionKey) : null
}

/** DOM id for a Therapie tab page-section anchor target. */
export function therapyPageSectionDomId(key: TherapyPageSectionKey): string {
  return `therapy-section-${key}`
}
