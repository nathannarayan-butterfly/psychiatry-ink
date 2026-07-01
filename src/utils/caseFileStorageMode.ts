import type { IdentifierStorageMode } from './identifierStorage'

/**
 * The single, user-facing storage mode. This is the one source of truth for
 * "where is my data" — every surface (signup wizard, first-login popup,
 * settings page, dashboard hints) must derive its copy from this, never from
 * `identifierStorage` or `tier` alone. That split caused the original bug:
 * a screen could say "synced with your account" while the Fallakte itself
 * was actually local-only, or vice versa.
 *
 *  - 'local'       — identifiers: device,  case file: device
 *  - 'identifiers'  — identifiers: account, case file: device
 *  - 'full'        — identifiers: account, case file: account
 *  - 'advanced'    — identifiers: device,  case file: account (pseudonymous
 *                     sync — only reachable via "Erweiterte Einstellungen",
 *                     never a main default because it confuses non-technical
 *                     users: the case file syncs but the name/DOB do not).
 */
export type CaseFileStorageMode = 'local' | 'identifiers' | 'full' | 'advanced'

export function resolveCaseFileStorageMode(
  identifierStorage: IdentifierStorageMode,
  caseFileCloudSync: boolean,
): CaseFileStorageMode {
  if (caseFileCloudSync) {
    return identifierStorage === 'device' ? 'advanced' : 'full'
  }
  return identifierStorage === 'account' ? 'identifiers' : 'local'
}

/** Inverse of {@link resolveCaseFileStorageMode} — apply a chosen mode to both dials. */
export function caseFileStorageModeToSettings(
  mode: CaseFileStorageMode,
): { identifierStorage: IdentifierStorageMode; caseFileCloudSync: boolean } {
  switch (mode) {
    case 'local':
      return { identifierStorage: 'device', caseFileCloudSync: false }
    case 'identifiers':
      return { identifierStorage: 'account', caseFileCloudSync: false }
    case 'full':
      return { identifierStorage: 'account', caseFileCloudSync: true }
    case 'advanced':
      return { identifierStorage: 'device', caseFileCloudSync: true }
  }
}

export type CaseFileStorageStatusKey =
  | 'storageStatusLocal'
  | 'storageStatusIdentifiers'
  | 'storageStatusFull'
  | 'storageStatusAdvanced'

export function caseFileStorageStatusKey(mode: CaseFileStorageMode): CaseFileStorageStatusKey {
  switch (mode) {
    case 'local':
      return 'storageStatusLocal'
    case 'identifiers':
      return 'storageStatusIdentifiers'
    case 'full':
      return 'storageStatusFull'
    case 'advanced':
      return 'storageStatusAdvanced'
  }
}
