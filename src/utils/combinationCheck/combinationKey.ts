function normalizeSubstanceKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß]/gi, '')
}

/** Order-independent pair key for substance IDs or normalized names. */
export function buildCombinationKey(idA: string, idB: string): string {
  const a = normalizeSubstanceKey(idA)
  const b = normalizeSubstanceKey(idB)
  return [a, b].sort().join('::')
}

export function buildCombinationKeyFromNames(nameA: string, nameB: string): string {
  return buildCombinationKey(nameA, nameB)
}
