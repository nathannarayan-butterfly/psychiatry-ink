/**
 * One-time dev cleanup: remove all opaque PatientCase rows except the synthetic demo case.
 *
 * Safety:
 *   - Refuses to run when NODE_ENV=production unless ALLOW_DEV_CLEANUP=true
 *   - Refuses non-local DATABASE_URL (must start with file:)
 *
 * Usage:
 *   npm run dev:clear-patients
 *   npm run dev:clear-patients -- --dry-run
 *
 * Browser registry / vault blobs are client-side only — after this script, open the app
 * and run `purgeNonDemoPatientCases(userId)` from the dev console, or use Demo dev page.
 */
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const DEMO_CASE_ID = 'DEMO-CASE-0001'
const dryRun = process.argv.includes('--dry-run')

function assertDevSafe(): void {
  const dbUrl = process.env.DATABASE_URL ?? ''
  if (!dbUrl.startsWith('file:')) {
    console.error(
      `Refusing to run: DATABASE_URL must be local SQLite (file:…), got "${dbUrl.slice(0, 40)}…"`,
    )
    process.exit(1)
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_CLEANUP !== 'true') {
    console.error(
      'Refusing to run in production. Set ALLOW_DEV_CLEANUP=true only for an intentional cleanup.',
    )
    process.exit(1)
  }
}

async function main(): Promise<void> {
  assertDevSafe()
  const prisma = new PrismaClient()

  try {
    const allCases = await prisma.patientCase.findMany({
      select: { caseId: true, accountId: true, lastOpened: true },
      orderBy: { lastOpened: 'desc' },
    })

    const toRemove = allCases.filter((row) => row.caseId !== DEMO_CASE_ID)
    const kept = allCases.filter((row) => row.caseId === DEMO_CASE_ID)

    console.log(`\nclear-non-demo-patients${dryRun ? ' (dry-run)' : ''}`)
    console.log(`DATABASE_URL=${process.env.DATABASE_URL}`)
    console.log(`Total PatientCase rows: ${allCases.length}`)
    console.log(`Keeping demo case: ${DEMO_CASE_ID} (${kept.length} row(s))`)
    console.log(`Removing: ${toRemove.length} case(s)`)

    if (toRemove.length === 0) {
      console.log('\nNothing to delete — only demo case present (or registry empty).')
      return
    }

    for (const row of toRemove) {
      console.log(`  - ${row.caseId} (account ${row.accountId}, lastOpened ${row.lastOpened.toISOString()})`)
    }

    if (dryRun) {
      const snapshotCount = await prisma.encryptedWorkspaceSnapshot.count({
        where: { caseId: { in: toRemove.map((r) => r.caseId) } },
      })
      console.log(`\nWould also delete ${snapshotCount} EncryptedWorkspaceSnapshot row(s).`)
      return
    }

    const caseIds = toRemove.map((r) => r.caseId)
    const [snapshotResult, caseResult] = await prisma.$transaction([
      prisma.encryptedWorkspaceSnapshot.deleteMany({ where: { caseId: { in: caseIds } } }),
      prisma.patientCase.deleteMany({ where: { caseId: { in: caseIds } } }),
    ])

    console.log(`\nDeleted ${caseResult.count} PatientCase row(s).`)
    console.log(`Deleted ${snapshotResult.count} EncryptedWorkspaceSnapshot row(s).`)
    console.log(
      '\nNote: patient names and clinical blobs live in browser localStorage / IndexedDB.',
    )
    console.log(
      'Run purgeNonDemoPatientCases() in the browser dev console to clear the local registry.',
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
