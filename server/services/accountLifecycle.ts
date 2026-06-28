/**
 * Account unsubscribe + delete lifecycle orchestration.
 *
 * Ties together the Stripe cancellation calls, the Supabase lifecycle RPCs
 * (via `creditsRepo`) and the worker-side hard purge. The state machine itself
 * lives in SQL (`20260708000000_account_lifecycle.sql`); this module enforces
 * the product policy around it:
 *
 *   * APPROVED DECISION #1 — org ownership = BLOCK. A user who owns (or is the
 *     last admin of) a NON-personal organisation cannot unsubscribe or delete;
 *     they must transfer ownership / remove the org first. Every user owns their
 *     auto-provisioned PERSONAL org, which never blocks.
 *   * APPROVED DECISION #2 — delete cancels Stripe immediately, no refund.
 *
 * The personal purge scopes to `organisation_id is null` rows only and never
 * cascade-deletes org or org-shared data.
 */

import type { AiCreditAccount } from '../data/credits'
import { creditsRepo } from '../data/credits'
import { getSupabaseAdmin } from './supabaseAdmin'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'
import { isOrgStoreConfigured } from './orgStore'
import { DC_VOICE_BUCKET } from './discussCaseVoiceStorage'
import {
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  deleteStripeCustomer,
  isStripeCreditsConfigured,
} from './stripeCredits'
import { ADMIN_ROLES, OWNER_ROLES, isBlockingMembership } from './accountLifecyclePolicy'

/** Default lifecycle windows (overridable via env for testing / policy tweaks). */
export const DORMANT_DAYS = Number(process.env.ACCOUNT_DORMANT_DAYS ?? 90)
export const DELETE_GRACE_DAYS = Number(process.env.ACCOUNT_DELETE_GRACE_DAYS ?? 30)

export type AccountLifecycleState = 'active' | 'dormant' | 'delete_pending'

export interface LifecycleStatus {
  accountStatus: AccountLifecycleState | null
  dormantAt: string | null
  deleteRequestedAt: string | null
  purgeAfter: string | null
  purgedAt: string | null
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  dormantDays: number
  deleteGraceDays: number
}

export type LifecycleActionResult =
  | { ok: true; status: LifecycleStatus }
  | { ok: false; code: 'org_block'; organisations: string[] }

function toStatus(account: AiCreditAccount | null): LifecycleStatus {
  return {
    accountStatus: (account?.account_status as AccountLifecycleState | null) ?? null,
    dormantAt: account?.dormant_at ?? null,
    deleteRequestedAt: account?.delete_requested_at ?? null,
    purgeAfter: account?.purge_after ?? null,
    purgedAt: account?.purged_at ?? null,
    subscriptionStatus: account?.subscription_status ?? null,
    cancelAtPeriodEnd: account?.subscription_cancel_at_period_end ?? false,
    currentPeriodEnd: account?.subscription_current_period_end ?? null,
    dormantDays: DORMANT_DAYS,
    deleteGraceDays: DELETE_GRACE_DAYS,
  }
}

/** Current lifecycle + subscription state for the settings UI / banner. */
export async function getLifecycleStatus(userId: string): Promise<LifecycleStatus> {
  const account = await creditsRepo.getAccountByUserId(userId)
  return toStatus(account)
}

interface BlockingOrg {
  id: string
  name: string
}

/**
 * Returns the NON-personal organisations whose deletion the user would orphan:
 * either they are the `org_owner`, or they are an admin with no other active
 * admin remaining (the last admin). Empty when nothing blocks. When no org store
 * is configured the check is a no-op (pure local/dev), returning empty.
 */
export async function findBlockingOrganisations(userId: string): Promise<BlockingOrg[]> {
  if (!isOrgStoreConfigured()) return []

  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_members')
    .select('organisation_id, role, org_organisations!inner(id, name, is_personal)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ADMIN_ROLES as string[])

  if (error) throw new Error(`org membership lookup failed: ${error.message}`)

  const blocking: BlockingOrg[] = []
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    // The to-one embed may surface as an object or a single-element array.
    const embed = row.org_organisations
    const org = (Array.isArray(embed) ? embed[0] : embed) as
      | { id: string; name: string; is_personal: boolean }
      | undefined
    if (!org) continue

    const role = String(row.role)

    // Only count other admins when the cheap owner check hasn't already decided.
    let otherActiveAdminCount = Number.MAX_SAFE_INTEGER
    if (!org.is_personal && !OWNER_ROLES.includes(role)) {
      const { count, error: countError } = await admin
        .from('org_members')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', String(row.organisation_id))
        .eq('status', 'active')
        .in('role', ADMIN_ROLES as string[])
        .neq('user_id', userId)
      if (countError) throw new Error(`org admin count failed: ${countError.message}`)
      otherActiveAdminCount = count ?? 0
    }

    if (isBlockingMembership({ role, isPersonal: org.is_personal, otherActiveAdminCount })) {
      blocking.push({ id: org.id, name: org.name })
    }
  }

  return blocking
}

/**
 * Unsubscribe → dormant. Cancels the Stripe subscription at period end (the user
 * keeps paid access), then begins dormancy with the 90-day deletion clock.
 * BLOCKED when the user owns / is the last admin of a non-personal org.
 */
export async function unsubscribe(userId: string): Promise<LifecycleActionResult> {
  const blocking = await findBlockingOrganisations(userId)
  if (blocking.length > 0) {
    return { ok: false, code: 'org_block', organisations: blocking.map((o) => o.name) }
  }

  if (isStripeCreditsConfigured()) {
    await cancelSubscriptionAtPeriodEnd(userId)
  }
  const account = await creditsRepo.beginUnsubscribe(userId, DORMANT_DAYS)
  return { ok: true, status: toStatus(account) }
}

