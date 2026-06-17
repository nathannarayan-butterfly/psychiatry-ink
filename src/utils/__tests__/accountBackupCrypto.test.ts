// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  decryptJsonWithPassphrase,
  encryptJsonWithPassphrase,
  type PassphraseEncryptedBlob,
} from '../accountBackupCrypto'

describe('accountBackupCrypto', () => {
  it('round-trips a JSON payload with the correct passphrase', async () => {
    const payload = { name: 'vault', items: [1, 2, 3], nested: { ok: true } }
    const blob = await encryptJsonWithPassphrase('correct horse battery', payload)

    expect(blob.version).toBe(1)
    expect(blob.iterations).toBeGreaterThan(0)
    expect(typeof blob.salt).toBe('string')
    expect(typeof blob.iv).toBe('string')

    const decrypted = await decryptJsonWithPassphrase<typeof payload>(
      'correct horse battery',
      blob,
    )
    expect(decrypted).toEqual(payload)
  })

  it('fails to decrypt with the wrong passphrase', async () => {
    const blob = await encryptJsonWithPassphrase('right-pass', { secret: 42 })
    await expect(
      decryptJsonWithPassphrase('wrong-pass', blob),
    ).rejects.toBeDefined()
  })

  it('throws when encrypting with a blank passphrase', async () => {
    await expect(encryptJsonWithPassphrase('   ', { a: 1 })).rejects.toThrow()
  })

  it('falls back to the default iteration count when blob.iterations is missing', async () => {
    const payload = { value: 'backwards-compatible' }
    const blob = await encryptJsonWithPassphrase('pass', payload)

    // Simulate a legacy/corrupt blob whose iterations field is absent.
    const legacyBlob = { ...blob } as Partial<PassphraseEncryptedBlob>
    delete legacyBlob.iterations

    const decrypted = await decryptJsonWithPassphrase<typeof payload>(
      'pass',
      legacyBlob as PassphraseEncryptedBlob,
    )
    expect(decrypted).toEqual(payload)
  })
})
