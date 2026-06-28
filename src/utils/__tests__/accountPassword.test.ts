// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_PASSWORD_MIN_LENGTH,
  changeAccountPassword,
  validatePasswordChange,
} from '../accountPassword'

const VALID_NEW = 'n3wStrongPass'

describe('validatePasswordChange', () => {
  it('requires the current password', () => {
    expect(
      validatePasswordChange({
        currentPassword: '',
        newPassword: VALID_NEW,
        confirmPassword: VALID_NEW,
      }),
    ).toBe('currentRequired')
  })

  it('rejects a new password shorter than the minimum', () => {
    const short = 'a'.repeat(ACCOUNT_PASSWORD_MIN_LENGTH - 1)
    expect(
      validatePasswordChange({
        currentPassword: 'old-password',
        newPassword: short,
        confirmPassword: short,
      }),
    ).toBe('tooShort')
  })

  it('rejects a mismatched confirmation', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'old-password',
        newPassword: VALID_NEW,
        confirmPassword: `${VALID_NEW}x`,
      }),
    ).toBe('mismatch')
  })

  it('accepts a valid change', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'old-password',
        newPassword: VALID_NEW,
        confirmPassword: VALID_NEW,
      }),
    ).toBeNull()
  })
})

describe('changeAccountPassword', () => {
  const base = {
    email: 'doc@clinic.example',
    currentPassword: 'old-password',
    newPassword: VALID_NEW,
    confirmPassword: VALID_NEW,
  }

  it('reauthenticates then updates the password on success', async () => {
    const reauthenticate = vi.fn(async () => ({ error: null }))
    const updatePassword = vi.fn(async () => ({ error: null }))

    const result = await changeAccountPassword({ ...base, reauthenticate, updatePassword })

    expect(result).toEqual({ ok: true })
    expect(reauthenticate).toHaveBeenCalledWith(base.email, base.currentPassword)
    expect(updatePassword).toHaveBeenCalledWith(base.newPassword)
  })

  it('short-circuits on validation before any network call', async () => {
    const reauthenticate = vi.fn(async () => ({ error: null }))
    const updatePassword = vi.fn(async () => ({ error: null }))

    const result = await changeAccountPassword({
      ...base,
      confirmPassword: 'different',
      reauthenticate,
      updatePassword,
    })

    expect(result).toEqual({ ok: false, kind: 'validation', error: 'mismatch' })
    expect(reauthenticate).not.toHaveBeenCalled()
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('reports a reauth failure and never updates the password', async () => {
    const reauthenticate = vi.fn(async () => ({ error: 'Invalid login credentials' }))
    const updatePassword = vi.fn(async () => ({ error: null }))

    const result = await changeAccountPassword({ ...base, reauthenticate, updatePassword })

    expect(result).toEqual({ ok: false, kind: 'reauth' })
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('surfaces an update error message', async () => {
    const reauthenticate = vi.fn(async () => ({ error: null }))
    const updatePassword = vi.fn(async () => ({
      error: 'New password should be different from the old password.',
    }))

    const result = await changeAccountPassword({ ...base, reauthenticate, updatePassword })

    expect(result).toEqual({
      ok: false,
      kind: 'update',
      message: 'New password should be different from the old password.',
    })
  })
})
