import { prisma } from '../db'
import { MONTHLY_CREDIT_GRANT } from '../ai/aiPricingConfig'

const LEGACY_ACCOUNT_ID = 'default'
const LEGACY_MIGRATION_NOTE = 'legacy_credit_balance_migration'

function nextMonthlyReset(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

export function accountIdFromUserId(userId: string | undefined): string {
  return userId?.trim() || LEGACY_ACCOUNT_ID
}

/** One-time transfer of legacy CreditBalance into AiCreditAccount. */
export async function migrateLegacyCreditsIfNeeded(userId: string): Promise<void> {
  if (!userId || userId === LEGACY_ACCOUNT_ID) return

  const legacyId = accountIdFromUserId(userId)
  const legacy = await prisma.creditBalance.findUnique({ where: { id: legacyId } })
  if (!legacy || legacy.balance <= 0) return

  let account = await prisma.aiCreditAccount.findUnique({ where: { userId } })
  if (!account) {
    account = await prisma.aiCreditAccount.create({
      data: {
        userId,
        monthlyCredits: MONTHLY_CREDIT_GRANT,
        purchasedCredits: 0,
        monthlyResetAt: nextMonthlyReset(),
      },
    })
  }

  const existing = await prisma.aiCreditLedger.findFirst({
    where: {
      accountId: account.id,
      type: 'admin_adjustment',
      note: LEGACY_MIGRATION_NOTE,
    },
  })
  if (existing) return

  await prisma.$transaction(async (tx) => {
    await tx.aiCreditAccount.update({
      where: { id: account!.id },
      data: { purchasedCredits: { increment: legacy.balance } },
    })

    await tx.aiCreditLedger.create({
      data: {
        accountId: account!.id,
        type: 'admin_adjustment',
        credits: legacy.balance,
        featureKey: null,
        usageLogId: null,
        note: LEGACY_MIGRATION_NOTE,
      },
    })

    await tx.creditBalance.update({
      where: { id: legacyId },
      data: { balance: 0 },
    })
  })
}
