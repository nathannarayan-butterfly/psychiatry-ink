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
      loadRegistryMapFromStorage: vi.fn(() => ({
        'case-A': { caseId: 'case-A', createdAt: '', lastOpened: '' },
        'case-B': { caseId: 'case-B', createdAt: '', lastOpened: '' },
      })),
    }))
    vi.doMock('../cryptoVault', () => ({
      getOrCreateDeviceId: vi.fn(() => 'device-1'),
      getWorkspaceVaultBlob: vi.fn(async () => null),
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
      loadRegistryMapFromStorage: vi.fn(() => ({
        'case-A': { caseId: 'case-A', createdAt: '', lastOpened: '' },
      })),
    }))
    vi.doMock('../cryptoVault', () => ({
      getOrCreateDeviceId: vi.fn(() => 'device-1'),
      getWorkspaceVaultBlob: vi.fn(async () => null),
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
