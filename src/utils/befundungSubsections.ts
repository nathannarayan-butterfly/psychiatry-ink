import type { BefundType } from '../types/befund'

const BEFUND_TYPE_IDS: BefundType[] = ['ecg', 'eeg']

/** Workspace context-menu subsection id for a Befundung type. */
export function befundungSubsectionId(type: BefundType): string {
  return `befund-${type}`
}

/** Parse a workspace subsection id back to a Befundung type. */
export function parseBefundungSubsectionId(id: string): BefundType | null {
  if (!id.startsWith('befund-')) return null
  const type = id.slice('befund-'.length)
  return BEFUND_TYPE_IDS.includes(type as BefundType) ? (type as BefundType) : null
}

export const BEFUNDUNG_SUBSECTION_TYPES: BefundType[] = BEFUND_TYPE_IDS
