/**
 * Regression tests for the server-first persist pipeline in
 * `useWorkspaceVault.persist()`. See RECOVERY_REPORT.md §1.2 — the
 * pre-2026-06-30 ordering was:
 *
 *   saveNotionDocumentSnapshot → encrypt → saveWorkspaceVaultBlob → pushRemoteSnapshot
 *
 * which silently lost EVERY edit on devices where the vault store was missing
 * because the server upload sat downstream of the local IDB write that threw.
 *
 * After the fix the order is:
 *
 *   1. saveNotionDocumentSnapshot       (local-storage durability — unchanged)
 *   2. encryptWorkspacePayload          (uses `keys` only — unchanged)
 *   3. pushRemoteSnapshot               (SERVER FIRST — must succeed for save to count)
 *   4. saveWorkspaceVaultBlob           (best-effort local cache; failure → cache-warning)
 *   5. setLastSavedAt / setIsDirty(false) — ONLY after server success
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ── Mocks: every dependency of the persist call path ─────────────────────────
// Hoisted so the vi.mock factories below can reference them safely (vi.mock
// is hoisted to the top of the file by the Vitest transform).
const hoisted = vi.hoisted(() => {
  const persistCalls: string[] = []
  return {
    persistCalls,
    saveNotionDocumentSnapshotMock: vi.fn(() => {
      persistCalls.push('saveNotionDocumentSnapshot')
    }),
    encryptWorkspacePayloadMock: vi.fn(async () => {
      persistCalls.push('encryptWorkspacePayload')
      return { ciphertext: 'x', iv: 'i', wrappedKey: 'w', version: 1 }
    }),
    collectClinicalPayloadMock: vi.fn(() => ({
      version: 1,
      updatedAt: '2026-06-30T20:00:00.000Z',
      documents: [],
      diagnoses: [],
    })),
    saveWorkspaceVaultBlobMock: vi.fn(async () => {
      persistCalls.push('saveWorkspaceVaultBlob')
    }),
    ensureKeyMaterialMock: vi.fn(async () => ({
      publicKeyJwk: {},
      privateKeyJwk: {},
      deviceId: 'device-1',
    })),
    registerPublicKeyIfAllowedMock: vi.fn(async () => null),
    reportCryptoErrorMock: vi.fn(),
    noopHook: () => {},
  }
})

vi.mock('../../utils/cryptoVault', () => ({
  ensureKeyMaterial: hoisted.ensureKeyMaterialMock,
  getOrCreateDeviceId: () => 'device-1',
  registerPublicKeyIfAllowed: hoisted.registerPublicKeyIfAllowedMock,
  saveWorkspaceVaultBlob: hoisted.saveWorkspaceVaultBlobMock,
}))

vi.mock('../../utils/cryptoErrorReporter', () => ({
  reportCryptoError: hoisted.reportCryptoErrorMock,
}))

vi.mock('../../utils/notionDocumentActions', () => ({
  saveNotionDocumentSnapshot: hoisted.saveNotionDocumentSnapshotMock,
}))

vi.mock('../../utils/workspaceVault', () => ({
  applyWorkspacePayloadAsync: vi.fn(async () => {}),
  collectClinicalPayload: hoisted.collectClinicalPayloadMock,
  decryptWorkspaceBlob: vi.fn(),
  deriveTitleHint: () => null,
  downloadWorkspaceVaultFile: vi.fn(),
  encryptWorkspacePayload: hoisted.encryptWorkspacePayloadMock,
  getLastVaultExportAt: () => null,
  loadEncryptedWorkspace: vi.fn(async () => null),
  parseWorkspaceVaultFile: vi.fn(),
  recordVaultExport: vi.fn(),
  saveEncryptedWorkspace: vi.fn(),
  shouldShowBackupReminder: () => false,
}))

vi.mock('../../utils/clinicalCacheHydration', () => ({
  hydrateLocalClinicalCaches: vi.fn(async () => {}),
}))

vi.mock('../../utils/clinicalImprint', () => ({
  registerClinicalImprintPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/isdm/inputStorage', () => ({
  registerIsdmInputPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/isdm/storage', () => ({
  registerIsdmPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/medication/storage', () => ({
  registerMedicationPlanPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/psychotherapy/storage', () => ({
  registerPsychotherapyPlanPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/overview/psychopathFindingStorage', () => ({
  registerPsychopathFindingPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/verlaufstendenz/storage', () => ({
  registerVerlaufstendenzPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/complementaryTherapy/storage', () => ({
  registerComplementaryTherapiesPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/weitereTherapie/storage', () => ({
  registerWeitereTherapiePersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/anforderungen/storage', () => ({
  registerAnforderungenPersistHook: hoisted.noopHook,
}))
vi.mock('../../utils/clinicalQuestions/answerNotes', () => ({
  registerClinicalQuestionNotePersistHook: hoisted.noopHook,
}))

vi.mock('../../utils/accountBackupSession', () => ({
  isAccountBackupUnlocked: () => false,
}))

vi.mock('../../services/accountBackupApi', () => ({
  fetchAccountBackupStatus: vi.fn(async () => null),
}))

vi.mock('../../services/authHeaders', () => ({
  getAuthHeaders: vi.fn(async () => ({})),
}))

vi.mock('../../utils/orgCaseVault', () => ({
  bootstrapOrgCaseVault: vi.fn(),
  getCachedOrgCaseKey: vi.fn(),
  saveOrgCaseVaultPayload: vi.fn(),
}))

vi.mock('../../data/privacyRegions', () => ({
  allowsWorkspaceVault: () => true,
  allowsWorkspaceDbSnapshot: () => true,
}))

// Capture the fetch call ordering (server-first means this MUST fire before
// saveWorkspaceVaultBlob in the success path).
beforeEach(() => {
  hoisted.persistCalls.length = 0
  hoisted.saveNotionDocumentSnapshotMock.mockClear()
  hoisted.encryptWorkspacePayloadMock.mockClear()
  hoisted.saveWorkspaceVaultBlobMock.mockClear()
  hoisted.reportCryptoErrorMock.mockClear()
  hoisted.saveWorkspaceVaultBlobMock.mockImplementation(async () => {
    hoisted.persistCalls.push('saveWorkspaceVaultBlob')
  })

  ;(globalThis as { fetch: typeof fetch }).fetch = vi.fn(async () => {
    hoisted.persistCalls.push('pushRemoteSnapshot:fetch')
    return new Response(JSON.stringify({ updatedAt: '2026-06-30T20:00:00.000Z' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
})

import { useWorkspaceVault } from '../useWorkspaceVault'

let captured: ReturnType<typeof useWorkspaceVault> | null = null

function Probe({ caseId = 'case-A' }: { caseId?: string }) {
  captured = useWorkspaceVault({
    caseId,
    tier: 'full',
    countryCode: 'DE',
    getLivePatch: () => ({
      documentTypeId: 'aufnahme',
      pageHeading: '',
      sectionContents: { aufnahme: 'hello' },
      sectionMetadata: undefined,
    }),
  })
  return null
}

let container: HTMLDivElement
let root: Root | null = null

async function mountProbe() {
  container = document.createElement('div')
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(Probe))
    await Promise.resolve()
  })
}

afterEach(async () => {
  if (root) {
    const current = root
    await act(async () => {
      current.unmount()
    })
    root = null
  }
  captured = null
})

async function flushAsync() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('useWorkspaceVault.persist — server-first ordering', () => {
  it('runs pushRemoteSnapshot BEFORE saveWorkspaceVaultBlob and only marks saved after server success', async () => {
    await mountProbe()
    await flushAsync()
    // Wipe any fetch traces from the boot-time fetchRemoteSnapshot — the
    // ordering assertion is about the persist call path only.
    hoisted.persistCalls.length = 0

    await act(async () => {
      await captured!.saveNow()
    })
    await flushAsync()

    // Order assertion: notion snapshot → encrypt → SERVER fetch → local IDB
    const order = hoisted.persistCalls
    expect(order[0]).toBe('saveNotionDocumentSnapshot')
    expect(order[1]).toBe('encryptWorkspacePayload')
    expect(order[2]).toBe('pushRemoteSnapshot:fetch')
    expect(order[3]).toBe('saveWorkspaceVaultBlob')

    expect(captured!.saveStatus).toBe('success')
    expect(captured!.lastSavedAt).toBe('2026-06-30T20:00:00.000Z')
    expect(captured!.isDirty).toBe(false)
    expect(captured!.error).toBeNull()
  })

  it('does NOT setLastSavedAt and surfaces saveStatus=failed when the server write fails', async () => {
    await mountProbe()
    await flushAsync()
    hoisted.persistCalls.length = 0

    // Override the fetch for this test — the boot-time fetch was a 200 so the
    // bootstrap path completes; only the persist push needs to 503.
    ;(globalThis as { fetch: typeof fetch }).fetch = vi.fn(async () => {
      hoisted.persistCalls.push('pushRemoteSnapshot:fetch')
      return new Response('boom', { status: 503 })
    }) as typeof fetch

    let threw = false
    await act(async () => {
      try {
        await captured!.saveNow()
      } catch {
        threw = true
      }
    })
    await flushAsync()

    expect(threw).toBe(true)
    expect(captured!.saveStatus).toBe('failed')
    expect(captured!.lastSavedAt).toBeNull()
    expect(captured!.error).toMatch(/HTTP 503|Workspace snapshot push failed/i)
    // SERVER FIRST contract — local IDB must NOT have been written because the
    // server write failed and the user MUST see the persistent failure badge.
    expect(hoisted.saveWorkspaceVaultBlobMock).not.toHaveBeenCalled()
    expect(hoisted.reportCryptoErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'workspace-snapshot-push' }),
    )
  })

  it('completes the save but surfaces cache-warning when the local IDB write fails AFTER server success', async () => {
    await mountProbe()
    await flushAsync()
    hoisted.persistCalls.length = 0

    hoisted.saveWorkspaceVaultBlobMock.mockImplementationOnce(async () => {
      hoisted.persistCalls.push('saveWorkspaceVaultBlob')
      throw new Error("'vault' is not a known object store name")
    })

    await act(async () => {
      await captured!.saveNow()
    })
    await flushAsync()

    expect(captured!.saveStatus).toBe('cache-warning')
    expect(captured!.lastSavedAt).toBe('2026-06-30T20:00:00.000Z')
    expect(captured!.isDirty).toBe(false)
    expect(hoisted.reportCryptoErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'workspace-vault-save',
        code: 'idb-write-failed-after-server-success',
      }),
    )
  })
})
