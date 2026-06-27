#!/usr/bin/env tsx
/**
 * One-shot publish of src/demo/demoPatient.fixture.json to demo_patient_canonical.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import '../server/loadEnv.ts'
import { DEFAULT_DEMO_PUBLISHER_EMAIL } from '../shared/demoPublisher.ts'
import { nextDemoSeedVersion } from '../src/demo/demoVersion.ts'
import { validateDemoFixture } from '../src/demo/validateDemoFixture.ts'
import type { DemoPatientFixture } from '../src/demo/types.ts'
import {
  getCanonicalDemoPatient,
  isDemoPatientCanonicalStoreConfigured,
  publishCanonicalDemoPatient,
} from '../server/services/demoPatientCanonicalStore.ts'

async function main(): Promise<void> {
  if (!isDemoPatientCanonicalStoreConfigured()) {
    console.error('BLOCKER: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local')
    process.exit(1)
  }

  const fixturePath = resolve(process.cwd(), 'src/demo/demoPatient.fixture.json')
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as DemoPatientFixture
  const existing = await getCanonicalDemoPatient()
  const seedVersion = nextDemoSeedVersion(existing?.seedVersion ?? fixture.demoSeedVersion)
  const fullFixture: DemoPatientFixture = {
    ...fixture,
    isDemoPatient: true,
    demoSeedVersion: seedVersion,
  }
  const validation = validateDemoFixture(fullFixture, { expectedSeedVersion: seedVersion })

  if (!validation.ok) {
    console.error('Validation failed:', JSON.stringify(validation, null, 2))
    process.exit(1)
  }

  const published = await publishCanonicalDemoPatient({
    seedVersion,
    fixture: fullFixture,
    publishedBy: 'publish-script',
    publishedByEmail: DEFAULT_DEMO_PUBLISHER_EMAIL,
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        previousVersion: existing?.seedVersion ?? null,
        seedVersion: published.seedVersion,
        publishedAt: published.publishedAt,
        publishedByEmail: published.publishedByEmail,
        laborBefundeCount: published.fixture.laborBefunde?.length ?? 0,
        validationWarnings: validation.warnings.length,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
