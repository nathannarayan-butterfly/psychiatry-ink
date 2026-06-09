export const MIN_PASSPHRASE_LENGTH = 12
export const MAX_PASSPHRASE_LENGTH = 256

export function isPassphraseBlank(passphrase: string): boolean {
  return !passphrase.trim()
}

export function isPassphraseTooShortForSetup(passphrase: string): boolean {
  return passphrase.length < MIN_PASSPHRASE_LENGTH
}

export function isPassphraseTooLong(passphrase: string): boolean {
  return passphrase.length > MAX_PASSPHRASE_LENGTH
}

/** Validates passphrase for new backup setup — not used on restore. */
export function assertPassphraseValidForSetup(passphrase: string): void {
  if (isPassphraseBlank(passphrase)) throw new Error('Passphrase required')
  if (isPassphraseTooShortForSetup(passphrase)) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`)
  }
  if (isPassphraseTooLong(passphrase)) {
    throw new Error(`Passphrase must be at most ${MAX_PASSPHRASE_LENGTH} characters`)
  }
}
