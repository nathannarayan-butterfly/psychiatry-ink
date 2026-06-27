// @vitest-environment jsdom
//
// The email-confirmation signup path cannot run setupAccountCloudBackup
// immediately (no session yet), so the chosen passphrase is parked in
// localStorage and consumed on the first authenticated session. These tests
// pin that persistence contract, the TTL/expiry behaviour, and the
// clear-on-consume / clear-on-failure guarantees that keep passphrase material
// from lingering.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PENDING_PASSPHRASE_TTL_MS,
  clearPendingSignupPassphrase,
  getPendingSignupPassphrase,
  markPendingSignupPassphrase,
} from '../pendingSignupPassphrase'

const STORAGE_KEY = 'psyink.pendingSignupPassphrase'
const PASSPHRASE = 'correct horse battery staple'

describe('pendingSignupPassphrase — survives the email-confirmation gap', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })

  it('persists and reads back the chosen passphrase within the TTL', () => {
    markPendingSignupPassphrase(PASSPHRASE)
    expect(getPendingSignupPassphrase()).toBe(PASSPHRASE)
  })

  it('returns null when nothing was stored', () => {
    expect(getPendingSignupPassphrase()).toBeNull()
  })

  it('does not store a blank/whitespace value', () => {
    markPendingSignupPassphrase('   ')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(getPendingSignupPassphrase()).toBeNull()
  })

  it('does not keep the passphrase as readable plaintext in storage', () => {
    markPendingSignupPassphrase(PASSPHRASE)
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(raw).not.toContain(PASSPHRASE)
    // It is a timestamped record, not a bare string.
    const parsed = JSON.parse(raw as string) as { v: string; t: number }
    expect(typeof parsed.t).toBe('number')
    expect(parsed.v).not.toContain(PASSPHRASE)
  })

  it('TTL not yet expired: value is returned (happy path)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    markPendingSignupPassphrase(PASSPHRASE)

    // Advance to just before the TTL boundary.
    vi.setSystemTime(Date.now() + PENDING_PASSPHRASE_TTL_MS - 1000)
    expect(getPendingSignupPassphrase()).toBe(PASSPHRASE)
    // Reading a still-valid value must not delete it.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
  })

  it('TTL expired: value is ignored AND deleted', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    markPendingSignupPassphrase(PASSPHRASE)

    vi.setSystemTime(Date.now() + PENDING_PASSPHRASE_TTL_MS + 1000)
    expect(getPendingSignupPassphrase()).toBeNull()
    // Expired records are purged so nothing lingers and it is never re-read.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('consume then clear: not reused on a subsequent session (clear-on-failure)', () => {
    // Mirrors the AuthContext consume path, which clears in a `finally` so a
    // failed setup never leaves the passphrase behind for a re-read next login.
    markPendingSignupPassphrase(PASSPHRASE)
    const consumed = getPendingSignupPassphrase()
    expect(consumed).toBe(PASSPHRASE)

    clearPendingSignupPassphrase()

    expect(getPendingSignupPassphrase()).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('drops a malformed record rather than returning garbage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nope: true }))
    expect(getPendingSignupPassphrase()).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('still reads a legacy bare-string value (in-flight signups across deploy)', () => {
    // Pre-TTL format: a plain passphrase string with no timestamp wrapper.
    window.localStorage.setItem(STORAGE_KEY, PASSPHRASE)
    expect(getPendingSignupPassphrase()).toBe(PASSPHRASE)
  })
})
