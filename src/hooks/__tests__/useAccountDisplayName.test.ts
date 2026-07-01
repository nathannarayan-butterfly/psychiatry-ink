import { describe, expect, it } from 'vitest'
import { resolveAccountDisplayName } from '../useAccountDisplayName'

describe('resolveAccountDisplayName', () => {
  it('prefers the device-local profile name', () => {
    expect(resolveAccountDisplayName({ name: 'Nathan' }, 'Dr. —')).toBe('Nathan')
  })

  it('falls back to Supabase auth metadata when no local name is stored', () => {
    // This is the cross-device case: the name was saved on another device (or
    // this device's localStorage was cleared) but the account already has it
    // mirrored to Supabase auth metadata — the greeting must not regress to
    // the placeholder just because this browser never wrote it locally.
    expect(resolveAccountDisplayName({}, 'Dr. —', { full_name: 'Nathan' })).toBe('Nathan')
  })

  it('prefers auth metadata over an email stub', () => {
    expect(
      resolveAccountDisplayName({ email: 'nathan@example.com' }, 'Dr. —', { name: 'Nathan' }),
    ).toBe('Nathan')
  })

  it('falls back to the email stub when neither local name nor metadata is present', () => {
    expect(resolveAccountDisplayName({ email: 'nathan@example.com' }, 'Dr. —')).toBe('nathan')
  })

  it('falls back to the placeholder label when nothing is available', () => {
    expect(resolveAccountDisplayName({}, 'Dr. —')).toBe('Dr. —')
  })

  it('ignores the stored placeholder name value itself', () => {
    expect(resolveAccountDisplayName({ name: 'Dr. —' }, 'Dr. —', { full_name: 'Nathan' })).toBe(
      'Nathan',
    )
  })
})
