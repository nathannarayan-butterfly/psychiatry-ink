/**
 * Builds data/diagnosis-crosswalk.json from official reference sources.
 *
 * Sources (auto-downloaded into data/sources/ if missing):
 * - WHO ICD-10 ↔ ICD-11 mapping (mapping.zip)
 * - WHO ICD-11 MMS simple tabulation (English titles)
 *
 * Optional local supplements:
 * - data/diagnosis-overrides.json — curated German psychiatric crosswalk (DSM legacy codes)
 * - data/sources/diagnostic_codes.db — German ICD-11 / disorder labels (MIT, um-bruch)
 * - data/sources/CodeSystem-icd10gm-*.json — BfArM ICD-10-GM FHIR export (German labels)
 * - BFARM_ZTS_TOKEN — downloads ICD-10-GM package from terminologien.bfarm.de when set
 *
 * Run: npm run db:build-diagnoses
 * Then: npm run db:seed-diagnoses
 */
import dotenv from 'dotenv'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const sourcesDir = join(root, 'data/sources')
const overridesPath = join(root, 'data/diagnosis-overrides.json')
const outputPath = join(root, 'data/diagnosis-crosswalk.json')

const WHO_MAPPING_URL = 'https://icdcdn.who.int/static/releasefiles/2024-01/mapping.zip'
const WHO_ICD11_URL =
  'https://icdcdn.who.int/static/releasefiles/2024-01/SimpleTabulation-ICD-11-MMS-en.zip'
const DIAGNOSTIC_DB_URL =
  'https://github.com/um-bruch/multiaxial-diagnostic-system/raw/master/_data/diagnostic_codes.db'

type CrosswalkEntry = {
  icd10: { code: string; label: string }
  icd11: { code: string; label: string }
  dsm5tr: { code: string; label: string }
}

type WhoRow = {
  icd10Code: string
  icd10Chapter: string
  icd10Title: string
  icd11ReleaseUri: string
  icd11Code: string
  icd11Title: string
}

type Icd11Tabulation = {
  codeToTitle: Map<string, string>
  releaseUriToCode: Map<string, string>
}

function ensureSourcesDir(): void {
  mkdirSync(sourcesDir, { recursive: true })
}

