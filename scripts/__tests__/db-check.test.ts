import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * Coverage for P0-3 (migration authority). Exercises the real db:check script
 * end-to-end against synthetic project roots (via DB_CHECK_ROOT) so the three
 * acceptance criteria are asserted on actual CLI behaviour + exit codes:
 *   - db:check passes (exit 0) on a clean tree
 *   - it flags duplicate Supabase migration version prefixes (warning)
 *   - it detects a forbidden `prisma migrate deploy` in a deploy script (exit 1)
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const scriptPath = path.join(repoRoot, 'scripts', 'db-check.ts')
const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx')

const VALID_PRISMA_SCHEMA = `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Foo {
  id Int @id @default(autoincrement())
}
`

const tmpRoots: string[] = []

function makeRoot(options: {
  migrations: Record<string, string>
  scripts?: Record<string, string>
}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'db-check-'))
  tmpRoots.push(root)

  // The script runs `npx --no-install prisma validate` with cwd = project root.
  // Point the fixture at the repo's installed prisma so validation resolves and
  // exercises the real check rather than erroring on a missing package.
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')

  fs.mkdirSync(path.join(root, 'prisma'), { recursive: true })
  fs.writeFileSync(path.join(root, 'prisma', 'schema.prisma'), VALID_PRISMA_SCHEMA)

  const migrationsDir = path.join(root, 'supabase', 'migrations')
  fs.mkdirSync(migrationsDir, { recursive: true })
  for (const [name, body] of Object.entries(options.migrations)) {
    fs.writeFileSync(path.join(migrationsDir, name), body)
  }

  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', scripts: options.scripts ?? {} }, null, 2),
  )
  return root
}

function runCheck(
  root: string,
  extraEnv: Record<string, string> = {},
): { status: number; output: string } {
  const env: Record<string, string | undefined> = { ...process.env, DB_CHECK_ROOT: root, ...extraEnv }
  delete (env as Record<string, string | undefined>).ALLOW_PRISMA_PROD_MIGRATE
  if (extraEnv.ALLOW_PRISMA_PROD_MIGRATE) env.ALLOW_PRISMA_PROD_MIGRATE = extraEnv.ALLOW_PRISMA_PROD_MIGRATE
  try {
    const stdout = execFileSync(tsxBin, [scriptPath], { env, encoding: 'utf8', cwd: repoRoot })
    return { status: 0, output: stdout }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { status: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

afterEach(() => {
  while (tmpRoots.length) {
    const root = tmpRoots.pop()
    if (root) fs.rmSync(root, { recursive: true, force: true })
  }
})

describe('db:check migration authority (P0-3)', () => {
  it('passes on a clean tree with unique, well-formed migrations', () => {
    const root = makeRoot({
      migrations: {
        '20260101000000_a.sql': 'select 1;',
        '20260102000000_b.sql': 'select 1;',
      },
      scripts: { build: 'tsc -b && vite build' },
    })
    const { status, output } = runCheck(root)
    expect(output).toContain('db:check PASSED')
    expect(status).toBe(0)
  })

  it('flags duplicate Supabase migration version prefixes', () => {
    const root = makeRoot({
      migrations: {
        '20260101000000_first.sql': 'select 1;',
        '20260101000000_second.sql': 'select 1;',
        '20260102000000_third.sql': 'select 1;',
      },
      scripts: { build: 'tsc -b && vite build' },
    })
    const { status, output } = runCheck(root)
    // Duplicates are a loud warning, not a hard failure.
    expect(status).toBe(0)
    expect(output).toContain('Duplicate Supabase migration version "20260101000000"')
  })

  it('detects a forbidden prisma migrate deploy in a deploy script (exit 1)', () => {
    const root = makeRoot({
      migrations: { '20260101000000_a.sql': 'select 1;' },
      scripts: { build: 'prisma migrate deploy' },
    })
    const { status, output } = runCheck(root)
    expect(status).toBe(1)
    expect(output).toContain('prisma migrate deploy')
    expect(output).toContain('ALLOW_PRISMA_PROD_MIGRATE')
  })

  it('allows prisma migrate deploy only when ALLOW_PRISMA_PROD_MIGRATE=true', () => {
    const root = makeRoot({
      migrations: { '20260101000000_a.sql': 'select 1;' },
      scripts: { build: 'prisma migrate deploy' },
    })
    const { status, output } = runCheck(root, { ALLOW_PRISMA_PROD_MIGRATE: 'true' })
    expect(status).toBe(0)
    expect(output).toContain('allowed via ALLOW_PRISMA_PROD_MIGRATE')
  })
})
