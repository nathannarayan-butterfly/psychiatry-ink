/**
 * Sign-in-time workspace health check.
 *
 * Counts, after the workspace bootstrap finishes:
 *  - registryCases       : how many case IDs the user owns (server or local)
 *  - serverContentCases  : how many of those have an encrypted snapshot on the
 *                          server (`/api/workspace/cases`)
 *  - localContentCases   : how many have a local vault blob in this browser
 *
 * If `serverContentCases < registryCases`, at least one case has an ID but no
 * server-side content — the classic 2026-06-30 outage signature (see
 * RECOVERY_REPORT.md §6 "broken-cohort signature"). Surfacing this on the
 * dashboard lets the clinician know that other devices may hold the original
 * content before they assume the data is gone.
 *
 * The check runs **read-only** — it never writes to IDB, localStorage, or the
 * network beyond a single GET against the workspace cases endpoint.
 */

import { API_BASE } from '../services/apiClient'
import { getAuthHeaders } from '../services/authHeaders'
import { loadRegistryMapFromStorage } from './caseRegistryStorage'
import { getOrCreateDeviceId, getWorkspaceVaultBlob } from './cryptoVault'
import { reportCryptoError } from './cryptoErrorReporter'

export interface WorkspaceHealthSnapshot {
  registryCases: number
  serverContentCases: number
  localContentCases: number
  /** Subset of registry case IDs that have NO content on the server. */
  missingOnServer: string[]
  /** True when the snapshot is informative — server reachable, registry hydrated. */
  ok: boolean
}

const EMPTY_SNAPSHOT: WorkspaceHealthSnapshot = {
  registryCases: 0,
  serverContentCases: 0,
  localContentCases: 0,
  missingOnServer: [],
  ok: false,
}

async function fetchServerCaseIds(countryCode: string): Promise<string[] | null> {
  try {
    const deviceId = getOrCreateDeviceId()
    const params = new URLSearchParams({ deviceId, countryCode })
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/workspace/cases?${params}`, { headers })
    if (!response.ok) {
      // 403 = privacy tier doesn't allow server snapshots (local-only region).
      // That's not a bug — the user has explicitly opted out, so the health
      // check has nothing meaningful to report and we return null to signal
      // "skip this surface".
      if (response.status === 403) return null
      reportCryptoError({
        scope: 'workspace-vault-load',
        code: `cases-http-${response.status}`,
        message: `Workspace case listing returned HTTP ${response.status}`,
      })
      return null
    }
    const data = (await response.json()) as { cases?: { caseId: string }[] }
    return (data.cases ?? []).map((item) => item.caseId)
  } catch (error) {
    reportCryptoError({
      scope: 'workspace-vault-load',
      code: 'cases-fetch-failed',
      error,
    })
    return null
  }
}

async function countLocalVaultBlobs(caseIds: readonly string[]): Promise<number> {
  let count = 0
  for (const caseId of caseIds) {
    try {
      const blob = await getWorkspaceVaultBlob(caseId)
      if (blob) count += 1
    } catch {
      // a local read failure for one case must not poison the whole count
    }
  }
  return count
}

export async function evaluateWorkspaceHealth(
  countryCode: string,
): Promise<WorkspaceHealthSnapshot> {
  const registry = loadRegistryMapFromStorage()
  const registryCaseIds = Object.keys(registry)
  if (registryCaseIds.length === 0) {
    return EMPTY_SNAPSHOT
  }

  const serverCaseIds = await fetchServerCaseIds(countryCode)
  if (!serverCaseIds) {
    // Either the server is unreachable, or the privacy tier blocks server
    // snapshots — in both cases we cannot draw any conclusions about
    // ID-vs-content divergence. Return an OK-but-empty snapshot so the UI
    // does not flash a misleading warning.
    return EMPTY_SNAPSHOT
  }

  const serverSet = new Set(serverCaseIds)
  const missingOnServer = registryCaseIds.filter((id) => !serverSet.has(id))
  const localContentCases = await countLocalVaultBlobs(registryCaseIds)

  return {
    registryCases: registryCaseIds.length,
    serverContentCases: registryCaseIds.filter((id) => serverSet.has(id)).length,
    localContentCases,
    missingOnServer,
    ok: true,
  }
}

/** True when at least one registry case has an ID but no server-side content. */
export function hasIdWithoutContentDivergence(snapshot: WorkspaceHealthSnapshot): boolean {
  return snapshot.ok && snapshot.missingOnServer.length > 0
}
