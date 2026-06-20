#!/usr/bin/env tsx
/**
 * Merge validated Phase C JSON drafts into authored disorder modules.
 *
 * Reads scripts/output/criteria-drafts/*.json, validates icd11 trees against
 * existing disorders, and writes src/data/diagnosisCriteria/icd11Merged/trees.ts.
 *
 * Usage:
 *   npm run criteria:merge-drafts
 *   npm run criteria:merge-drafts -- --dry-run
 *   npm run criteria:merge-drafts -- --file=delirium-not-substance-induced-*.json
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getDisorderById } from '../src/data/diagnosisCriteria/registry.ts'
import {
  normalizeDisorderDraftInput,
  validateDisorderDraft,
} from '../src/data/diagnosisCriteria/validateDisorderDraft.ts'
import type { Icd11CriteriaSet } from '../src/data/diagnosisCriteria/schema.ts'

const DRAFT_DIR = join(process.cwd(), 'scripts/output/criteria-drafts')
const OUTPUT_PATH = join(process.cwd(), 'src/data/diagnosisCriteria/icd11Merged/trees.ts')

interface DraftEnvelope {
  target?: { disorderId?: string; mode?: string; icd11Code?: string }
  draft?: Record<string, unknown>
}

function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.split('=').slice(1).join('=') : undefined
}

function listDraftFiles(filePattern?: string): string[] {
  const all = readdirSync(DRAFT_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
    .sort()
  if (!filePattern) return all.map((f) => join(DRAFT_DIR, f))
  const glob = filePattern.replace(/\*/g, '.*')
  const re = new RegExp(`^${glob}$`, 'i')
  return all.filter((f) => re.test(f)).map((f) => join(DRAFT_DIR, f))
}

function prefixIcd11TreeIds(tree: Icd11CriteriaSet, slug: string): Icd11CriteriaSet {
  return {
    ...tree,
    groups: tree.groups.map((group) => ({
      ...group,
      id: `${slug}__${group.id}`,
      criteria: group.criteria.map((criterion) => ({
        ...criterion,
        id: `${slug}__${criterion.id}`,
      })),
    })),
  }
}

const ICD11_CH6 = /^6[A-Z0-9]{2,3}(\.[A-Z0-9]+)?$/

function normalizeIcd11TreeCitations(tree: Icd11CriteriaSet, anchorCode: string): Icd11CriteriaSet {
  return {
    ...tree,
    groups: tree.groups.map((group) => ({
      ...group,
      criteria: group.criteria.map((criterion) => {
        const icd11Only = (criterion.citation ?? [])
          .filter((source) => source.classification === 'icd11')
          .map((source) => {
            if (ICD11_CH6.test(source.code)) return source
            return { ...source, code: anchorCode }
          })
        const citation =
          icd11Only.length > 0
            ? icd11Only
            : anchorCode
              ? [{ classification: 'icd11' as const, code: anchorCode }]
              : criterion.citation
        return { ...criterion, citation }
      }),
    })),
  }
}

