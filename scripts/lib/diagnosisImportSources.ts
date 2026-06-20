/**
 * Shared source loaders for diagnosis catalogue and crosswalk build scripts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const repoRoot = join(here, '../..')
export const sourcesDir = join(repoRoot, 'prisma/data/sources')

export const WHO_MAPPING_URL = 'https://icdcdn.who.int/static/releasefiles/2024-01/mapping.zip'
export const WHO_ICD11_URL =
  'https://icdcdn.who.int/static/releasefiles/2024-01/SimpleTabulation-ICD-11-MMS-en.zip'
export const DIAGNOSTIC_DB_URL =
  'https://github.com/um-bruch/multiaxial-diagnostic-system/raw/master/_data/diagnostic_codes.db'

export function ensureSourcesDir(): void {
  mkdirSync(sourcesDir, { recursive: true })
}

export async function download(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) return
  console.log(`[diagnosis-import] downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(dest, buffer)
}

export function readZipEntry(zipPath: string, entryName: string): string {
  return execSync(`unzip -p ${JSON.stringify(zipPath)} ${JSON.stringify(entryName)}`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

export function normalizeIcd11Code(raw: string): string {
  const base = raw.split('&')[0]?.trim() ?? ''
  return base.replace(/\.Z$/i, '')
}

export function cleanIcd11Title(title: string): string {
  return title
    .replace(/^"+|"+$/g, '')
    .replace(/^[-\s]+/, '')
    .trim()
}

export function buildSearchText(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export type Icd11TabulationRow = {
  foundationUri: string
  releaseUri: string
  code: string
  blockId: string
  title: string
  classKind: string
  depthInKind: number
  isResidual: boolean
  chapterNo: string
  isLeaf: boolean
}

export function parseIcd11Tabulation(zipPath: string): Icd11TabulationRow[] {
  const text = readZipEntry(zipPath, 'SimpleTabulation-ICD-11-MMS-en.txt')
  const lines = text.split(/\r?\n/)
  const rows: Icd11TabulationRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim()) continue
    const cols = line.split('\t')
    const code = cols[2]?.trim() ?? ''
    const title = cleanIcd11Title(cols[4]?.trim() ?? '')
    if (!code && !title) continue

    rows.push({
      foundationUri: cols[0]?.trim() ?? '',
      releaseUri: cols[1]?.trim() ?? '',
      code: normalizeIcd11Code(code),
      blockId: cols[3]?.trim() ?? '',
      title,
      classKind: cols[5]?.trim() ?? '',
      depthInKind: Number(cols[6] ?? 0) || 0,
      isResidual: (cols[7]?.trim() ?? '').toLowerCase() === 'true',
      chapterNo: cols[8]?.trim() ?? '',
      isLeaf: (cols[10]?.trim() ?? '').toLowerCase() === 'true',
    })
  }

  return rows
}

export type BfarmConcept = {
  code: string
  display: string
  parentCode?: string
}

export function findBfarmCodeSystemJson(): string | null {
  const explicit = process.env.BFARM_ICD10GM_JSON?.trim()
  if (explicit && existsSync(explicit)) return explicit

  const files = [
    'CodeSystem-icd10gm-2026.json',
    'CodeSystem-icd10gm-2025.json',
    'CodeSystem-icd10gm-2024.json',
  ]
  for (const file of files) {
    const path = join(sourcesDir, file)
    if (existsSync(path)) return path
  }
  return null
}

export async function maybeDownloadBfarmJson(): Promise<void> {
  const token = process.env.BFARM_ZTS_TOKEN?.trim()
  if (!token || findBfarmCodeSystemJson()) return

  const version = process.env.BFARM_ICD10GM_VERSION?.trim() || '2025.0.0'
  const tgzPath = join(sourcesDir, `bfarm.terminologien.icd10gm-${version}.tgz`)
  const extractDir = join(sourcesDir, 'bfarm-icd10gm')

  console.log(`[diagnosis-import] downloading BfArM ICD-10-GM ${version}…`)
  const response = await fetch(
    `https://terminologien.bfarm.de/packages/bfarm.terminologien.icd10gm/-/${encodeURIComponent(`bfarm.terminologien.icd10gm-${version}.tgz`)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!response.ok) {
    console.warn(`[diagnosis-import] BfArM download skipped (${response.status})`)
    return
  }

  const tgzBuffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(tgzPath, tgzBuffer)
  mkdirSync(extractDir, { recursive: true })
  execSync(`tar -xzf ${JSON.stringify(tgzPath)} -C ${JSON.stringify(extractDir)}`, {
    maxBuffer: 128 * 1024 * 1024,
  })

  const indexPath = join(extractDir, 'package', '.index.json')
  if (!existsSync(indexPath)) return
  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
    files?: Array<{ filename?: string; resourceType?: string }>
  }
  const csFile = index.files?.find(
    (f) => f.resourceType === 'CodeSystem' && f.filename?.startsWith('CodeSystem-icd10gm'),
  )?.filename
  if (!csFile) return

  const src = join(extractDir, 'package', csFile)
  const dest = join(sourcesDir, csFile)
  writeFileSync(dest, readFileSync(src))
  console.log(`[diagnosis-import] extracted ${csFile}`)
}

export function loadBfarmConcepts(jsonPath: string): BfarmConcept[] {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
    concept?: Array<{
      code?: string
      display?: string
      property?: Array<{ code?: string; valueCode?: string }>
    }>
  }

  const concepts: BfarmConcept[] = []
  for (const concept of raw.concept ?? []) {
    const code = concept.code?.trim()
    const display = concept.display?.trim()
    if (!code || !display) continue
    const parentCode = concept.property?.find((p) => p.code === 'parent')?.valueCode?.trim()
    concepts.push({
      code,
      display,
      parentCode: parentCode || undefined,
    })
  }
  return concepts
}

export function isIcd10PsychiatricCode(code: string): boolean {
  return /^F\d/i.test(code)
}

export function isIcd11PsychiatricCode(code: string): boolean {
  return /^6[A-E]/i.test(code)
}

export type DiagnosticSupplement = {
  icd10De: Map<string, string>
  icd11De: Map<string, string>
}

export async function loadDiagnosticSupplement(dbPath: string): Promise<DiagnosticSupplement> {
  const empty = { icd10De: new Map<string, string>(), icd11De: new Map<string, string>() }
  if (!existsSync(dbPath)) return empty

  try {
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(dbPath)
    for (const row of db.prepare('SELECT code, title_de FROM icd11').all() as Array<{
      code: string
      title_de: string
    }>) {
      empty.icd11De.set(row.code, row.title_de)
      empty.icd11De.set(normalizeIcd11Code(row.code), row.title_de)
    }
    for (const row of db.prepare('SELECT icd10cm_code, title_de FROM dsm5').all() as Array<{
      icd10cm_code: string
      title_de: string
    }>) {
      empty.icd10De.set(row.icd10cm_code.toUpperCase(), row.title_de)
    }
    return empty
  } catch {
    return empty
  }
}

export type CatalogueSeedEntry = {
  code: string
  codeNormalized: string
  title: string
  shortTitle?: string
  description?: string
  chapterCode?: string
  chapterTitle?: string
  blockCode?: string
  blockTitle?: string
  parentCode?: string
  hierarchyLevel: number
  isCategory: boolean
  isSelectable: boolean
  isResidualCategory: boolean
  isPsychiatric: boolean
  isSomatic: boolean
  searchText: string
  sourceUri?: string
  synonyms?: string[]
}

export type CatalogueSeed = {
  system: 'ICD10GM' | 'ICD10WHO' | 'ICD11MMS'
  version: string
  language: string
  source: string
  metadata: Record<string, unknown>
  entries: CatalogueSeedEntry[]
}

export type CatalogueBundle = {
  catalogues: CatalogueSeed[]
}
