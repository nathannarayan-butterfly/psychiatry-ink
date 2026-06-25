#!/usr/bin/env tsx
/**
 * Restore the live JSONB KB tables (`knowledge_base_drugs`,
 * `knowledge_base_preparations`) from a snapshot produced by
 * `translate-kb-to-english.ts`. This reverts every `*En` field and
 * `enContentSource` provenance marker added by the translation pass by writing
 * back the original `data` JSONB verbatim.
 *
 * Usage:
 *   npm run kb:rollback-en -- --file=/tmp/kb-en-backup-<ISO>.json
 *   npm run kb:rollback-en -- --file=... --dry-run
 *
 * The restore logic itself lives in `scripts/lib/kbSnapshot.ts` and is unit
 * tested; this thin wrapper wires it to the service-role client.
 */
import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import { isKbAdminConfigured } from '../server/services/kbSupabaseAdmin'
import {
  adminUpsertKnowledgeBaseDrugs,
  adminUpsertPreparations,
} from '../server/services/kbLegacyJsonbStore'
import type {
  KnowledgeBaseDrug,
  MedicationMarketAvailability,
} from '../src/types/knowledgeBase'
import { restoreSnapshot, type KbSnapshot, type SnapshotRestorePort } from './lib/kbSnapshot'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.split('=').slice(1).join('=') : undefined
}
const DRY_RUN = process.argv.includes('--dry-run')

async function main(): Promise<void> {
  const file = parseArg('file')
  if (!file) throw new Error('Provide --file=/tmp/kb-en-backup-<ISO>.json')

  const snapshot = JSON.parse(readFileSync(file, 'utf8')) as KbSnapshot
  console.log(
    `[kb:rollback-en] snapshot ${file}: ${snapshot.drugs.length} drugs, ${snapshot.preparations.length} preparations (createdAt ${snapshot.createdAt})`,
  )

  if (DRY_RUN) {
    console.log('[kb:rollback-en] dry-run — no writes performed.')
    return
  }

  if (!isKbAdminConfigured()) {
    throw new Error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required in .env.local.')
  }

  // The snapshot stores full rows; we restore via the same service-role upsert
  // path used by the app, which rewrites the whole `data` JSONB (removing *En).
  const port: SnapshotRestorePort = {
    upsertDrugs: async (rows) => {
      await adminUpsertKnowledgeBaseDrugs(rows.map((r) => r.data as KnowledgeBaseDrug))
    },
    upsertPreparations: async (rows) => {
      await adminUpsertPreparations(rows.map((r) => r.data as MedicationMarketAvailability))
    },
  }

  const result = await restoreSnapshot(snapshot, port)
  console.log(
    `[kb:rollback-en] restored ${result.drugsRestored} drugs + ${result.preparationsRestored} preparations.`,
  )
}

main().catch((err) => {
  console.error('[kb:rollback-en] fatal:', err)
  process.exit(1)
})
