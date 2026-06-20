import { pickKbLocalizedText } from '../../types/knowledgeBase'

/** Fields needed to render one compact preparation list line. */
export type PreparationLineEntry = {
  strengthValue: string
  strengthUnit: string
  dosageForm: string
  /** English variant of {@link dosageForm} (e.g. "Tablets" vs. "Tabletten"). */
  dosageFormEn?: string
  tradeName?: string
  /** English variant of {@link tradeName} (brand names usually language-neutral). */
  tradeNameEn?: string
  genericName?: string
  /** English (INN) spelling of {@link genericName}. */
  genericNameEn?: string
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
 *
 * When `language` is `'en'` the English variants (`dosageFormEn`, `tradeNameEn`,
 * `genericNameEn`) are preferred; otherwise the German source fields are used.
 * Legacy callers that omit `language` still get the original German behaviour.
 */
export function formatPreparationLine(
  entry: PreparationLineEntry,
  language?: string,
): string {
  const strength = `${entry.strengthValue} ${entry.strengthUnit}`.trim()
  const form = pickKbLocalizedText(entry.dosageForm, entry.dosageFormEn, language).trim()
  const core = form ? `${strength} ${form}` : strength

  const tradeName = pickKbLocalizedText(entry.tradeName, entry.tradeNameEn, language)
  const genericName = pickKbLocalizedText(entry.genericName, entry.genericNameEn, language)

  if (tradeNameDiffersFromGeneric(tradeName, genericName)) {
    return `${tradeName.trim()} ${core}`
  }
  return core
}
