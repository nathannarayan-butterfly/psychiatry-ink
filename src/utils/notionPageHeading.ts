import { caseStorageKey, DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'

const KEY_PREFIX = 'psychiatry-ink:notion-page-heading'

export function notionPageHeadingKey(documentTypeId: string, caseId?: string): string {
  return caseStorageKey(`${KEY_PREFIX}:${documentTypeId}`, caseId)
}

function legacyPageHeadingKey(documentTypeId: string): string {
  return `psychiatry-ink:notion-page-heading:${documentTypeId}`
}

export function loadNotionPageHeading(documentTypeId: string, caseId?: string): string {
  try {
    const scoped = localStorage.getItem(notionPageHeadingKey(documentTypeId, caseId))
    if (scoped) return scoped
    if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
      return localStorage.getItem(legacyPageHeadingKey(documentTypeId)) ?? ''
    }
    return ''
  } catch {
    return ''
  }
}

export function saveNotionPageHeading(documentTypeId: string, heading: string, caseId?: string): void {
  try {
    if (heading.trim()) {
      localStorage.setItem(notionPageHeadingKey(documentTypeId, caseId), heading)
    } else {
      localStorage.removeItem(notionPageHeadingKey(documentTypeId, caseId))
    }
  } catch {
    // ignore quota errors
  }
}