async function download(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) return
  console.log(`[build-diagnoses] downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(dest, buffer)
}

function readZipEntry(zipPath: string, entryName: string): string {
  return execSync(`unzip -p ${JSON.stringify(zipPath)} ${JSON.stringify(entryName)}`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

function normalizeIcd11Code(raw: string): string {
  const base = raw.split('&')[0]?.trim() ?? ''
  return base.replace(/\.Z$/i, '')
}

function cleanIcd11Title(title: string): string {
  return title
    .replace(/^"+|"+$/g, '')
    .replace(/^[-\s]+/, '')
    .trim()
}

function parseWhoMapping(zipPath: string): WhoRow[] {
  const text = readZipEntry(zipPath, '10To11MapToOneCategory.txt')
  const lines = text.split(/\r?\n/)
  const rows: WhoRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim()) continue
    const cols = line.split('\t')
    if (cols[0] !== 'category') continue

    rows.push({
      icd10Code: cols[2]?.trim() ?? '',
      icd10Chapter: cols[3]?.trim() ?? '',
      icd10Title: cols[4]?.trim() ?? '',
      icd11ReleaseUri: cols[8]?.trim() ?? '',
      icd11Code: normalizeIcd11Code(cols[9]?.trim() ?? ''),
      icd11Title: cleanIcd11Title(cols[11]?.trim() ?? ''),
    })
  }

  return rows
}

function parseIcd11Tabulation(zipPath: string): Icd11Tabulation {
  const text = readZipEntry(zipPath, 'SimpleTabulation-ICD-11-MMS-en.txt')
  const lines = text.split(/\r?\n/)
  const codeToTitle = new Map<string, string>()
  const releaseUriToCode = new Map<string, string>()

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim()) continue
    const cols = line.split('\t')
    const releaseUri = cols[1]?.trim()
    const code = cols[2]?.trim()
    const title = cleanIcd11Title(cols[4]?.trim() ?? '')
    if (releaseUri && code) {
      releaseUriToCode.set(releaseUri, normalizeIcd11Code(code))
    }
    if (code && title) {
      codeToTitle.set(code, title)
      codeToTitle.set(normalizeIcd11Code(code), title)
    }
  }

  return { codeToTitle, releaseUriToCode }
}

function resolveWhoIcd11Code(row: WhoRow, tabulation: Icd11Tabulation): string {
  if (row.icd11Code) return row.icd11Code
  const fromUri = tabulation.releaseUriToCode.get(row.icd11ReleaseUri)
  if (fromUri) return fromUri
  const entityId = row.icd11ReleaseUri.match(/\/mms\/(\d+)/)?.[1]
  if (!entityId) return ''
  for (const [uri, code] of tabulation.releaseUriToCode) {
    if (uri.includes(`/mms/${entityId}`)) return code
  }
  return ''
}

function loadOverrides(): Map<string, CrosswalkEntry> {
  if (!existsSync(overridesPath)) return new Map()
  const entries = JSON.parse(readFileSync(overridesPath, 'utf8')) as CrosswalkEntry[]
  const map = new Map<string, CrosswalkEntry>()
  for (const entry of entries) {
    map.set(entry.icd10.code.toUpperCase(), entry)
  }
  return map
}

type DiagnosticSupplement = {
  icd10De: Map<string, string>
  icd11De: Map<string, string>
  dsmLabelByIcd10: Map<string, string>
}

function emptyDiagnosticSupplement(): DiagnosticSupplement {
  return {
    icd10De: new Map(),
    icd11De: new Map(),
    dsmLabelByIcd10: new Map(),
  }
}

function loadDiagnosticSupplementViaPython(dbPath: string): DiagnosticSupplement | null {
  try {
    const scriptPath = join(sourcesDir, '.load-diagnostic-db.py')
    writeFileSync(
      scriptPath,
      [
        'import json, sqlite3, sys',
        'db = sqlite3.connect(sys.argv[1])',
        "icd11 = db.execute('SELECT code, title_de FROM icd11').fetchall()",
        "dsm5 = db.execute('SELECT icd10cm_code, title_de FROM dsm5').fetchall()",
        "print(json.dumps({'icd11': icd11, 'dsm5': dsm5}))",
      ].join('\n'),
    )
    const raw = execSync(`python3 ${JSON.stringify(scriptPath)} ${JSON.stringify(dbPath)}`, {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    })
    const parsed = JSON.parse(raw) as {
      icd11: Array<[string, string]>
      dsm5: Array<[string, string]>
    }
    const supplement = emptyDiagnosticSupplement()
    for (const [code, titleDe] of parsed.icd11) {
      supplement.icd11De.set(code, titleDe)
      supplement.icd11De.set(normalizeIcd11Code(code), titleDe)
    }
    for (const [icd10cmCode, titleDe] of parsed.dsm5) {
      const code = icd10cmCode.toUpperCase()
      supplement.icd10De.set(code, titleDe)
      supplement.dsmLabelByIcd10.set(code, titleDe)
    }
    return supplement
  } catch {
    return null
  }
}

async function loadDiagnosticSupplement(dbPath: string): Promise<DiagnosticSupplement> {
  if (!existsSync(dbPath)) return emptyDiagnosticSupplement()

  try {
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(dbPath)
    const supplement = emptyDiagnosticSupplement()
    for (const row of db.prepare('SELECT code, title_de FROM icd11').all() as Array<{
      code: string
      title_de: string
    }>) {
      supplement.icd11De.set(row.code, row.title_de)
      supplement.icd11De.set(normalizeIcd11Code(row.code), row.title_de)
    }
    for (const row of db.prepare('SELECT icd10cm_code, title_de FROM dsm5').all() as Array<{
      icd10cm_code: string
      title_de: string
    }>) {
      const code = row.icd10cm_code.toUpperCase()
      supplement.icd10De.set(code, row.title_de)
      supplement.dsmLabelByIcd10.set(code, row.title_de)
    }
    return supplement
  } catch {
    const viaPython = loadDiagnosticSupplementViaPython(dbPath)
    if (viaPython) {
      console.log('[build-diagnoses] diagnostic_codes.db supplement loaded via python3 fallback')
      return viaPython
    }
    console.warn(
      '[build-diagnoses] Could not read diagnostic_codes.db (node:sqlite unavailable and python3 fallback failed)',
    )
    return emptyDiagnosticSupplement()
  }
}

function findBfarmCodeSystemJson(): string | null {
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

async function maybeDownloadBfarmJson(): Promise<void> {
  const token = process.env.BFARM_ZTS_TOKEN?.trim()
  if (!token || findBfarmCodeSystemJson()) return

  const version = process.env.BFARM_ICD10GM_VERSION?.trim() || '2025.0.0'
  const tgzPath = join(sourcesDir, `bfarm.terminologien.icd10gm-${version}.tgz`)
  const extractDir = join(sourcesDir, 'bfarm-icd10gm')

  console.log(`[build-diagnoses] downloading BfArM ICD-10-GM ${version}…`)
  const response = await fetch(
    `https://terminologien.bfarm.de/packages/bfarm.terminologien.icd10gm/-/${encodeURIComponent(`bfarm.terminologien.icd10gm-${version}.tgz`)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!response.ok) {
    console.warn(`[build-diagnoses] BfArM download skipped (${response.status})`)
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
  console.log(`[build-diagnoses] extracted ${csFile}`)
}

