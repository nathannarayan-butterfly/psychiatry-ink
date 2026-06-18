#!/usr/bin/env tsx
/**
 * Resolve Wikimedia Commons 2D structure images for the psychopharmacology KB catalog.
 *
 * Usage:
 *   npx tsx scripts/fetch-wikimedia-structure-images.ts
 *   npx tsx scripts/fetch-wikimedia-structure-images.ts --dry-run
 *   npx tsx scripts/fetch-wikimedia-structure-images.ts --limit=10
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PSYCHIATRIC_DRUG_SEEDS } from '../src/data/kb/psychiatric-drug-seed-list-extended'
import { normalizeGenericName } from '../src/utils/kb/normalizeGenericName'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_PATH = join(ROOT, 'src/data/kb/wikimediaStructureImageData.ts')
const REPORT_PATH = join(ROOT, 'scripts/.wikimedia-structure-fetch-report.json')

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const THUMB_WIDTH = 400
const LIST_THUMB_WIDTH = 120
const DELAY_MS = 350

/** Force specific Commons filenames when search heuristics pick metabolites/plants/etc. */
const MANUAL_FILE_OVERRIDES: Record<string, string> = {
  Chlorpromazine: 'Chlorpromazine.svg',
  'Hypericum perforatum': 'Hyperforin.svg',
  Oxazepam: 'Oxazepam.svg',
  Midazolam: 'Midazolam.svg',
  Naloxone: 'Naloxone.svg',
  Procyclidine: 'Procyclidine.svg',
  Orphenadrine: 'Orphenadrine.svg',
  Promethazine: 'Promethazine.svg',
}

interface CommonsImageInfo {
  thumburl: string
  url: string
  descriptionurl: string
  extmetadata?: Record<string, { value?: string }>
  mime?: string
}

interface CommonsSearchHit {
  title: string
  index?: number
  imageinfo?: CommonsImageInfo[]
}

interface ResolvedImage {
  searchTerm: string
  fileTitle: string
  fileName: string
  thumbUrl: string
  detailThumbUrl: string
  commonsFileUrl: string
  author?: string
  license: string
  mime?: string
}

interface SeedAlias {
  genericName: string
  normalizedName?: string
}

function parseArg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=').slice(1).join('=')
  return undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function loadPsychDrugReferenceAliases(): SeedAlias[] {
  const dir = join(ROOT, 'src/data/psychDrugReference/drugs')
  const files = ['antipsychotics.json', 'antidepressants.json', 'moodStabilizers.json', 'anxiolytics.json', 'adhdOther.json']
  const aliases: SeedAlias[] = []
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Array<{ id?: string; genericName?: string }>
    for (const row of raw) {
      if (row.genericName) aliases.push({ genericName: row.genericName, normalizedName: row.id })
    }
  }
  return aliases
}

function searchTermsForSeed(genericName: string): string[] {
  const base = genericName.split('/')[0]?.trim() ?? genericName
  const primary = base.replace(/\s+\([^)]+\)/g, '').trim()
  const firstToken = primary.split(/\s+/)[0] ?? primary
  const terms = new Set<string>([
    `${primary} structure`,
    `${primary} structural formula`,
    `${firstToken} structure`,
    `${firstToken}.svg`,
    `${primary}.svg`,
  ])
  return [...terms]
}

function scoreHit(searchTerm: string, title: string, mime?: string): number {
  const lowerTitle = title.toLowerCase()
  const termTokens = searchTerm.toLowerCase().replace(/ structure| structural formula|\.svg/g, '').split(/\s+/).filter(Boolean)
  let score = 0

  if (!lowerTitle.startsWith('file:')) score -= 100
  if (lowerTitle.includes('skeletal') || lowerTitle.includes('skeleton')) score += 8
  if (lowerTitle.includes('structure') || lowerTitle.includes('structural') || lowerTitle.includes('formula')) score += 10
  if (lowerTitle.endsWith('.svg') || mime === 'image/svg+xml') score += 6
  if (lowerTitle.endsWith('.png')) score += 2
  if (lowerTitle.includes('ball-and-stick') || lowerTitle.includes('3d')) score -= 12
  if (lowerTitle.includes('packaging') || lowerTitle.includes('tablet') || lowerTitle.includes('logo')) score -= 20

  for (const token of termTokens) {
    if (token.length < 4) continue
    if (lowerTitle.includes(token)) score += 12
  }

  if (lowerTitle.includes('metabolite') || lowerTitle.includes('salt') || lowerTitle.includes('hydrochloride')) score -= 4
  if (lowerTitle.includes('metab') && !lowerTitle.includes('meth')) score -= 8
  if (lowerTitle.includes('herbaria') || lowerTitle.includes('plant')) score -= 25
  return score
}

