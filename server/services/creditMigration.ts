import { MONTHLY_CREDIT_GRANT } from '../ai/aiPricingConfig'
import { creditsRepo } from '../data/credits'
import { creditBalancesRepo } from '../data/creditBalances'

const LEGACY_ACCOUNT_ID = 'default'
const LEGACY_MIGRATION_NOTE = 'legacy_credit_balance_migration'

function nextMonthlyReset(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

export function accountIdFromUserId(userId: string | undefined): string {
  return userId?.trim() || LEGACY_ACCOUNT_ID
}

/**
 * One-time transfer of a legacy `credit_balances` balance into the user's
 * `ai_credit_accounts` purchased bucket, recorded as an `admin_adjustment`
 * ledger row carrying {@link LEGACY_MIGRATION_NOTE}.
 *
 * Idempotency: the migration ledger row is the marker. Because the supabase-js
 * seam can't span the grant and the zero-out in a single client transaction, the
 * steps are ordered so a crash between them is safe — a retry detects the
 * existing marker and only zeroes the (already-migrated) legacy balance, never
 * re-granting. This matches the previous Prisma flow's at-most-once grant.
 */
export async function migrateLegacyCreditsIfNeeded(userId: string): Promise<void> {
  if (!userId || userId === LEGACY_ACCOUNT_ID) return

  const legacyId = accountIdFromUserId(userId)
  const legacy = await creditBalancesRepo.getCreditBalance(legacyId)
  if (!legacy || legacy.balance <= 0) return

  // Self-healing ensure (creates the 500-credit account on first read).
  const account = await creditsRepo.ensureAccount(
    userId,
    MONTHLY_CREDIT_GRANT,
    nextMonthlyReset().toISOString(),
  )

  const alreadyMigrated = await creditsRepo.hasLedgerEntryWithNote(
    account.id,
    'admin_adjustment',
    LEGACY_MIGRATION_NOTE,
  )
  if (alreadyMigrated) {
    // Grant already happened in a prior (possibly interrupted) run — just make
    // sure the legacy balance is zeroed so we never re-enter this path.
    await creditBalancesRepo.setCreditBalance(legacyId, 0)
    return
  }

  // Grant first (idempotency marker), then zero the legacy balance. If the
  // process dies between these, the marker above short-circuits the retry.
  await creditsRepo.grantPurchased(account.id, legacy.balance, {
    note: LEGACY_MIGRATION_NOTE,
  })
  await creditBalancesRepo.setCreditBalance(legacyId, 0)
}
