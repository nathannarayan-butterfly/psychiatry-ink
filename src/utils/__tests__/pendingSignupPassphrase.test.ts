// @vitest-environment jsdom
//
// The email-confirmation signup path cannot run setupAccountCloudBackup
// immediately (no session yet), so the chosen passphrase is parked in
// localStorage and consumed on the first authenticated session. These tests
// pin that persistence contract.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearPendingSignupPassphrase,
  getPendingSignupPassphrase,
  markPendingSignupPassphrase,
} from '../pendingSignupPassphrase'

describe('pendingSignupPassphrase — survives the email-confirmation gap', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('persists and reads back the chosen passphrase', () => {
    markPendingSignupPassphrase('correct horse battery staple')
    expect(getPendingSignupPassphrase()).toBe('correct horse battery staple')
  })

  it('returns null when nothing was stored', () => {
    expect(getPendingSignupPassphrase()).toBeNull()
  })

  it('treats a blank/whitespace value as absent', () => {
    markPendingSignupPassphrase('   ')
    expect(getPendingSignupPassphrase()).toBeNull()
  })

  it('clears the pending passphrase once consumed (not left behind)', () => {
    markPendingSignupPassphrase('correct horse battery staple')
    clearPendingSignupPassphrase()
    expect(getPendingSignupPassphrase()).toBeNull()
    // Belt-and-braces: the raw key must be gone from storage too.
    expect(window.localStorage.getItem('psyink.pendingSignupPassphrase')).toBeNull()
  })
})