async function commonsSearch(searchTerm: string): Promise<CommonsSearchHit[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: searchTerm,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: String(THUMB_WIDTH),
  })

  const res = await fetch(`${COMMONS_API}?${params.toString()}`, {
    headers: { 'User-Agent': 'PsychiatryInk-KB/1.0 (structure-image-seed; contact@psychiatry.ink)' },
  })
  if (!res.ok) throw new Error(`Commons API ${res.status} for "${searchTerm}"`)
  const json = (await res.json()) as { query?: { pages?: Record<string, CommonsSearchHit> } }
  const pages = json.query?.pages ?? {}
  return Object.values(pages).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

function buildThumbUrl(fullUrl: string, width: number): string {
  const match = fullUrl.match(/\/wikipedia\/commons\/([^/])\/([^/]+)\/(.+)$/)
  if (!match) return fullUrl
  const [, a, b, file] = match
  if (file.endsWith('.svg')) {
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${b}/${file}/${width}px-${file}.png`
  }
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${b}/${file}/${width}px-${file}`
}

function resolveFromHit(searchTerm: string, hit: CommonsSearchHit): ResolvedImage | null {
  const info = hit.imageinfo?.[0]
  if (!info?.descriptionurl || !info.url) return null
  const meta = info.extmetadata ?? {}
  const fileName = hit.title.replace(/^File:/, '')
  const author = meta.Artist?.value ? stripHtml(meta.Artist.value) : undefined
  const license =
    stripHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value ?? 'See file page') || 'See file page'

  return {
    searchTerm,
    fileTitle: hit.title,
    fileName,
    thumbUrl: buildThumbUrl(info.url, LIST_THUMB_WIDTH),
    detailThumbUrl: info.thumburl || buildThumbUrl(info.url, THUMB_WIDTH),
    commonsFileUrl: info.descriptionurl,
    author,
    license,
    mime: info.mime,
  }
}

async function resolveDrugImage(genericName: string): Promise<ResolvedImage | null> {
  const overrideFile = MANUAL_FILE_OVERRIDES[genericName]
  if (overrideFile) {
    const hits = await commonsSearch(`File:${overrideFile}`)
    for (const hit of hits) {
      if (hit.title === `File:${overrideFile}`) {
        const image = resolveFromHit(overrideFile, hit)
        if (image) return image
      }
    }
    const hits2 = await commonsSearch(overrideFile.replace(/\.(svg|png)$/i, ''))
    for (const hit of hits2) {
      if (hit.title.toLowerCase().includes(overrideFile.toLowerCase().replace(/^file:/, ''))) {
        const image = resolveFromHit(overrideFile, hit)
        if (image) return image
      }
    }
  }

  let best: { score: number; image: ResolvedImage } | null = null

  for (const term of searchTermsForSeed(genericName)) {
    const hits = await commonsSearch(term)
    for (const hit of hits) {
      const image = resolveFromHit(term, hit)
      if (!image) continue
      const score = scoreHit(term, hit.title, image.mime)
      if (!best || score > best.score) best = { score, image }
    }
    if (best && best.score >= 24) break
    await sleep(DELAY_MS)
  }

  return best?.image ?? null
}

function collectKeys(seed: SeedAlias): string[] {
  const keys = new Set<string>()
  const primary = normalizeGenericName(seed.genericName)
  if (primary) keys.add(primary)
  if (seed.normalizedName) keys.add(normalizeGenericName(seed.normalizedName))
  const firstToken = primary.split(' ')[0]
  if (firstToken && firstToken.length > 3) keys.add(firstToken)
  return [...keys]
}

