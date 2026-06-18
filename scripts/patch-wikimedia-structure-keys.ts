#!/usr/bin/env tsx
/** Patch German INN alias keys into wikimediaStructureImageData.ts using psychDrugReference. */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PSYCHIATRIC_DRUG_SEEDS } from '../src/data/kb/psychiatric-drug-seed-list-extended'
import { WIKIMEDIA_STRUCTURE_IMAGE_DATA } from '../src/data/kb/wikimediaStructureImageData'
import { normalizeGenericName } from '../src/utils/kb/normalizeGenericName'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_PATH = join(ROOT, 'src/data/kb/wikimediaStructureImageData.ts')

function innMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.replace(/e$/, '') === b.replace(/e$/, '')) return true
  if (a.replace(/ine$/, 'in') === b || b.replace(/ine$/, 'in') === a) return true
  if (a.replace(/ole$/, 'ol') === b || b.replace(/ole$/, 'ol') === a) return true
  const [af, bf] = [a.split(' ')[0] ?? a, b.split(' ')[0] ?? b]
  if (af !== a || bf !== b) return innMatch(af, bf)
  return false
}

function loadPsychDrugReferenceAliases(): Array<{ id?: string; genericName?: string }> {
  const dir = join(ROOT, 'src/data/psychDrugReference/drugs')
  const files = ['antipsychotics.json', 'antidepressants.json', 'moodStabilizers.json', 'anxiolytics.json', 'adhdOther.json']
  const refs: Array<{ id?: string; genericName?: string }> = []
  for (const file of files) {
    refs.push(...JSON.parse(readFileSync(join(dir, file), 'utf8')))
  }
  return refs
}

const seedByNorm = new Map(ALL_PSYCHIATRIC_DRUG_SEEDS.map((s) => [normalizeGenericName(s.genericName), s.genericName]))
const refs = loadPsychDrugReferenceAliases()
const data = WIKIMEDIA_STRUCTURE_IMAGE_DATA.map((entry) => {
  const keys = new Set(entry.keys)
  const englishKey = entry.keys.find((k) => seedByNorm.has(k))
  const englishSeed = englishKey ? seedByNorm.get(englishKey)! : null
  if (englishSeed) {
    const seedNorm = normalizeGenericName(englishSeed)
    for (const ref of refs) {
      if (!ref.genericName) continue
      const refNorm = normalizeGenericName(ref.id ?? ref.genericName)
      const refNameNorm = normalizeGenericName(ref.genericName)
      if (innMatch(seedNorm, refNorm) || innMatch(seedNorm, refNameNorm)) {
        keys.add(refNameNorm)
        if (refNorm !== refNameNorm) keys.add(refNorm)
      }
    }
  }
  return { ...entry, keys: [...keys].sort() }
})

const body = data
  .map((entry) => {
    const fields = [
      `    keys: ${JSON.stringify(entry.keys)},`,
      `    thumbUrl: ${JSON.stringify(entry.thumbUrl)},`,
      `    detailThumbUrl: ${JSON.stringify(entry.detailThumbUrl)},`,
      `    commonsFileUrl: ${JSON.stringify(entry.commonsFileUrl)},`,
      `    fileName: ${JSON.stringify(entry.fileName)},`,
      entry.author ? `    author: ${JSON.stringify(entry.author)},` : null,
      `    license: ${JSON.stringify(entry.license)},`,
    ].filter(Boolean)
    return `  {\n${fields.join('\n')}\n  }`
  })
  .join(',\n')

writeFileSync(
  OUTPUT_PATH,
  `/**
 * Auto-generated Wikimedia Commons structure image metadata for KB psychopharmacology.
 * Regenerate: npx tsx scripts/fetch-wikimedia-structure-images.ts
 * Keys include German INN aliases from psychDrugReference (patch step).
 */
import type { StructureImageDataEntry } from '../../utils/kb/wikimediaStructureImages'

export const WIKIMEDIA_STRUCTURE_IMAGE_DATA: StructureImageDataEntry[] = [
${body}
]
`,
)

console.log(`Patched ${data.length} entries.`)
