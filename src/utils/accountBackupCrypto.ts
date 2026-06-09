const PBKDF2_ITERATIONS = 310_000

export interface PassphraseEncryptedBlob {
  version: number
  salt: string
  iv: string
  ciphertext: string
  iterations: number
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function deriveAesKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJsonWithPassphrase(
  passphrase: string,
  payload: unknown,
): Promise<PassphraseEncryptedBlob> {
  if (!passphrase.trim()) throw new Error('Passphrase required')

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await deriveAesKeyFromPassphrase(passphrase, salt)
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)

  return {
    version: 1,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext),
    iterations: PBKDF2_ITERATIONS,
  }
}

export async function decryptJsonWithPassphrase<T>(
  passphrase: string,
  blob: PassphraseEncryptedBlob,
): Promise<T> {
  const salt = new Uint8Array(base64ToBuffer(blob.salt))
  const iv = new Uint8Array(base64ToBuffer(blob.iv))
  const aesKey = await deriveAesKeyFromPassphrase(passphrase, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    base64ToBuffer(blob.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
