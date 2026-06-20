/**
 * Builds prisma/data/diagnosis-catalogue.json — independent ICD-10-GM F + ICD-11 Ch06 catalogues.
 *
 * Sources (auto-downloaded into prisma/data/sources/ if missing):
 * - WHO ICD-11 MMS simple tabulation (Chapter 06 mental/behavioural/neurodevelopmental)
 * - BfArM ICD-10-GM FHIR CodeSystem (F chapter, German labels) when available
 * - prisma/data/diagnosis-overrides.json — curated German psychiatric labels
 * - diagnostic_codes.db — German ICD-11 supplement
 *
 * Run: npm run db:build-catalogue
 * Then: npm run db:seed-catalogue
 */
import dotenv from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildSearchText,
  download,
  ensureSourcesDir,
  findBfarmCodeSystemJson,
  isIcd10PsychiatricCode,
  isIcd11PsychiatricCode,
  loadBfarmConcepts,
  loadDiagnosticSupplement,
  maybeDownloadBfarmJson,
  normalizeCode,
  normalizeIcd11Code,
  parseIcd11Tabulation,
  repoRoot,
  sourcesDir,
  WHO_ICD11_URL,
  type CatalogueBundle,
  type CatalogueSeedEntry,
} from './lib/diagnosisImportSources.ts'

dotenv.config()
dotenv.config({ path: '.env.local', override: true })

const overridesPath = join(repoRoot, 'prisma/data/diagnosis-overrides.json')
const outputPath = join(repoRoot, 'prisma/data/diagnosis-catalogue.json')

const ICD11_VERSION = '2024-01'
const ICD10GM_VERSION = process.env.BFARM_ICD10GM_VERSION?.trim() || '2025.0.0'

type OverrideEntry = {
  icd10: { code: string; label: string }
  icd11: { code: string; label: string }
}

function loadOverrides(): Map<string, OverrideEntry> {
  if (!existsSync(overridesPath)) return new Map()
  const entries = JSON.parse(readFileSync(overridesPath, 'utf8')) as OverrideEntry[]
  const map = new Map<string, OverrideEntry>()
  for (const entry of entries) {
    map.set(entry.icd10.code.toUpperCase(), entry)
  }
  return map
}

function icd10HierarchyLevel(code: string): number {
  if (!code.includes('.')) return 1
  return 2 + (code.split('.')[1]?.length ?? 0)
}

function buildIcd10GmCatalogue(
  bfarmConcepts: ReturnType<typeof loadBfarmConcepts>,
  overrides: Map<string, OverrideEntry>,
  supplement: Awaited<ReturnType<typeof loadDiagnosticSupplement>>,
): CatalogueSeedEntry[] {
  const byCode = new Map(bfarmConcepts.map((c) => [normalizeCode(c.code), c]))
  const fConcepts = bfarmConcepts.filter((c) => isIcd10PsychiatricCode(c.code))

  // Include category/block nodes (F00–F99 stems without dot) for hierarchy navigation.
  const categoryStems = new Set<string>()
  for (const concept of fConcepts) {
    const stem = concept.code.split('.')[0]?.toUpperCase() ?? ''
    if (stem) categoryStems.add(stem)
    const block = concept.code.match(/^(F\d{2})/i)?.[1]?.toUpperCase()
    if (block) categoryStems.add(block)
  }
  categoryStems.add('F')

  const entries: CatalogueSeedEntry[] = []

  for (const stem of [...categoryStems].sort()) {
    const concept = byCode.get(stem)
    const title =
      concept?.display ||
      (stem === 'F' ? 'Psychische und Verhaltensstörungen' : stem)
    entries.push({
      code: stem,
      codeNormalized: normalizeCode(stem),
      title,
      chapterCode: 'F',
      chapterTitle: 'Psychische und Verhaltensstörungen',
      blockCode: stem.length === 3 ? stem : undefined,
      hierarchyLevel: stem === 'F' ? 0 : 1,
      isCategory: true,
      isSelectable: false,
      isResidualCategory: false,
      isPsychiatric: true,
      isSomatic: false,
      searchText: buildSearchText([stem, title]),
      parentCode: stem === 'F' ? undefined : stem.length === 3 ? 'F' : stem.split('.')[0],
    })
  }

  for (const concept of fConcepts) {
    const code = concept.code
    const normalized = normalizeCode(code)
    const override = overrides.get(normalized)
    const title =
      override?.icd10.label ||
      concept.display ||
      supplement.icd10De.get(normalized) ||
      code
    const parent = concept.parentCode || code.split('.')[0] || 'F'
    const block = code.match(/^(F\d{2})/i)?.[1]?.toUpperCase()
    const hasSubcodes = fConcepts.some(
      (c) => c.code !== code && c.code.startsWith(`${code}.`),
    )

    entries.push({
      code,
      codeNormalized: normalized,
      title,
      shortTitle: title.length > 80 ? `${title.slice(0, 77)}…` : undefined,
      chapterCode: 'F',
      chapterTitle: 'Psychische und Verhaltensstörungen',
      blockCode: block,
      blockTitle: block ? byCode.get(block)?.display : undefined,
      parentCode: parent !== code ? parent : block,
      hierarchyLevel: icd10HierarchyLevel(code),
      isCategory: hasSubcodes,
      isSelectable: !hasSubcodes,
      isResidualCategory: /\.9$/i.test(code) || /– sonstige|sonstige|nicht näher bezeichnet/i.test(title),
      isPsychiatric: true,
      isSomatic: false,
      searchText: buildSearchText([code, title, block, parent]),
      synonyms: override ? [override.icd10.label] : undefined,
    })
  }

  // Deduplicate by normalized code (prefer richer BfArM row).
  const deduped = new Map<string, CatalogueSeedEntry>()
  for (const entry of entries) {
    const existing = deduped.get(entry.codeNormalized)
    if (!existing || entry.title.length > existing.title.length) {
      deduped.set(entry.codeNormalized, entry)
    }
  }
  return [...deduped.values()].sort((a, b) => a.code.localeCompare(b.code, 'de'))
}