/** Reactivate a dormant account (clears the deletion clock). */
export async function reactivate(userId: string): Promise<LifecycleStatus> {
  const account = await creditsRepo.reactivateAccount(userId)
  return toStatus(account)
}

/**
 * Request deletion → delete_pending with the 30-day grace clock. Cancels Stripe
 * IMMEDIATELY (no refund). BLOCKED on org ownership exactly like unsubscribe.
 */
export async function requestDelete(userId: string): Promise<LifecycleActionResult> {
  const blocking = await findBlockingOrganisations(userId)
  if (blocking.length > 0) {
    return { ok: false, code: 'org_block', organisations: blocking.map((o) => o.name) }
  }

  if (isStripeCreditsConfigured()) {
    await cancelSubscriptionImmediately(userId)
  }
  const account = await creditsRepo.requestDelete(userId, DELETE_GRACE_DAYS)
  return { ok: true, status: toStatus(account) }
}

/** Cancel a pending deletion within the grace window. */
export async function cancelDelete(userId: string): Promise<LifecycleStatus> {
  const account = await creditsRepo.cancelDelete(userId)
  return toStatus(account)
}

/**
 * Collect every DiscussCase voice-message Storage path tied to the user — both
 * messages they authored and all messages inside the discussions they own — so
 * the worker can delete the binaries BEFORE the rows are purged.
 */
async function collectUserVoiceStoragePaths(userId: string): Promise<string[]> {
  const db = getSupabaseAdmin()
  const paths = new Set<string>()

  const pushFrom = (rows: Array<{ voice_attachment: unknown }> | null) => {
    for (const row of rows ?? []) {
      const att = row.voice_attachment as { storagePath?: unknown } | null
      if (att && typeof att.storagePath === 'string' && att.storagePath) paths.add(att.storagePath)
    }
  }

  // Messages the user authored anywhere.
  const authored = await db
    .from('dc_messages')
    .select('voice_attachment')
    .eq('author_user_id', userId)
    .not('voice_attachment', 'is', null)
  if (!authored.error) pushFrom(authored.data as Array<{ voice_attachment: unknown }> | null)

  // All messages inside discussions the user owns.
  const owned = await db.from('dc_discussions').select('id').eq('owner_user_id', userId)
  const ownedIds = ((owned.data ?? []) as Array<{ id: string }>).map((d) => d.id)
  if (ownedIds.length > 0) {
    const inOwned = await db
      .from('dc_messages')
      .select('voice_attachment')
      .in('discussion_id', ownedIds)
      .not('voice_attachment', 'is', null)
    if (!inOwned.error) pushFrom(inOwned.data as Array<{ voice_attachment: unknown }> | null)
  }

  return [...paths]
}

/** Delete the user's DiscussCase voice binaries (best-effort, pre-row-purge). */
async function deleteUserVoiceFiles(userId: string): Promise<void> {
  const paths = await collectUserVoiceStoragePaths(userId)
  if (paths.length === 0) return
  const storage = getKbSupabaseAdmin().storage.from(DC_VOICE_BUCKET)
  // Remove in bounded batches to avoid oversized requests.
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100)
    const { error } = await storage.remove(batch)
    if (error) throw new Error(`voice storage delete failed: ${error.message}`)
  }
}

/** Delete the Supabase auth user (cascades user_legal_acceptances). Idempotent. */
async function deleteAuthUser(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId)
  if (error) {
    const status = (error as { status?: number }).status
    // 404 → already deleted (idempotent retry). Anything else is a real failure.
    if (status === 404) return
    throw new Error(`auth.admin.deleteUser failed: ${error.message}`)
  }
}

export interface PurgeSweepResult {
  claimed: number
  purged: number
  failed: number
  failedUserIds: string[]
}

/**
 * Run the due-purge sweep: claim due rows, then for each user perform the
 * external deletes (Storage → Stripe cancel + customer delete → auth user) and
 * finally the SQL purge + tombstone. On any per-user failure the claim is
 * released so the next sweep retries; the whole sweep is idempotent.
 */
export async function runDuePurges(limit = 100): Promise<PurgeSweepResult> {
  const claimedUserIds = await creditsRepo.claimDuePurges(limit)
  const result: PurgeSweepResult = {
    claimed: claimedUserIds.length,
    purged: 0,
    failed: 0,
    failedUserIds: [],
  }

  for (const userId of claimedUserIds) {
    try {
      // 1. Storage binaries (DiscussCase voice messages).
      await deleteUserVoiceFiles(userId)

      // 2. Stripe: cancel immediately (idempotent) + delete the customer.
      if (isStripeCreditsConfigured()) {
        await cancelSubscriptionImmediately(userId)
        await deleteStripeCustomer(userId)
      }

      // 3. Supabase auth user (cascades legal acceptances).
      await deleteAuthUser(userId)

      // 4. FK-safe SQL purge of all personal rows + tombstone the account.
      await creditsRepo.purgeData(userId)

      result.purged += 1
    } catch (error) {
      console.error(`[account-lifecycle] purge failed for ${userId}:`, error)
      result.failed += 1
      result.failedUserIds.push(userId)
      // Release the latch so the next sweep retries this user.
      await creditsRepo.releasePurge(userId).catch((releaseError) => {
        console.error(`[account-lifecycle] releasePurge failed for ${userId}:`, releaseError)
      })
    }
  }

  return result
}
