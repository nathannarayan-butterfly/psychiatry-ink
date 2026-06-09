/**
 * In-memory passphrase session — cleared on page unload.
 * Used to re-upload encrypted registry backups and sync clinical ciphertext.
 */

let unlockedPassphrase: string | null = null

export function setAccountBackupUnlocked(passphrase: string): void {
  unlockedPassphrase = passphrase.trim() || null
}

export function getAccountBackupPassphrase(): string | null {
  return unlockedPassphrase
}

export function isAccountBackupUnlocked(): boolean {
  return Boolean(unlockedPassphrase)
}

export function clearAccountBackupUnlock(): void {
  unlockedPassphrase = null
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    unlockedPassphrase = null
  })
}