function loadBfarmIcd10Labels(jsonPath: string): Map<string, string> {
  const map = new Map<string, string>()
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
    concept?: Array<{ code?: string; display?: string }>
  }

  for (const concept of raw.concept ?? []) {
    const code = concept.code?.trim()
    const display = concept.display?.trim()
    if (code && display) {
      map.set(code.toUpperCase(), display)
    }
  }

  return map
}

function chapterMatches(icd10Code: string, icd10Chapter: string, chapters: string[]): boolean {
  if (chapters.includes('all')) return true
  for (const chapter of chapters) {
    if (chapter === 'F' && (icd10Chapter === 'V' || /^F/i.test(icd10Code))) return true
    if (icd10Code.toUpperCase().startsWith(chapter.toUpperCase())) return true
  }
  return false
}

function resolveIcd10Label(
  code: string,
  whoTitle: string,
  bfarm: Map<string, string>,
  icd10De: Map<string, string>,
  override?: CrosswalkEntry,
): string {
  const upper = code.toUpperCase()
  return (
    bfarm.get(upper) ||
    override?.icd10.label ||
    icd10De.get(upper) ||
    whoTitle ||
    upper
  )
}

function resolveIcd11Label(
  code: string,
  whoTitle: string,
  tabulation: Icd11Tabulation,
  icd11De: Map<string, string>,
  override?: CrosswalkEntry,
): string {
  if (override?.icd11.label) return override.icd11.label
  if (!code) return ''
  return (
    icd11De.get(code) ||
    icd11De.get(normalizeIcd11Code(code)) ||
    tabulation.codeToTitle.get(code) ||
    tabulation.codeToTitle.get(normalizeIcd11Code(code)) ||
    cleanIcd11Title(whoTitle)
  )
}

function resolveDsm(
  icd10Code: string,
  dsmLabelByIcd10: Map<string, string>,
  override?: CrosswalkEntry,
): { code: string; label: string } {
  if (override?.dsm5tr.code || override?.dsm5tr.label) {
    return { code: override.dsm5tr.code, label: override.dsm5tr.label }
  }
  const label = dsmLabelByIcd10.get(icd10Code.toUpperCase()) ?? ''
  return { code: '', label }
}

function parseChaptersArg(): string[] {
  const idx = process.argv.indexOf('--chapters')
  if (idx === -1) return ['F']
  const raw = process.argv[idx + 1] ?? 'F'
  return raw.split(',').map((c) => c.trim()).filter(Boolean)
}

