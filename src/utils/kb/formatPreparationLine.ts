/** Fields needed to render one compact preparation list line. */
export type PreparationLineEntry = {
  strengthValue: string
  strengthUnit: string
  dosageForm: string
  tradeName?: string
  genericName?: string
}

function normalizeName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

/** True when trade name should prefix the line (branded, not generic-equivalent). */
export function tradeNameDiffersFromGeneric(tradeName: string | undefined, genericName: string | undefined): boolean {
  const trade = normalizeName(tradeName)
  const generic = normalizeName(genericName)
  if (!trade || !generic || trade === generic) return false
  if (trade.startsWith(generic) && (trade.includes('generik') || trade.includes('generisch'))) return false
  return true
}

/**
 * Compact display line for a country preparation, e.g.:
 * - "50 mg Tabletten"
 * - "Risperdal 2 mg Filmtabletten" (when trade name differs from generic)
 */
export function formatPreparationLine(entry: PreparationLineEntry): string {
  const strength = `${entry.strengthValue} ${entry.strengthUnit}`.trim()
  const form = entry.dosageForm.trim()
  const core = form ? `${strength} ${form}` : strength

  if (tradeNameDiffersFromGeneric(entry.tradeName, entry.genericName)) {
    return `${entry.tradeName!.trim()} ${core}`
  }
  return core
}
