#!/usr/bin/env npx tsx
/**
 * Export / print the Butterfly.ink audit report.
 * Usage:
 *   npx tsx scripts/export-audit-report.ts
 *   npx tsx scripts/export-audit-report.ts --json > audit.json
 *   npx tsx scripts/export-audit-report.ts --md
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const date = '2026-06-14'

const args = new Set(process.argv.slice(2))
const wantV2 = args.has('--v2')
const slug = wantV2 ? `butterfly-ink-audit-v2-${date}` : `butterfly-ink-audit-${date}`
const mdPath = resolve(root, `docs/audit/${slug}.md`)
const jsonPath = resolve(root, `docs/audit/${slug}.json`)

const wantJson = args.has('--json')
const wantMd = args.has('--md') || args.size === 0 || (args.size === 1 && wantV2)

function readOrExit(path: string, label: string): string {
  if (!existsSync(path)) {
    console.error(`Missing ${label}: ${path}`)
    process.exit(1)
  }
  return readFileSync(path, 'utf8')
}

if (wantJson) {
  process.stdout.write(readOrExit(jsonPath, 'JSON report'))
}

if (wantMd) {
  if (wantJson) process.stdout.write('\n\n---\n\n')
  process.stdout.write(readOrExit(mdPath, 'Markdown report'))
}

if (!wantJson && !wantMd) {
  console.error('Use --json and/or --md')
  process.exit(1)
}
