export function buildCorrelationKey(substanceId: string, labParameter: string): string {
  const a = substanceId.trim().toLowerCase()
  const b = labParameter.trim().toLowerCase()
  return `${a}::${b}`
}

export function parseCorrelationKey(key: string): { substanceId: string; labParameter: string } | null {
  const idx = key.indexOf('::')
  if (idx < 1) return null
  return {
    substanceId: key.slice(0, idx),
    labParameter: key.slice(idx + 2),
  }
}
