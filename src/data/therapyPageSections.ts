/** Major Therapie tab page sections (below Medikamentöse Therapie). */
export const THERAPY_PAGE_SECTIONS = [
  { key: 'weitere' },
  { key: 'psychotherapie' },
  { key: 'komplementaer' },
  { key: 'sozial' },
  { key: 'notizen' },
] as const

export type TherapyPageSectionKey = (typeof THERAPY_PAGE_SECTIONS)[number]['key']

/** DOM id for a Therapie tab page-section anchor target. */
export function therapyPageSectionDomId(key: TherapyPageSectionKey): string {
  return `therapy-section-${key}`
}
