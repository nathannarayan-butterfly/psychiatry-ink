import { describe, expect, it } from 'vitest'
import {
  DELETE_CONFIRMATION_TOKEN,
  isBlockingMembership,
  isDeleteConfirmed,
} from './accountLifecyclePolicy'

/**
 * Pure policy tests for the account lifecycle: the org-ownership BLOCK decision
 * (APPROVED DECISION #1) and the server-side delete-confirmation rule.
 */

describe('isBlockingMembership — org-ownership BLOCK decision', () => {
  it('never blocks on the personal organisation, whatever the role', () => {
    expect(
      isBlockingMembership({ role: 'org_owner', isPersonal: true, otherActiveAdminCount: 0 }),
    ).toBe(false)
    expect(
      isBlockingMembership({ role: 'single_owner', isPersonal: true, otherActiveAdminCount: 0 }),
    ).toBe(false)
  })

  it('blocks an org owner of a non-personal org even with other admins present', () => {
    expect(
      isBlockingMembership({ role: 'org_owner', isPersonal: false, otherActiveAdminCount: 5 }),
    ).toBe(true)
  })

  it('blocks the LAST admin of a non-personal org', () => {
    expect(
      isBlockingMembership({ role: 'org_admin', isPersonal: false, otherActiveAdminCount: 0 }),
    ).toBe(true)
    expect(
      isBlockingMembership({ role: 'site_admin', isPersonal: false, otherActiveAdminCount: 0 }),
    ).toBe(true)
  })

  it('does NOT block an admin when other active admins remain', () => {
    expect(
      isBlockingMembership({ role: 'org_admin', isPersonal: false, otherActiveAdminCount: 2 }),
    ).toBe(false)
  })

  it('does NOT block non-admin roles', () => {
    expect(
      isBlockingMembership({ role: 'clinician', isPersonal: false, otherActiveAdminCount: 0 }),
    ).toBe(false)
    expect(
      isBlockingMembership({ role: 'viewer', isPersonal: false, otherActiveAdminCount: 0 }),
    ).toBe(false)
  })
})

describe('isDeleteConfirmed — server-side confirmation re-check', () => {
  it('accepts the exact literal token (and surrounding whitespace)', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true)
    expect(isDeleteConfirmed('  DELETE  ')).toBe(true)
    expect(DELETE_CONFIRMATION_TOKEN).toBe('DELETE')
  })

  it('rejects translations, casing changes, and non-strings', () => {
    expect(isDeleteConfirmed('delete')).toBe(false)
    expect(isDeleteConfirmed('LÖSCHEN')).toBe(false)
    expect(isDeleteConfirmed('DELET')).toBe(false)
    expect(isDeleteConfirmed('')).toBe(false)
    expect(isDeleteConfirmed(undefined)).toBe(false)
    expect(isDeleteConfirmed(null)).toBe(false)
    expect(isDeleteConfirmed(123)).toBe(false)
  })
})
