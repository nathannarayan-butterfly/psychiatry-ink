/**
 * Pure policy helpers for the account lifecycle (no I/O — unit-testable).
 *
 * Keeps the org-ownership BLOCK decision and the delete-confirmation rule free
 * of Supabase/Stripe imports so they can be exercised in isolation.
 */

/** Org roles that confer ownership of an organisation. */
export const OWNER_ROLES: readonly string[] = ['org_owner']

/** Org roles with administrative control (owner is also an admin). */
export const ADMIN_ROLES: readonly string[] = ['org_owner', 'org_admin', 'site_admin']

/** The literal token a user must type to confirm an irreversible delete. */
export const DELETE_CONFIRMATION_TOKEN = 'DELETE'

export interface MembershipForBlock {
  /** The member's role in the organisation. */
  role: string
  /** Whether the organisation is the user's auto-provisioned personal org. */
  isPersonal: boolean
  /** Count of OTHER active admins (owner/admin/site_admin) in the same org. */
  otherActiveAdminCount: number
}

/**
 * True when deleting/unsubscribing this user would orphan the organisation:
 * personal orgs never block; otherwise an owner always blocks, and a non-owner
 * admin blocks only when they are the last remaining active admin.
 */
export function isBlockingMembership(m: MembershipForBlock): boolean {
  if (m.isPersonal) return false
  if (OWNER_ROLES.includes(m.role)) return true
  if (ADMIN_ROLES.includes(m.role)) return m.otherActiveAdminCount === 0
  return false
}

/**
 * Server-side re-verification of the typed delete confirmation. The literal
 * token is never translated; surrounding whitespace is tolerated but the value
 * must otherwise equal {@link DELETE_CONFIRMATION_TOKEN} exactly.
 */
export function isDeleteConfirmed(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === DELETE_CONFIRMATION_TOKEN
}
