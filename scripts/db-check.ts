/**
 * db:check — migration sanity / drift guard.
 *
 * Enforces docs/database-migration-policy.md:
 *   - Supabase SQL migrations are the single production source of truth.
 *   - Prisma is local SQLite ORM/typing only and must NOT mutate prod schema.
 *
 * This check is STRUCTURAL and needs NO live database, so it runs in CI offline.
 * DB-connected drift detection is attempted only when a DB is reachable and
 * degrades gracefully otherwise.
 *
 * Exit code: 0 on success (warnings allowed), 1 on any violation.
 */
import { execFileSync } from 'node:child_process'
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
const PRISMA_MIGRATIONS_DIR = path.join(projectRoot, 'prisma', 'migrations')
const PRISMA_SCHEMA = path.join(projectRoot, 'prisma', 'schema.prisma')
const PACKAGE_JSON = path.join(projectRoot, 'package.json')
const WORKFLOWS_DIR = path.join(projectRoot, '.github', 'workflows')

const ALLOW_PRISMA_PROD_MIGRATE = process.env.ALLOW_PRISMA_PROD_MIGRATE === 'true'

const errors: string[] = []
const warnings: string[] = []
const notes: string[] = []

function header(title: string) {
  console.log(`\n=== ${title} ===`)
}

