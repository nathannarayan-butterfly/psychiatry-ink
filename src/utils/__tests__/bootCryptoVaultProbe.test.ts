// @vitest-environment node
//
// Tests for the boot-time `openCryptoVaultDb()` probe. The probe MUST surface
// a 'failed' status when the opener throws so the React mount layer can
// render the full-screen banner (see RECOVERY_REPORT.md §3).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const openMock = vi.hoisted(() => vi.fn())

vi.mock('../cryptoVaultDb', () => ({
  CRYPTO_DB_NAME: 'psychiatry-ink-crypto',
  CRYPTO_DB_VERSION: 2,
  CRYPTO_KEYS_STORE: 'keys',
  CRYPTO_VAULT_STORE: 'vault',
  openCryptoVaultDb: openMock,
}))

beforeEach(async () => {
  vi.resetModules()
  openMock.mockReset()
  // Ensure indexedDB is defined so the probe doesn't take the no-IDB early-bail.
  ;(globalThis as { indexedDB?: unknown }).indexedDB = {} as unknown as IDBFactory
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('bootCryptoVaultProbe', () => {
  it('resolves to ok when openCryptoVaultDb succeeds', async () => {
    openMock.mockResolvedValueOnce({
      close: () => {},
    } as unknown as IDBDatabase)

    const { probeCryptoVault, resetCryptoVaultProbeForTesting } = await import(
      '../bootCryptoVaultProbe'
    )
    resetCryptoVaultProbeForTesting()
    const status = await probeCryptoVault()

    expect(status.state).toBe('ok')
    expect(openMock).toHaveBeenCalledTimes(1)
  })

  it("surfaces the failure as 'failed' when openCryptoVaultDb throws — drives the full-screen banner", async () => {
    openMock.mockRejectedValueOnce(new Error('Quota exceeded'))

    const { probeCryptoVault, resetCryptoVaultProbeForTesting } = await import(
      '../bootCryptoVaultProbe'
    )
    resetCryptoVaultProbeForTesting()
    const status = await probeCryptoVault()

    expect(status.state).toBe('failed')
    if (status.state === 'failed') {
      expect(status.message).toBe('Quota exceeded')
    }
  })

  it('notifies subscribers with the terminal failed status', async () => {
    openMock.mockRejectedValueOnce(new Error('Boom'))

    const {
      probeCryptoVault,
      resetCryptoVaultProbeForTesting,
      subscribeToCryptoVaultProbe,
    } = await import('../bootCryptoVaultProbe')
    resetCryptoVaultProbeForTesting()

    const received: string[] = []
    const unsubscribe = subscribeToCryptoVaultProbe((status) => {
      received.push(status.state)
    })

    await probeCryptoVault()
    unsubscribe()

    expect(received).toContain('failed')
  })
})