function buildIcd10WhoFallback(
  crosswalkPath: string,
  overrides: Map<string, OverrideEntry>,
): CatalogueSeedEntry[] {
  if (!existsSync(crosswalkPath)) return []
  const crosswalk = JSON.parse(readFileSync(crosswalkPath, 'utf8')) as Array<{
    icd10: { code: string; label: string }
  }>
  return crosswalk.map((row) => {
    const code = row.icd10.code
    const normalized = normalizeCode(code)
    const override = overrides.get(normalized)
    const title = override?.icd10.label || row.icd10.label
    const block = code.match(/^(F\d{2})/i)?.[1]?.toUpperCase()
    return {
      code,
      codeNormalized: normalized,
      title,
      chapterCode: 'F',
      chapterTitle: 'Psychische und Verhaltensstörungen',
      blockCode: block,
      parentCode: code.includes('.') ? code.split('.')[0] : block,
      hierarchyLevel: icd10HierarchyLevel(code),
      isCategory: false,
      isSelectable: true,
      isResidualCategory: /\.9$/i.test(code),
      isPsychiatric: true,
      isSomatic: false,
      searchText: buildSearchText([code, title]),
    }
  })
}

function buildIcd11Ch06Catalogue(
  tabulationRows: ReturnType<typeof parseIcd11Tabulation>,
  supplement: Awaited<ReturnType<typeof loadDiagnosticSupplement>>,
  overrides: Map<string, OverrideEntry>,
): CatalogueSeedEntry[] {
  const ch06 = tabulationRows.filter(
    (row) => row.chapterNo === '06' || isIcd11PsychiatricCode(row.code),
  )

  const titleByCode = new Map<string, string>()
  for (const row of ch06) {
    if (row.code && row.title) titleByCode.set(row.code, row.title)
  }

  const overrideIcd11 = new Map<string, string>()
  for (const [, entry] of overrides) {
    if (entry.icd11.code) overrideIcd11.set(normalizeIcd11Code(entry.icd11.code), entry.icd11.label)
  }

  const blockTitles = new Map<string, string>()
  for (const row of ch06) {
    if (row.classKind === 'block' && row.code) {
      blockTitles.set(row.code, row.title)
    }
  }

  const entries: CatalogueSeedEntry[] = []

  for (const row of ch06) {
    const code = row.code
    if (!code) continue

    const normalized = normalizeIcd11Code(code)
    const german =
      supplement.icd11De.get(code) ||
      supplement.icd11De.get(normalized) ||
      overrideIcd11.get(normalized)
    const title = german || row.title || code
    const blockCode = row.blockId || code.match(/^(6[A-E]\d)/i)?.[1]
    const isChapter = row.classKind === 'chapter'
    const isBlock = row.classKind === 'block'
    const isCategory = isChapter || isBlock || row.classKind === 'category' || !row.isLeaf

    entries.push({
      code,
      codeNormalized: normalized,
      title,
      shortTitle: title.length > 80 ? `${title.slice(0, 77)}…` : undefined,
      chapterCode: '06',
      chapterTitle: 'Mental, behavioural or neurodevelopmental disorders',
      blockCode: blockCode || undefined,
      blockTitle: blockCode ? blockTitles.get(blockCode) || titleByCode.get(blockCode) : undefined,
      parentCode: undefined,
      hierarchyLevel: row.depthInKind,
      isCategory,
      isSelectable: row.isLeaf || (!isChapter && !isBlock && row.classKind === 'category'),
      isResidualCategory: row.isResidual,
      isPsychiatric: true,
      isSomatic: false,
      searchText: buildSearchText([code, title, row.classKind, blockCode]),
      sourceUri: row.releaseUri || undefined,
    })
  }

  const deduped = new Map<string, CatalogueSeedEntry>()
  for (const entry of entries) {
    const existing = deduped.get(entry.codeNormalized)
    if (!existing || entry.title.length > existing.title.length) {
      deduped.set(entry.codeNormalized, entry)
    }
  }
  return [...deduped.values()].sort((a, b) => a.code.localeCompare(b.code, 'en'))
}