function serializeTs(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent)
  const padInner = '  '.repeat(indent + 1)
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `[\n${value.map((v) => `${padInner}${serializeTs(v, indent + 1)}`).join(',\n')}\n${pad}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return '{}'
  return `{\n${entries
    .map(([k, v]) => `${padInner}${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${serializeTs(v, indent + 1)}`)
    .join(',\n')}\n${pad}}`
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  const filePattern = parseArg('file')
  const files = listDraftFiles(filePattern)

  const merged = new Map<string, Icd11CriteriaSet>()
  const report: Array<{ file: string; disorderId: string; ok: boolean; issues: string[] }> = []

  for (const file of files) {
    const envelope = JSON.parse(readFileSync(file, 'utf8')) as DraftEnvelope
    const disorderId = envelope.target?.disorderId ?? (envelope.draft?.id as string | undefined)
    if (!disorderId) {
      report.push({ file, disorderId: '?', ok: false, issues: ['missing disorderId'] })
      continue
    }

    const existing = getDisorderById(disorderId)
    if (!existing) {
      report.push({ file, disorderId, ok: false, issues: [`unknown disorder id ${disorderId}`] })
      continue
    }

    const normalized = normalizeDisorderDraftInput(envelope.draft ?? {})
    const icd11 = (normalized as Record<string, unknown>).icd11
    if (!icd11) {
      report.push({ file, disorderId, ok: false, issues: ['draft missing icd11 block'] })
      continue
    }

    const mergedDraft = {
      id: existing.id,
      classification: existing.classification,
      code: existing.code,
      name_de: existing.name_de,
      crosswalkKey: existing.crosswalkKey,
      sourceRef: existing.sourceRef,
      version: 1 as const,
      status: 'draft' as const,
      codingSystems: existing.codingSystems,
      differentials_de: existing.differentials_de,
      groups: existing.groups.map((g) => ({
        id: g.id,
        label_de: g.label_de,
        logic: g.logic,
        threshold: g.threshold,
        timeWindow: g.timeWindow,
        groupType: g.groupType,
        criteria: g.criteria.map((c) => ({
          id: c.id,
          text_de: c.text_de,
          mappingHints: c.mappingHints,
          allowClinicianAttest: c.allowClinicianAttest,
          citation: c.citation,
        })),
      })),
      icd11,
    }

    const validation = validateDisorderDraft(mergedDraft)
    if (!validation.ok) {
      report.push({
        file,
        disorderId,
        ok: false,
        issues: validation.issues.map((i) => `${i.path}: ${i.message}`),
      })
      continue
    }

    // Tic disorders moved to ICD-11 chapter 08 (8A05) — native icd11 trees must stay chapter-06 only.
    const anchorCode = existing.codingSystems.icd11?.code ?? envelope.target?.icd11Code ?? ''
    if (disorderId === 'tic_disorders') {
      report.push({
        file,
        disorderId,
        ok: false,
        issues: ['skipped: tic_disorders uses 8A05 crosswalk; no chapter-06 icd11 tree'],
      })
      continue
    }
    if (anchorCode && !ICD11_CH6.test(anchorCode)) {
      report.push({
        file,
        disorderId,
        ok: false,
        issues: [`skipped: ${disorderId} ICD-11 anchor ${anchorCode} is outside chapter 06`],
      })
      continue
    }

    // Prefix ids with disorder slug so shared ICD-11 codes (e.g. 6D8Z) never collide globally.
    const slug = disorderId.replace(/_/g, '').slice(0, 12)
    let tree = prefixIcd11TreeIds(validation.draft!.icd11!, slug)
    if (anchorCode) tree = normalizeIcd11TreeCitations(tree, anchorCode)
    merged.set(disorderId, tree)
    report.push({ file, disorderId, ok: true, issues: [] })
  }

  console.log('[merge-drafts] results:')
  for (const row of report) {
    const status = row.ok ? '✓' : '✗'
    console.log(`  ${status} ${row.disorderId} ← ${row.file.split('/').pop()}`)
    for (const issue of row.issues) console.log(`      - ${issue}`)
  }

  if (dryRun) {
    console.log(`[merge-drafts] dry-run — would write ${merged.size} tree(s) to ${OUTPUT_PATH}`)
    return
  }

  mkdirSync(join(OUTPUT_PATH, '..'), { recursive: true })
  const entries = [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, tree]) => `  ${JSON.stringify(id)}: ${serializeTs(tree, 1)}`)
    .join(',\n')

  const source = `/**
 * LLM-generated ICD-11 criteria trees merged from Phase C drafts.
 * All records remain \`status: 'draft'\` on the parent disorder — clinician review required.
 *
 * Regenerate: npm run criteria:merge-drafts
 */
import type { Icd11CriteriaSet } from '../schema'

export const MERGED_ICD11_TREES: Record<string, Icd11CriteriaSet> = {
${entries}
}
`

  writeFileSync(OUTPUT_PATH, source, 'utf8')
  console.log(`[merge-drafts] wrote ${merged.size} tree(s) → ${OUTPUT_PATH}`)
}

main()
