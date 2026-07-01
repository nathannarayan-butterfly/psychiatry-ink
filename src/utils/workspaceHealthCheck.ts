/**
 * Sign-in-time workspace health check.
 *
 * Counts, after the workspace bootstrap finishes:
 *  - registryCases       : how many case IDs the user owns (server or local)
 *  - serverContentCases  : how many of those have an encrypted snapshot on the
 *                          server (`/api/workspace/cases`)
 *  - localContentCases   : how many have local content in THIS browser (either
 *                          the unified vault blob, or a per-feature durability
 *                          snapshot — see {@link resolveLocalContentByCase})
 *
 * `missingOnServer` only lists cases missing BOTH on the server AND locally —
 * a case with no server snapshot but full local content (e.g. local-only
 * privacy tier, or a vault sync that simply hasn't run yet) is NOT "missing",
 * it just hasn't left this device. Reporting server-absence alone (ignoring
 * local presence) was the original bug: it warned about content that was
 * plainly sitting right there in the browser that created it. A case that is
 * missing everywhere reachable from this device is the classic 2026-06-30
 * outage signature (see RECOVERY_REPORT.md §6 "broken-cohort signature") —
 * surfacing THAT lets the clinician know another device may hold the content
 * before they assume it's gone.
 *
 * The check runs **read-only** — it never writes to IDB, localStorage, or the
 * network beyond a single GET against the workspace cases endpoint.
 */

import { API_BASE } from '../services/apiClient'
import { getAuthHeaders } from '../services/authHeaders'
import { isRegistryShadowHydrated, loadRegistryMapFromStorage } from './caseRegistryStorage'
import { getOrCreateDeviceId, getWorkspaceVaultBlob } from './cryptoVault'
import { hasAnyLocalNotionSnapshot } from './notionDocumentActions'
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

/**
 * Per-case local-content presence: the unified vault blob OR a Notion document
 * durability snapshot (the layer confirmed to have survived the 2026-06-30
 * vault-store outage — see RECOVERY_REPORT.md). Checking only the vault blob
 * under-counts cases whose content is real but hasn't been (re)synced into the
 * unified vault yet.
 */
async function resolveLocalContentByCase(
  caseIds: readonly string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
  for (const caseId of caseIds) {
    let hasContent = false
    try {
      hasContent = hasAnyLocalNotionSnapshot(caseId)
    } catch {
      // a local read failure for one case must not poison the whole check
    }
    if (!hasContent) {
      try {
        const blob = await getWorkspaceVaultBlob(caseId)
        hasContent = Boolean(blob)
      } catch {
        // a local read failure for one case must not poison the whole check
      }
    }
    result.set(caseId, hasContent)
  }
  return result
}

export async function evaluateWorkspaceHealth(
  countryCode: string,
): Promise<WorkspaceHealthSnapshot> {
  // The registry shadow must be hydrated before its synchronous read is
  // trustworthy — otherwise a still-hydrating registry looks emptier than it
  // is. `loadRegistryMapFromStorage()` returns `{}` pre-hydration, which
  // degrades to EMPTY_SNAPSHOT below anyway, but bailing out explicitly here
  // makes the ordering requirement explicit and avoids relying on that
  // fallthrough behaviour.
  if (!isRegistryShadowHydrated()) {
    return EMPTY_SNAPSHOT
  }

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
  const localContentByCase = await resolveLocalContentByCase(registryCaseIds)
  // Only genuinely missing EVERYWHERE reachable from this device — present on
  // neither the server nor locally — counts as "missing". A case with no
  // server snapshot but real local content (local-only privacy tier, or a
  // vault sync that simply hasn't run yet) is not missing; it just hasn't
  // left this device.
  const missingOnServer = registryCaseIds.filter(
    (id) => !serverSet.has(id) && !localContentByCase.get(id),
  )
  const localContentCases = [...localContentByCase.values()].filter(Boolean).length

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
