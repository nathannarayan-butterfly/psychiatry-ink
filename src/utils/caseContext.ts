/** Opaque patient case identifier — never PHI. */

export const DEFAULT_CASE_ID = 'default'

let activeCaseId = DEFAULT_CASE_ID

export function getActiveCaseId(): string {
  return activeCaseId
}

export function setActiveCaseId(caseId: string): void {
  activeCaseId = caseId
}

/**
 * Reset the active case back to the default workspace. Called when device-local
 * clinical data is purged on an auth identity change so the in-memory pointer
 * never keeps referencing a previous user's case id.
 */
export function resetActiveCaseId(): void {
  activeCaseId = DEFAULT_CASE_ID
}

export function createCaseId(): string {
  return crypto.randomUUID()
}

/** Prefix a storage key with the active (or given) case id. */
export function caseStorageKey(baseKey: string, caseId?: string): string {
  const id = caseId ?? getActiveCaseId()
  return `${baseKey}::${id}`
}

export function shortCaseId(caseId: string): string {
  return caseId.slice(0, 8)
}