async function main() {
  ensureSourcesDir()

  const icd11Zip = join(sourcesDir, 'icd11-mms-en.zip')
  const diagnosticDb = join(sourcesDir, 'diagnostic_codes.db')
  const crosswalkPath = join(repoRoot, 'prisma/data/diagnosis-crosswalk.json')

  await download(WHO_ICD11_URL, icd11Zip)
  await maybeDownloadBfarmJson()

  const overrides = loadOverrides()
  const supplement = await loadDiagnosticSupplement(diagnosticDb)
  const tabulation = parseIcd11Tabulation(icd11Zip)
  const bfarmPath = findBfarmCodeSystemJson()

  const catalogues: CatalogueBundle['catalogues'] = []

  if (bfarmPath) {
    const bfarmConcepts = loadBfarmConcepts(bfarmPath)
    const icd10Entries = buildIcd10GmCatalogue(bfarmConcepts, overrides, supplement)
    catalogues.push({
      system: 'ICD10GM',
      version: ICD10GM_VERSION,
      language: 'de',
      source: `BfArM ICD-10-GM ${ICD10GM_VERSION}`,
      metadata: { bfarmFile: bfarmPath, conceptCount: bfarmConcepts.length },
      entries: icd10Entries,
    })
    console.log(`[build-catalogue] ICD-10-GM F entries: ${icd10Entries.length} (${bfarmPath})`)
  } else {
    const fallback = buildIcd10WhoFallback(crosswalkPath, overrides)
    if (fallback.length === 0) {
      console.warn(
        '[build-catalogue] No BfArM file and no crosswalk fallback — run npm run db:build-diagnoses first or set BFARM_ZTS_TOKEN',
      )
    }
    catalogues.push({
      system: 'ICD10GM',
      version: ICD10GM_VERSION,
      language: 'de',
      source: 'WHO ICD-10 crosswalk fallback (German overrides)',
      metadata: { fallback: true, crosswalkPath },
      entries: fallback,
    })
    console.log(`[build-catalogue] ICD-10-GM fallback entries: ${fallback.length}`)
  }

  const icd11Entries = buildIcd11Ch06Catalogue(tabulation, supplement, overrides)
  catalogues.push({
    system: 'ICD11MMS',
    version: ICD11_VERSION,
    language: 'de',
    source: `WHO ICD-11 MMS ${ICD11_VERSION} Chapter 06`,
    metadata: { chapter: '06', tabulationRows: tabulation.length },
    entries: icd11Entries,
  })
  console.log(`[build-catalogue] ICD-11 Ch06 entries: ${icd11Entries.length}`)

  const bundle: CatalogueBundle = { catalogues }
  writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`)
  console.log(`[build-catalogue] wrote ${outputPath}`)
}

main().catch((error) => {
  console.error('[build-catalogue] failed', error)
  process.exit(1)
})
