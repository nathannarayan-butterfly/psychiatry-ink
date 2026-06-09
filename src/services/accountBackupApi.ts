import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { PassphraseEncryptedBlob } from '../utils/accountBackupCrypto'
import type { PassphraseKeyBackup } from '../utils/passphraseRecovery'

export interface AccountBackupStatus {
  hasKeyBackup: boolean
  hasRegistryBackup: boolean
  keyUpdatedAt: string | null
  registryUpdatedAt: string | null
}

async function authJsonHeaders(): Promise<HeadersInit> {
  return {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }
}

export async function fetchAccountBackupStatus(): Promise<AccountBackupStatus | null> {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) return null

  const response = await fetch(`${API_BASE}/api/account-backup/status`, { headers })
  if (!response.ok) return null
  return (await response.json()) as AccountBackupStatus
}

export async function fetchKeyBackupFromServer(): Promise<PassphraseKeyBackup | null> {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) return null

  const response = await fetch(`${API_BASE}/api/account-backup/key`, { headers })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to load key backup (${response.status})`)

  const data = (await response.json()) as PassphraseKeyBackup
  return data
}

export async function uploadKeyBackupToServer(backup: PassphraseKeyBackup): Promise<void> {
  const headers = await authJsonHeaders()
  if (!('Authorization' in headers)) throw new Error('Authentication required')

  const response = await fetch(`${API_BASE}/api/account-backup/key`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      salt: backup.salt,
      iv: backup.iv,
      ciphertext: backup.ciphertext,
      iterations: backup.iterations,
      version: backup.version,
    }),
  })

  if (!response.ok) throw new Error(`Failed to save key backup (${response.status})`)
}

export async function fetchRegistryBackupFromServer(): Promise<PassphraseEncryptedBlob | null> {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) return null

  const response = await fetch(`${API_BASE}/api/account-backup/registry`, { headers })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to load registry backup (${response.status})`)

  const data = (await response.json()) as PassphraseEncryptedBlob
  return {
    version: data.version ?? 1,
    salt: data.salt,
    iv: data.iv,
    ciphertext: data.ciphertext,
    iterations: data.iterations ?? 310_000,
  }
}

export async function deleteRegistryBackupFromServer(): Promise<void> {
  const headers = await getAuthHeaders()
  if (!('Authorization' in headers)) return

  const response = await fetch(`${API_BASE}/api/account-backup/registry`, {
    method: 'DELETE',
    headers,
  })
  if (response.status === 401) return
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete registry backup (${response.status})`)
  }
}

export async function uploadRegistryBackupToServer(blob: PassphraseEncryptedBlob): Promise<void> {
  const headers = await authJsonHeaders()
  if (!('Authorization' in headers)) throw new Error('Authentication required')

  const response = await fetch(`${API_BASE}/api/account-backup/registry`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      salt: blob.salt,
      iv: blob.iv,
      ciphertext: blob.ciphertext,
      version: blob.version,
    }),
  })

  if (!response.ok) throw new Error(`Failed to save registry backup (${response.status})`)
}
