// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { derivePublicJwkFromPrivate } from '../cryptoVault'

const subtle = crypto.subtle

async function generatePair() {
  return subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  )
}

describe('derivePublicJwkFromPrivate', () => {
  it('throws when the private JWK lacks RSA public components', () => {
    expect(() => derivePublicJwkFromPrivate({ kty: 'RSA' })).toThrow()
  })

  it('reconstructs a public key that matches the restored private key', async () => {
    // Simulates the passphrase-restore path: only the private JWK is recovered
    // from the backup, and the matching public key must be derived from it so the
    // pair stays consistent (otherwise new ciphertext on the device is unreadable).
    const pair = await generatePair()
    const privateKeyJwk = await subtle.exportKey('jwk', pair.privateKey)

    const publicKeyJwk = derivePublicJwkFromPrivate(privateKeyJwk)

    const publicKey = await subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt', 'wrapKey'],
    )
    const privateKey = await subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt', 'unwrapKey'],
    )

    const aesKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ])
    const wrapped = await subtle.wrapKey('raw', aesKey, publicKey, { name: 'RSA-OAEP' })
    const unwrapped = await subtle.unwrapKey(
      'raw',
      wrapped,
      privateKey,
      { name: 'RSA-OAEP' },
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt'],
    )

    const original = new Uint8Array(await subtle.exportKey('raw', aesKey))
    const roundTripped = new Uint8Array(await subtle.exportKey('raw', unwrapped))
    expect(Array.from(roundTripped)).toEqual(Array.from(original))
  })
})