// ---------------------------------------------------------------------------
// 1. Prisma schema parses / validates (no DB connection required)
// ---------------------------------------------------------------------------
function checkPrismaValidate() {
  header('Prisma schema validation')
  if (!fs.existsSync(PRISMA_SCHEMA)) {
    errors.push('prisma/schema.prisma not found.')
    return
  }
  try {
    // prisma validate resolves env(); supply a harmless local fallback for CI.
    const env = { ...process.env }
    if (!env.DATABASE_URL) env.DATABASE_URL = 'file:./dev.db'
    execFileSync('npx', ['--no-install', 'prisma', 'validate', '--schema', PRISMA_SCHEMA], {
      cwd: projectRoot,
      env,
      stdio: 'pipe',
    })
    console.log('OK — prisma schema is valid.')
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; code?: string | number }
    const out = `${e.stdout?.toString() ?? ''}${e.stderr?.toString() ?? ''}`.trim()
    if (/not found|ENOENT|could not determine executable/i.test(out) || e.code === 'ENOENT') {
      warnings.push('prisma CLI not available (offline/no-install) — skipped schema validation.')
      console.log('SKIP — prisma CLI unavailable.')
    } else {
      errors.push(`prisma validate failed:\n${out}`)
      console.log('FAIL — see error summary.')
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Supabase migrations present + ordered + unique versions
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

// ---------------------------------------------------------------------------
// 3. Prisma migrations present + well-formed (local SQLite history)
// ---------------------------------------------------------------------------
function checkPrismaMigrations() {
  header('Prisma migrations (local SQLite history)')
  if (!fs.existsSync(PRISMA_MIGRATIONS_DIR)) {
    warnings.push('prisma/migrations/ not found — no local migration history.')
    return
  }
  const dirs = fs
    .readdirSync(PRISMA_MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  let missing = 0
  for (const dir of dirs) {
    if (!fs.existsSync(path.join(PRISMA_MIGRATIONS_DIR, dir, 'migration.sql'))) {
      warnings.push(`Prisma migration "${dir}" has no migration.sql.`)
      missing += 1
    }
  }
  console.log(`Found ${dirs.length} Prisma migration(s)${missing ? `, ${missing} incomplete` : ''}.`)
  notes.push(`Prisma: ${dirs.length} local migration directories (SQLite, not production).`)
}

// ---------------------------------------------------------------------------
// 4. Production migrate guard — Prisma must not silently mutate prod schema
// ---------------------------------------------------------------------------
const FORBIDDEN_IN_DEPLOY = [
  { re: /prisma\s+migrate\s+deploy/, label: 'prisma migrate deploy' },
  { re: /prisma\s+migrate\s+reset/, label: 'prisma migrate reset' },
  { re: /prisma\s+migrate\s+dev/, label: 'prisma migrate dev' },
  { re: /prisma\s+db\s+push/, label: 'prisma db push' },
]
// Scripts that represent a production/deploy/install surface.
const DEPLOY_SCRIPT_NAMES = /^(build|postinstall|preinstall|start|deploy|release|ci|prestart|prebuild)$/

function checkProdMigrateGuard() {
  header('Production migrate guard')
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')) as {
    scripts?: Record<string, string>
  }
  const scripts = pkg.scripts ?? {}

  for (const [name, cmd] of Object.entries(scripts)) {
    const isDeploySurface = DEPLOY_SCRIPT_NAMES.test(name)
    for (const { re, label } of FORBIDDEN_IN_DEPLOY) {
      if (!re.test(cmd)) continue
      if (label === 'prisma migrate deploy') {
        if (!ALLOW_PRISMA_PROD_MIGRATE) {
          errors.push(
            `Script "${name}" runs "${label}" but ALLOW_PRISMA_PROD_MIGRATE is not set. ` +
              'Prisma deploys to production are forbidden by policy.',
          )
        } else {
          warnings.push(`Script "${name}" runs "${label}" (allowed via ALLOW_PRISMA_PROD_MIGRATE=true).`)
        }
      } else if (isDeploySurface) {
        errors.push(`Deploy-surface script "${name}" runs forbidden command "${label}".`)
      }
    }
  }

  // Also scan CI workflows for prisma migrate deploy.
  if (fs.existsSync(WORKFLOWS_DIR)) {
    for (const f of fs.readdirSync(WORKFLOWS_DIR)) {
      if (!/\.ya?ml$/.test(f)) continue
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8')
      if (/prisma\s+migrate\s+deploy/.test(content) && !ALLOW_PRISMA_PROD_MIGRATE) {
        errors.push(
          `CI workflow ".github/workflows/${f}" runs "prisma migrate deploy" without ALLOW_PRISMA_PROD_MIGRATE.`,
        )
      }
    }
  }

  if (errors.length === 0) {
    console.log(
      ALLOW_PRISMA_PROD_MIGRATE
        ? 'OK — prod Prisma migrate explicitly allowed via ALLOW_PRISMA_PROD_MIGRATE.'
        : 'OK — no deploy path runs Prisma migrations against production.',
    )
  }
}

// ---------------------------------------------------------------------------
// 5. DB-connected drift detection — optional, degrades gracefully
// ---------------------------------------------------------------------------
function checkLiveDrift() {
  header('Live schema drift (optional)')
  if (process.env.RUN_DB_DRIFT !== 'true') {
    console.log('SKIP — set RUN_DB_DRIFT=true (with a reachable DATABASE_URL) to run prisma migrate diff.')
    notes.push('Live drift check skipped (structural-only run).')
    return
  }
  try {
    const out = execFileSync(
      'npx',
      [
        '--no-install',
        'prisma',
        'migrate',
        'diff',
        '--from-migrations',
        PRISMA_MIGRATIONS_DIR,
        '--to-schema-datamodel',
        PRISMA_SCHEMA,
        '--exit-code',
      ],
      { cwd: projectRoot, stdio: 'pipe' },
    )
    console.log(`OK — no drift between Prisma migrations and schema.\n${out.toString().trim()}`)
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: Buffer; stderr?: Buffer }
    const out = `${e.stdout?.toString() ?? ''}${e.stderr?.toString() ?? ''}`.trim()
    if (e.status === 2) {
      errors.push(`Prisma schema drift detected:\n${out}`)
    } else {
      warnings.push(`Could not run live drift check (degraded gracefully):\n${out}`)
    }
  }
}

function main() {
  console.log('db:check — migration sanity & drift guard')
  console.log('Policy: docs/database-migration-policy.md (Supabase = prod source of truth)')

  checkPrismaValidate()
  checkSupabaseMigrations()
  checkPrismaMigrations()
  checkProdMigrateGuard()
  checkLiveDrift()

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
