/**
 * Grant purchased AI credits to a user (dev/support).
 *
 * Usage:
 *   npx tsx scripts/grant-ai-credits.ts <userId> [credits]
 *
 * Example:
 *   npx tsx scripts/grant-ai-credits.ts 8b3f... 500
 */

import '../server/loadEnv'
import { addPurchasedCredits, getCreditSummary } from '../server/ai/creditGuard'

async function main() {
  const userId = process.argv[2]?.trim()
  const credits = Number(process.argv[3] ?? 500)

  if (!userId) {
    console.error('Usage: npx tsx scripts/grant-ai-credits.ts <userId> [credits]')
    process.exit(1)
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    console.error('Credits must be a positive number')
    process.exit(1)
  }

  const result = await addPurchasedCredits({
    userId,
    credits,
    note: 'script:grant-ai-credits',
  })
  const summary = await getCreditSummary(userId)

  console.log(
    JSON.stringify(
      {
        userId,
        granted: credits,
        totalAvailable: result.totalAvailable,
        monthlyCredits: summary.monthlyCredits,
        purchasedCredits: summary.purchasedCredits,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
