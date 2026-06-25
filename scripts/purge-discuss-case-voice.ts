/**
 * Purge expired DiscussCase voice messages and storage blobs.
 *
 * Schedule via cron (e.g. daily) or run manually:
 *   npm run discuss-case:purge-voice
 *   npm run discuss-case:purge-voice -- --dry-run
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same as DiscussCase server).
 */
import dotenv from 'dotenv'
import { isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'
import { purgeExpiredDiscussVoiceMessages } from '../server/services/discussCaseVoiceRetention'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

async function main(): Promise<void> {
  if (!isKbAdminConfigured()) {
    console.error(
      'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running purge.',
    )
    process.exit(1)
  }

  const dryRun = process.argv.includes('--dry-run')
  const { purged } = await purgeExpiredDiscussVoiceMessages({ dryRun })

  if (dryRun) {
    console.log(`[dry-run] Would purge ${purged} expired voice message(s).`)
  } else {
    console.log(`Purged ${purged} expired voice message(s).`)
  }
}

main().catch((error) => {
  console.error('[discuss-case:purge-voice] failed:', error)
  process.exit(1)
})
