/** Normalize INN/generic name for deduplication (lowercase, strip diacritics). */
export function normalizeGenericName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}
