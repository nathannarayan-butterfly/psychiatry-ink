import type { DoseSchedule } from '../../types/medicationPlan'

function formatAmount(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.replace('.', ',')
}

function extractNumeric(value: string): string {
  const match = value.trim().match(/^([\d.,]+)/)
  if (!match) return ''
  const normalized = match[1].replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return ''
  return Number.isInteger(parsed) ? String(parsed) : String(parsed).replace('.', ',')
}

export function hasStructuredPrnFields(schedule: DoseSchedule): boolean {
  return Boolean(
    schedule.prnBasisDose?.trim() ||
      schedule.prnMaxSingleDose?.trim() ||
      schedule.prnMaxDailyDose?.trim(),
  )
}

export function formatPrnAmount(amount: string, unit: string): string {
  const formatted = formatAmount(amount)
  if (!formatted) return ''
  const unitPart = unit.trim()
  return unitPart ? `${formatted} ${unitPart}` : formatted
}

/**
 * Natural German clinical phrasing for PRN dosing, e.g.
 * "40 mg bei Bedarf (max. Einzeldosis 80 mg, max. 120 mg/24 h)".
 */
export function formatPrnScheduleGerman(schedule: DoseSchedule): string {
  if (!hasStructuredPrnFields(schedule)) {
    return schedule.morning.trim()
  }

  const unit = schedule.unit.trim() || 'mg'
  const basis = formatPrnAmount(schedule.prnBasisDose ?? '', unit)
  const maxSingle = schedule.prnMaxSingleDose?.trim()
  const maxDaily = schedule.prnMaxDailyDose?.trim()

  const limits: string[] = []
  if (maxSingle) limits.push(`max. Einzeldosis ${formatPrnAmount(maxSingle, unit)}`)
  if (maxDaily) limits.push(`max. ${formatPrnAmount(maxDaily, unit)}/24 h`)

  if (basis && limits.length === 0) return `${basis} bei Bedarf`
  if (basis && limits.length === 1 && maxDaily && !maxSingle) {
    return `${basis} bei Bedarf (${limits[0]})`
  }
  if (basis && limits.length) return `${basis} bei Bedarf (${limits.join(', ')})`
  if (limits.length) return `bei Bedarf (${limits.join(', ')})`
  return basis || schedule.morning.trim()
}

/** Best-effort migration from legacy free-text PRN dose lines. */
export function parseLegacyPrnDoseText(text: string): Pick<
  DoseSchedule,
  'prnBasisDose' | 'prnMaxSingleDose' | 'prnMaxDailyDose'
> {
  const trimmed = text.trim()
  const empty = { prnBasisDose: '', prnMaxSingleDose: '', prnMaxDailyDose: '' }
  if (!trimmed) return empty

  const maxDailyMatch = trimmed.match(
    /(?:max\.?\s*|bis\s+zu\s+)([\d.,]+)(?:\s*(?:mg|µg|mcg|g|ml|ie|i\.e\.?))?\s*\/?\s*24\s*h/i,
  )
  const maxSingleMatch = trimmed.match(/max\.?\s*Einzeldosis\s*([\d.,]+)/i)

  const maxDaily = maxDailyMatch ? extractNumeric(maxDailyMatch[1]) : ''
  const maxSingle = maxSingleMatch ? extractNumeric(maxSingleMatch[1]) : ''

  // Reject tablet-count ranges like "1-2 Tbl." — not a single numeric PRN basis dose.
  const hasDoseRange = /^[\d.,]+\s*-\s*[\d.,]+/.test(trimmed)
  const basisMatch = !hasDoseRange ? trimmed.match(/^([\d.,]+)(?:\s*(?:mg|µg|mcg|g|ml|ie|i\.e\.?))?/i) : null
  const basis = basisMatch ? extractNumeric(basisMatch[1]) : ''

  if (!basis && !maxDaily && !maxSingle) return empty
  if (hasDoseRange && !maxDaily && !maxSingle) return empty
  return { prnBasisDose: basis, prnMaxSingleDose: maxSingle, prnMaxDailyDose: maxDaily }
}

export function normalizePrnScheduleForSave(schedule: DoseSchedule): DoseSchedule {
  if (!schedule.prn || !hasStructuredPrnFields(schedule)) return schedule

  const composed = formatPrnScheduleGerman(schedule)
  return {
    ...schedule,
    morning: composed,
    noon: '',
    evening: '',
    night: '',
  }
}

export function parseNumericDose(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

/** True when max single dose exceeds max daily dose (both numeric). */
export function prnMaxSingleExceedsDaily(schedule: DoseSchedule): boolean {
  const single = parseNumericDose(schedule.prnMaxSingleDose ?? '')
  const daily = parseNumericDose(schedule.prnMaxDailyDose ?? '')
  if (single === null || daily === null) return false
  return single > daily
}
