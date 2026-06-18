import { WIKIMEDIA_STRUCTURE_IMAGE_DATA } from '../../data/kb/wikimediaStructureImageData'
import { normalizeGenericName } from './normalizeGenericName'

/**
 * Wikimedia Commons structure image metadata for KB browse cards and detail views.
 *
 * Hotlinking Commons thumb URLs is a common, accepted practice for attribution-
 * compliant reuse (link back to file page + license). URLs can change if files are
 * moved; onError fallback shows a placeholder. Regenerate mappings via
 * `npx tsx scripts/fetch-wikimedia-structure-images.ts`.
 */
export interface StructureImageAttribution {
  thumbUrl: string
  /** Larger thumb for drug detail hero (falls back to thumbUrl when absent). */
  detailThumbUrl?: string
  commonsFileUrl: string
  fileName: string
  author?: string
  license: string
}

export type StructureImageDataEntry = StructureImageAttribution & {
  /** Normalized generic name keys (see normalizeGenericName). */
  keys: string[]
}

const STRUCTURE_LOOKUP = new Map<string, StructureImageAttribution>()

for (const entry of WIKIMEDIA_STRUCTURE_IMAGE_DATA) {
  const { keys, ...attribution } = entry
  for (const key of keys) {
    STRUCTURE_LOOKUP.set(key, attribution)
  }
}

function lookupKey(normalizedName: string): string | null {
  if (STRUCTURE_LOOKUP.has(normalizedName)) return normalizedName
  const firstToken = normalizedName.split(' ')[0]
  if (firstToken && STRUCTURE_LOOKUP.has(firstToken)) return firstToken
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

/** Larger detail image URL when mapped, otherwise null. */
export function getStructureDetailImageUrl(genericName: string): string | null {
  const attribution = getStructureImageAttribution(genericName)
  if (!attribution) return null
  return attribution.detailThumbUrl ?? attribution.thumbUrl
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

/** Count of mapped generic-name keys (for diagnostics). */
export function countMappedStructureImageKeys(): number {
  return STRUCTURE_LOOKUP.size
}

/** Count of unique Commons files mapped. */
export function countMappedStructureImageFiles(): number {
  return listKnownStructureImageAttributions().length
}