async function main() {
  ensureSourcesDir()

  const mappingZip = join(sourcesDir, 'mapping.zip')
  const icd11Zip = join(sourcesDir, 'icd11-mms-en.zip')
  const diagnosticDb = join(sourcesDir, 'diagnostic_codes.db')

  await download(WHO_MAPPING_URL, mappingZip)
  await download(WHO_ICD11_URL, icd11Zip)
  await download(DIAGNOSTIC_DB_URL, diagnosticDb)
  await maybeDownloadBfarmJson()

  const chapters = parseChaptersArg()
  const whoRows = parseWhoMapping(mappingZip)
  const icd11Tabulation = parseIcd11Tabulation(icd11Zip)
  const overrides = loadOverrides()
  const supplement = await loadDiagnosticSupplement(diagnosticDb)

  const bfarmPath = findBfarmCodeSystemJson()
  const bfarmLabels = bfarmPath ? loadBfarmIcd10Labels(bfarmPath) : new Map<string, string>()
  if (bfarmPath) {
    console.log(`[build-diagnoses] BfArM ICD-10-GM labels: ${bfarmLabels.size} (${bfarmPath})`)
  } else {
    console.warn(
      '[build-diagnoses] No BfArM ICD-10-GM file — German ICD-10 labels use overrides/supplements/English fallback. Set BFARM_ZTS_TOKEN or place CodeSystem-icd10gm-*.json in data/sources/',
    )
  }

  const byIcd10 = new Map<string, CrosswalkEntry>()

  for (const row of whoRows) {
    if (!row.icd10Code || !chapterMatches(row.icd10Code, row.icd10Chapter, chapters)) continue

    const icd10Upper = row.icd10Code.toUpperCase()
    const override = overrides.get(icd10Upper)
    const icd11Code =
      override?.icd11.code || resolveWhoIcd11Code(row, icd11Tabulation)
    const icd10Label = resolveIcd10Label(
      row.icd10Code,
      row.icd10Title,
      bfarmLabels,
      supplement.icd10De,
      override,
    )
    const icd11Label = resolveIcd11Label(
      icd11Code,
      row.icd11Title,
      icd11Tabulation,
      supplement.icd11De,
      override,
    )
    const dsm = resolveDsm(row.icd10Code, supplement.dsmLabelByIcd10, override)

    byIcd10.set(icd10Upper, {
      icd10: { code: row.icd10Code, label: icd10Label },
      icd11: { code: icd11Code, label: icd11Label },
      dsm5tr: dsm,
    })
  }

  // Curated overrides not present in WHO one-to-one map (e.g. finer ICD-11 subcodes)
  for (const [code, override] of overrides) {
    if (!byIcd10.has(code)) {
      byIcd10.set(code, override)
    }
  }

  const entries = [...byIcd10.values()].sort((a, b) =>
    a.icd10.code.localeCompare(b.icd10.code, 'de'),
  )

  const missingIcd11 = entries.filter((e) => !e.icd11.code.trim())
  const missingIcd11Label = entries.filter((e) => e.icd11.code.trim() && !e.icd11.label.trim())
  if (missingIcd11.length > 0) {
    console.warn(
      `[build-diagnoses] ${missingIcd11.length} entries missing ICD-11 code: ${missingIcd11.map((e) => e.icd10.code).join(', ')}`,
    )
  }
  if (missingIcd11Label.length > 0) {
    console.warn(
      `[build-diagnoses] ${missingIcd11Label.length} entries missing ICD-11 label: ${missingIcd11Label.map((e) => e.icd10.code).join(', ')}`,
    )
  }

  writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`)
  console.log(
    `[build-diagnoses] wrote ${entries.length} crosswalks → ${outputPath} (chapters=${chapters.join(',')})`,
  )
  console.log(
    `[build-diagnoses] ICD-11 populated: ${entries.filter((e) => e.icd11.code && e.icd11.label).length}/${entries.length}, overrides: ${overrides.size}, with DSM label: ${entries.filter((e) => e.dsm5tr.label).length}`,
  )
}

main().catch((error) => {
  console.error('[build-diagnoses] failed', error)
  process.exit(1)
})
