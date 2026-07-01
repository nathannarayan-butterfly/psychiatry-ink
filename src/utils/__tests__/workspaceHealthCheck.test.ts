// @vitest-environment node
//
// Sign-in-time health check: server-side case IDs vs server-side cases-with-content.
// See RECOVERY_REPORT.md §6. The check is the dashboard's last line of defence
// against the silent ID-without-content state that hit the 2026-06-30 cohort.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('workspaceHealthCheck', () => {
  it('detects the ID-but-no-content divergence — the classic broken-cohort signature', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ cases: [{ caseId: 'case-A' }] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    vi.doMock('../caseRegistryStorage', () => ({
      isRegistryShadowHydrated: vi.fn(() => true),
      loadRegistryMapFromStorage: vi.fn(() => ({
        'case-A': { caseId: 'case-A', createdAt: '', lastOpened: '' },
        'case-B': { caseId: 'case-B', createdAt: '', lastOpened: '' },
        'case-C': { caseId: 'case-C', createdAt: '', lastOpened: '' },
      })),
    }))

    vi.doMock('../cryptoVault', () => ({
      getOrCreateDeviceId: vi.fn(() => 'device-1'),
      getWorkspaceVaultBlob: vi.fn(async (caseId: string) =>
        caseId === 'case-A' ? { ciphertext: 'x', iv: 'i', wrappedKey: 'w', version: 1 } : null,
      ),
    }))

    vi.doMock('../notionDocumentActions', () => ({
      hasAnyLocalNotionSnapshot: vi.fn(() => false),
    }))

    vi.doMock('../../services/authHeaders', () => ({
      getAuthHeaders: vi.fn(async () => ({})),
    }))

    const { evaluateWorkspaceHealth, hasIdWithoutContentDivergence } = await import(
      '../workspaceHealthCheck'
    )

    const snapshot = await evaluateWorkspaceHealth('DE')

    expect(snapshot.registryCases).toBe(3)
    expect(snapshot.serverContentCases).toBe(1)
    expect(snapshot.localContentCases).toBe(1)
    expect(snapshot.missingOnServer.sort()).toEqual(['case-B', 'case-C'])
    expect(hasIdWithoutContentDivergence(snapshot)).toBe(true)
  })

  it('reports no divergence when every registry case has server content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ cases: [{ caseId: 'case-A' }, { caseId: 'case-B' }] }),
          { status: 200 },
        ),
      ),
    )

    vi.doMock('../caseRegistryStorage', () => ({
      isRegistryShadowHydrated: vi.fn(() => true),
      loadRegistryMapFromStorage: vi.fn(() => ({
        'case-A': { caseId: 'case-A', createdAt: '', lastOpened: '' },
        'case-B': { caseId: 'case-B', createdAt: '', lastOpened: '' },
      })),
    }))
    vi.doMock('../cryptoVault', () => ({
      getOrCreateDeviceId: vi.fn(() => 'device-1'),
      getWorkspaceVaultBlob: vi.fn(async () => null),
    }))
    vi.doMock('../notionDocumentActions', () => ({
      hasAnyLocalNotionSnapshot: vi.fn(() => false),
    }))
    vi.doMock('../../services/authHeaders', () => ({
      getAuthHeaders: vi.fn(async () => ({})),
    }))

    const { evaluateWorkspaceHealth, hasIdWithoutContentDivergence } = await import(
      '../workspaceHealthCheck'
    )

    const snapshot = await evaluateWorkspaceHealth('DE')

    expect(snapshot.missingOnServer).toEqual([])
    expect(hasIdWithoutContentDivergence(snapshot)).toBe(false)
  })

  it('returns an empty snapshot when the privacy tier blocks the cases endpoint (HTTP 403) — no false positive banner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('forbidden', { status: 403 })),
    )

    vi.doMock('../caseRegistryStorage', () => ({
      isRegistryShadowHydrated: vi.fn(() => true),
      loadRegistryMapFromStorage: vi.fn(() => ({
        'case-A': { caseId: 'case-A', createdAt: '', lastOpened: '' },
      })),
    }))
    vi.doMock('../cryptoVault', () => ({
      getOrCreateDeviceId: vi.fn(() => 'device-1'),
      getWorkspaceVaultBlob: vi.fn(async () => null),
    }))
    vi.doMock('../notionDocumentActions', () => ({
      hasAnyLocalNotionSnapshot: vi.fn(() => false),
    }))
    vi.doMock('../../services/authHeaders', () => ({
      getAuthHeaders: vi.fn(async () => ({})),
    }))

    const { evaluateWorkspaceHealth, hasIdWithoutContentDivergence } = await import(
      '../workspaceHealthCheck'
    )

    const snapshot = await evaluateWorkspaceHealth('DE')
    expect(snapshot.ok).toBe(false)
    expect(hasIdWithoutContentDivergence(snapshot)).toBe(false)
  })

  it('does NOT flag a case that has no server snapshot but DOES have local content — the reported false-positive', async () => {
    // Reproduces the "Inhalte fehlen auf diesem Konto" false positive: a case
    // created and fully saved on THIS device, whose vault blob simply hasn't
    // synced to the server yet (or never will, e.g. local-only privacy tier).
    // Local content exists only as a Notion document durability snapshot, not
    // the unified vault blob — the old code only checked the vault blob and
    // never cross-referenced `missingOnServer` against local presence at all.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ cases: [] }), { status: 200 })),
    )

    vi.doMock('../caseRegistryStorage', () => ({
      isRegistryShadowHydrated: vi.fn(() => true),
      loadRegistryMapFromStorage: vi.fn(() => ({
        'case-A': { caseId: 'case-A', createdAt: '', lastOpened: '' },
      })),
    }))
    vi.doMock('../cryptoVault', () => ({
      getOrCreateDeviceId: vi.fn(() => 'device-1'),
      getWorkspaceVaultBlob: vi.fn(async () => null),
    }))
    vi.doMock('../notionDocumentActions', () => ({
      hasAnyLocalNotionSnapshot: vi.fn((caseId: string) => caseId === 'case-A'),
    }))
    vi.doMock('../../services/authHeaders', () => ({
      getAuthHeaders: vi.fn(async () => ({})),
    }))

    const { evaluateWorkspaceHealth, hasIdWithoutContentDivergence } = await import(
      '../workspaceHealthCheck'
    )

    const snapshot = await evaluateWorkspaceHealth('DE')

    expect(snapshot.localContentCases).toBe(1)
    expect(snapshot.missingOnServer).toEqual([])
    expect(hasIdWithoutContentDivergence(snapshot)).toBe(false)
  })

  it('returns an empty snapshot when the registry shadow has not hydrated yet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ cases: [] }), { status: 200 })),
    )

    vi.doMock('../caseRegistryStorage', () => ({
      isRegistryShadowHydrated: vi.fn(() => false),
      loadRegistryMapFromStorage: vi.fn(() => ({
        'case-A': { caseId: 'case-A', createdAt: '', lastOpened: '' },
      })),
    }))
    vi.doMock('../cryptoVault', () => ({
      getOrCreateDeviceId: vi.fn(() => 'device-1'),
      getWorkspaceVaultBlob: vi.fn(async () => null),
    }))
    vi.doMock('../notionDocumentActions', () => ({
      hasAnyLocalNotionSnapshot: vi.fn(() => false),
    }))
    vi.doMock('../../services/authHeaders', () => ({
      getAuthHeaders: vi.fn(async () => ({})),
    }))

    const { evaluateWorkspaceHealth, hasIdWithoutContentDivergence } = await import(
      '../workspaceHealthCheck'
    )

    const snapshot = await evaluateWorkspaceHealth('DE')
    expect(snapshot.ok).toBe(false)
    expect(hasIdWithoutContentDivergence(snapshot)).toBe(false)
  })
})