function serializeData(entries: Array<{ keys: string[]; image: ResolvedImage }>): string {
  const body = entries
    .map(({ keys, image }) => {
      const fields = [
        `    keys: ${JSON.stringify(keys)},`,
        `    thumbUrl: ${JSON.stringify(image.thumbUrl)},`,
        `    detailThumbUrl: ${JSON.stringify(image.detailThumbUrl)},`,
        `    commonsFileUrl: ${JSON.stringify(image.commonsFileUrl)},`,
        `    fileName: ${JSON.stringify(image.fileName)},`,
        image.author ? `    author: ${JSON.stringify(image.author)},` : null,
        `    license: ${JSON.stringify(image.license)},`,
      ].filter(Boolean)
      return `  {\n${fields.join('\n')}\n  }`
    })
    .join(',\n')

  return `/**
 * Auto-generated Wikimedia Commons structure image metadata for KB psychopharmacology.
 * Regenerate: npx tsx scripts/fetch-wikimedia-structure-images.ts
 *
 * Do not edit manually — changes will be overwritten by the fetch script.
 */
import type { StructureImageDataEntry } from '../../utils/kb/wikimediaStructureImages'

export const WIKIMEDIA_STRUCTURE_IMAGE_DATA: StructureImageDataEntry[] = [
${body}
]
`
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const limit = Number.parseInt(parseArg('limit') ?? '0', 10) || ALL_PSYCHIATRIC_DRUG_SEEDS.length

  const aliasByEnglish = new Map<string, SeedAlias[]>()
  for (const seed of ALL_PSYCHIATRIC_DRUG_SEEDS) {
    const list = aliasByEnglish.get(seed.genericName) ?? []
    list.push({ genericName: seed.genericName, normalizedName: seed.normalizedName })
    aliasByEnglish.set(seed.genericName, list)
  }
  for (const alias of loadPsychDrugReferenceAliases()) {
    const englishGuess = alias.normalizedName?.replace(/-/g, ' ') ?? alias.genericName
    const list = aliasByEnglish.get(englishGuess) ?? []
    list.push(alias)
    aliasByEnglish.set(englishGuess, list)
  }

  const seeds = ALL_PSYCHIATRIC_DRUG_SEEDS.slice(0, limit)
  const resolved: Array<{ genericName: string; keys: string[]; image: ResolvedImage }> = []
  const missing: string[] = []
  const seenFile = new Set<string>()

  for (const seed of seeds) {
    process.stdout.write(`Resolving ${seed.genericName}… `)
    const image = await resolveDrugImage(seed.genericName)
    if (!image) {
      missing.push(seed.genericName)
      process.stdout.write('MISS\n')
      continue
    }
    if (seenFile.has(image.commonsFileUrl)) {
      process.stdout.write('dup\n')
    } else {
      process.stdout.write(`${image.fileName}\n`)
    }
    seenFile.add(image.commonsFileUrl)

    const aliases = aliasByEnglish.get(seed.genericName) ?? [{ genericName: seed.genericName, normalizedName: seed.normalizedName }]
    const keys = new Set<string>()
    for (const alias of aliases) collectKeys(alias).forEach((k) => keys.add(k))
    collectKeys({ genericName: seed.genericName, normalizedName: seed.normalizedName }).forEach((k) => keys.add(k))

    resolved.push({ genericName: seed.genericName, keys: [...keys].sort(), image })
    await sleep(DELAY_MS)
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true })
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalSeeds: seeds.length,
        resolved: resolved.length,
        missing,
        files: resolved.map((r) => ({ genericName: r.genericName, file: r.image.fileName, keys: r.keys })),
      },
      null,
      2,
    ),
  )

  if (!dryRun) {
    writeFileSync(OUTPUT_PATH, serializeData(resolved))
    const { execSync } = await import('node:child_process')
    execSync('npx tsx scripts/patch-wikimedia-structure-keys.ts', { stdio: 'inherit', cwd: ROOT })
  }

  console.log(`\nResolved ${resolved.length}/${seeds.length}. Missing: ${missing.length}.`)
  if (missing.length) console.log('Missing:', missing.join(', '))
  if (dryRun) console.log('Dry run — no data file written.')
  else console.log(`Wrote ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
