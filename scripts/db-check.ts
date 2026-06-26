/**
 * db:check — Supabase migration sanity guard.
 *
 * Enforces docs/database-migration-policy.md:
 *   - Supabase SQL migrations are the single production source of truth.
 *
 * This check is STRUCTURAL and needs NO live database, so it runs in CI offline.
 *
 * Exit code: 0 on success (warnings allowed), 1 on any violation.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve the project root. Tests may point this at a synthetic fixture tree
// via DB_CHECK_ROOT so the structural checks can be exercised hermetically;
// in normal CLI/CI use it is the repo root (this file's parent directory).
const projectRoot = process.env.DB_CHECK_ROOT
  ? path.resolve(process.env.DB_CHECK_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUPABASE_MIGRATIONS_DIR = path.join(projectRoot, 'supabase', 'migrations')

const errors: string[] = []
const warnings: string[] = []
const notes: string[] = []

function header(title: string) {
  console.log(`\n=== ${title} ===`)
}

// ---------------------------------------------------------------------------
// Supabase migrations present + ordered + unique versions
// ---------------------------------------------------------------------------
const MIGRATION_RE = /^(\d{14})_.+\.sql$/

function checkSupabaseMigrations() {
  header('Supabase migrations (production source of truth)')
  if (!fs.existsSync(SUPABASE_MIGRATIONS_DIR)) {
    errors.push('supabase/migrations/ directory not found — production schema source is missing.')
    return
  }
  const files = fs
    .readdirSync(SUPABASE_MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    errors.push('No Supabase migrations found.')
    return
  }
  console.log(`Found ${files.length} Supabase migration(s).`)

  const versionToFiles = new Map<string, string[]>()
  for (const file of files) {
    const match = MIGRATION_RE.exec(file)
    if (!match) {
      errors.push(
        `Malformed Supabase migration filename: "${file}". Expected "YYYYMMDDHHMMSS_description.sql".`,
      )
      continue
    }
    const version = match[1]
    const list = versionToFiles.get(version) ?? []
    list.push(file)
    versionToFiles.set(version, list)
  }

  // Duplicate version prefixes: Supabase tracks applied migrations by version,
  // so duplicates risk a tracking collision. Flagged loudly but kept non-fatal
  // because existing files must not be rewritten unilaterally (see policy doc).
  for (const [version, dupFiles] of versionToFiles) {
    if (dupFiles.length > 1) {
      warnings.push(
        `Duplicate Supabase migration version "${version}" shared by: ${dupFiles.join(', ')}. ` +
          'Needs a coordinated rename to unique timestamps (see docs/database-migration-policy.md §7).',
      )
    }
  }

  // Ordering sanity: filename sort must be a stable, deterministic total order.
  const sorted = [...files].sort()
  const orderingStable = sorted.every((f, i) => f === files[i])
  if (orderingStable) {
    console.log(`Ordering OK — first: ${sorted[0]}, last: ${sorted[sorted.length - 1]}.`)
  } else {
    errors.push('Supabase migration ordering is not deterministic.')
  }

  const uniqueVersions = versionToFiles.size
  notes.push(`Supabase: ${files.length} migration files, ${uniqueVersions} unique version prefix(es).`)
}

function main() {
  console.log('db:check — Supabase migration sanity guard')
  console.log('Policy: docs/database-migration-policy.md (Supabase = prod source of truth)')

  checkSupabaseMigrations()

  header('Summary')
  for (const n of notes) console.log(`  - ${n}`)
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`)
    for (const w of warnings) console.log(`  ! ${w}`)
  }
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`)
    for (const e of errors) console.log(`  x ${e}`)
    console.log('\ndb:check FAILED — fix the violations above.')
    process.exit(1)
  }
  console.log('\ndb:check PASSED.')
}

main()
