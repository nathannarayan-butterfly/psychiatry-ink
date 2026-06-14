import { normalizeGenericName } from './normalizeGenericName'

/**
 * Wikimedia Commons structure image metadata for KB browse cards.
 *
 * Hotlinking Commons thumb URLs is a common, accepted practice for attribution-
 * compliant reuse (link back to file page + license). URLs can change if files are
 * moved; onError fallback shows a placeholder. Local caching is deferred.
 */
export interface StructureImageAttribution {
  thumbUrl: string
  commonsFileUrl: string
  fileName: string
  author?: string
  license: string
}

type StructureImageEntry = StructureImageAttribution & {
  /** Normalized generic name keys (see normalizeGenericName). */
  keys: string[]
}

const WIKIMEDIA_STRUCTURE_ENTRIES: StructureImageEntry[] = [
  {
    keys: ['haloperidol'],
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Haloperidol.svg/120px-Haloperidol.svg.png',
    commonsFileUrl: 'https://commons.wikimedia.org/wiki/File:Haloperidol.svg',
    fileName: 'Haloperidol.svg',
    license: 'Public domain',
  },
  {
    keys: ['olanzapin', 'olanzapine'],
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Olanzapine_Structural_Formulea_V.2.svg/120px-Olanzapine_Structural_Formulea_V.2.svg.png',
    commonsFileUrl:
      'https://commons.wikimedia.org/wiki/File:Olanzapine_Structural_Formulea_V.2.svg',
    fileName: 'Olanzapine Structural Formulea V.2.svg',
    author: 'Jü',
    license: 'CC BY-SA 3.0',
  },
  {
    keys: ['sertralin', 'sertraline'],
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Sertraline.svg/120px-Sertraline.svg.png',
    commonsFileUrl: 'https://commons.wikimedia.org/wiki/File:Sertraline.svg',
    fileName: 'Sertraline.svg',
    license: 'Public domain',
  },
  {
    keys: ['risperidon', 'risperidone'],
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Risperidone.svg/120px-Risperidone.svg.png',
    commonsFileUrl: 'https://commons.wikimedia.org/wiki/File:Risperidone.svg',
    fileName: 'Risperidone.svg',
    license: 'Public domain',
  },
  {
    keys: ['aripiprazol', 'aripiprazole'],
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Aripiprazole.svg/120px-Aripiprazole.svg.png',
    commonsFileUrl: 'https://commons.wikimedia.org/wiki/File:Aripiprazole.svg',
    fileName: 'Aripiprazole.svg',
    license: 'Public domain',
  },
  {
    keys: ['paliperidon', 'paliperidone', 'paliperidonpalmitat', 'paliperidone palmitate'],
    thumbUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Paliperidone.svg/120px-Paliperidone.svg.png',
    commonsFileUrl: 'https://commons.wikimedia.org/wiki/File:Paliperidone.svg',
    fileName: 'Paliperidone.svg',
    license: 'Public domain',
  },
]

const STRUCTURE_LOOKUP = new Map<string, StructureImageAttribution>()

for (const entry of WIKIMEDIA_STRUCTURE_ENTRIES) {
  const { keys, ...attribution } = entry
  for (const key of keys) {
    STRUCTURE_LOOKUP.set(key, attribution)
  }
}

function lookupKey(normalizedName: string): string | null {
  if (STRUCTURE_LOOKUP.has(normalizedName)) return normalizedName
  const firstToken = normalizedName.split(' ')[0]
  if (STRUCTURE_LOOKUP.has(firstToken)) return firstToken
  for (const key of STRUCTURE_LOOKUP.keys()) {
    if (normalizedName.includes(key)) return key
  }
  return null
}

/** Resolve a Commons structure thumbnail + license metadata for a generic name. */
export function getStructureImageAttribution(genericName: string): StructureImageAttribution | null {
  const normalized = normalizeGenericName(genericName)
  if (!normalized) return null
  const key = lookupKey(normalized)
  return key ? (STRUCTURE_LOOKUP.get(key) ?? null) : null
}

/** All unique structure images currently mapped (for page-level attribution lists). */
export function listKnownStructureImageAttributions(): StructureImageAttribution[] {
  const seen = new Set<string>()
  const result: StructureImageAttribution[] = []
  for (const entry of STRUCTURE_LOOKUP.values()) {
    if (seen.has(entry.commonsFileUrl)) continue
    seen.add(entry.commonsFileUrl)
    result.push(entry)
  }
  return result.sort((a, b) => a.fileName.localeCompare(b.fileName))
}
