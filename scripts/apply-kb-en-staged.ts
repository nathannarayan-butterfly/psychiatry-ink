#!/usr/bin/env tsx
/**
 * Apply a staged English-translation file (produced by
 * `translate-kb-to-english.ts --stage`) to the LIVE Supabase JSONB tables.
 *
 * This is the single, reviewed publish step for the unattended pipeline: the
 * heavy work (snapshot, DeepSeek translation, verification) already happened in
 * the stage run; this command only upserts the already-translated rows through
 * the established service-role path. A timestamped snapshot already exists from
 * the stage run and `scripts/rollback-kb-en-translation.ts` can restore it.
 *
 * Usage:
 *   npm run kb:apply-en -- --file=/tmp/kb-en-staged-<ISO>.json
 *   npm run kb:apply-en -- --file=... --dry-run
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

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.split('=').slice(1).join('=') : undefined
}
const DRY_RUN = process.argv.includes('--dry-run')
const CHUNK = 25

interface StagedFile {
  createdAt: string
  drugs: KnowledgeBaseDrug[]
  preparations: MedicationMarketAvailability[]
}

async function main(): Promise<void> {
  const file = parseArg('file')
  if (!file) throw new Error('Provide --file=/tmp/kb-en-staged-<ISO>.json')

  const staged = JSON.parse(readFileSync(file, 'utf8')) as StagedFile
  console.log(
    `[kb:apply-en] ${file}: ${staged.drugs.length} drugs, ${staged.preparations.length} preparations (staged ${staged.createdAt})`,
  )

  // Sanity: every staged row must carry machine-translation provenance.
  const drugsMissingProvenance = staged.drugs.filter((d) => d.enContentSource !== 'machine').length
  const prepsMissingProvenance = staged.preparations.filter((p) => p.enContentSource !== 'machine').length
  if (drugsMissingProvenance > 0 || prepsMissingProvenance > 0) {
    console.warn(
      `[kb:apply-en] WARNING: ${drugsMissingProvenance} drugs / ${prepsMissingProvenance} preparations lack enContentSource='machine'.`,
    )
  }

  if (DRY_RUN) {
    console.log('[kb:apply-en] dry-run — no writes performed.')
    return
  }

  if (!isKbAdminConfigured()) {
    throw new Error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required in .env.local.')
  }

  for (let i = 0; i < staged.drugs.length; i += CHUNK) {
    const batch = staged.drugs.slice(i, i + CHUNK)
    await adminUpsertKnowledgeBaseDrugs(batch)
    console.log(`[kb:apply-en] drugs ${Math.min(i + CHUNK, staged.drugs.length)}/${staged.drugs.length}`)
  }
  for (let i = 0; i < staged.preparations.length; i += CHUNK) {
    const batch = staged.preparations.slice(i, i + CHUNK)
    await adminUpsertPreparations(batch)
    console.log(`[kb:apply-en] preparations ${Math.min(i + CHUNK, staged.preparations.length)}/${staged.preparations.length}`)
  }

  console.log('[kb:apply-en] done.')
}

main().catch((err) => {
  console.error('[kb:apply-en] fatal:', err)
  process.exit(1)
})
