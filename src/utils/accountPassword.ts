// Account *login* password change flow. This is deliberately independent of the
// encryption passphrase / key-backup material (see passphrasePolicy.ts): the
// Supabase auth password gates sign-in, while the passphrase derives the local
// vault key. Changing one must never touch the other.

/** Mirrors the signup password rule (`password.length < 8`). */
export const ACCOUNT_PASSWORD_MIN_LENGTH = 8

export type ChangePasswordValidationError = 'currentRequired' | 'tooShort' | 'mismatch'

export function validatePasswordChange(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): ChangePasswordValidationError | null {
  if (!input.currentPassword) return 'currentRequired'
  if (input.newPassword.length < ACCOUNT_PASSWORD_MIN_LENGTH) return 'tooShort'
  if (input.newPassword !== input.confirmPassword) return 'mismatch'
  return null
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; kind: 'validation'; error: ChangePasswordValidationError }
  | { ok: false; kind: 'reauth' }
  | { ok: false; kind: 'update'; message: string | null }

interface ChangeAccountPasswordParams {
  email: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  /** Re-verify the current password (e.g. Supabase signInWithPassword). */
  reauthenticate: (email: string, password: string) => Promise<{ error: string | null }>
  /** Persist the new password (e.g. supabase.auth.updateUser). */
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

/**
 * Orchestrates a password change: validate → reauthenticate with the current
 * password → update to the new password. Pure with respect to its injected
 * `reauthenticate`/`updatePassword` callbacks so it can be unit-tested.
 */
export async function changeAccountPassword(
  params: ChangeAccountPasswordParams,
): Promise<ChangePasswordResult> {
  const { email, currentPassword, newPassword, confirmPassword } = params

  const validationError = validatePasswordChange({
    currentPassword,
    newPassword,
    confirmPassword,
  })
  if (validationError) return { ok: false, kind: 'validation', error: validationError }

  const reauth = await params.reauthenticate(email, currentPassword)
  if (reauth.error) return { ok: false, kind: 'reauth' }

  const update = await params.updatePassword(newPassword)
  if (update.error) return { ok: false, kind: 'update', message: update.error }

  return { ok: true }
}
