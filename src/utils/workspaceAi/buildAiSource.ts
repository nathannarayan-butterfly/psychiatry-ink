import { loadBefunde, type LaborValue } from '../laborArchive'
import { loadDiagnosen } from '../diagnosenArchive'
import { loadMedicationPlanState } from '../medication/storage'

/** A lab value is abnormal when explicitly flagged or out of its reference range. */
function isAbnormalValue(v: LaborValue): boolean {
  if (v.isAbnormal === true) return true
  if (v.numericValue === undefined) return false
  if (v.refMin !== undefined && v.numericValue < v.refMin) return true
  if (v.refMax !== undefined && v.numericValue > v.refMax) return true
  return false
}

function referenceLabel(v: LaborValue): string {
  if (v.refText) return ` (Ref: ${v.refText})`
  if (v.refMin !== undefined && v.refMax !== undefined) return ` (Ref: ${v.refMin}–${v.refMax})`
  return ''
}

/**
 * Plain-text rollup of all recorded laboratory findings for a case, grouped by
 * Befund and category, with reference ranges and an abnormality flag. Fed to the
 * AI as the source for the "Labor interpretieren" feature (Item 10). Returns an
 * empty string when the case has no lab values yet.
 */
export function buildLabInterpretationSource(caseId: string): string {
  const befunde = loadBefunde(caseId)
  if (befunde.length === 0) return ''

  const sorted = [...befunde].sort((a, b) => b.date.localeCompare(a.date))
  const lines: string[] = []

  for (const befund of sorted) {
    const header = befund.label ? `${befund.label} — ${befund.date}` : befund.date
    const hasValues = befund.categories.some((cat) => cat.values.length > 0)
    if (!hasValues) continue
    lines.push(`## Laborbefund ${header}`)
    for (const cat of befund.categories) {
      if (cat.values.length === 0) continue
      lines.push(`### ${cat.label}`)
      for (const value of cat.values) {
        const numeric = value.numericValue !== undefined ? String(value.numericValue) : value.value
        const unit = value.unit ? ` ${value.unit}` : ''
        const flag = isAbnormalValue(value) ? ' [auffällig]' : ''
        lines.push(`- ${value.name}: ${numeric}${unit}${referenceLabel(value)}${flag}`)
      }
    }
  }

  return lines.join('\n').trim()
}

/**
 * Plain-text patient context (diagnoses + active medication) used as the source
 * for the AI-generated Patientenaufklärung (Item 11). Returns an empty string
 * when the case has neither diagnoses nor active medication on file.
 */
export function buildAufklaerungSource(caseId: string): string {
  const lines: string[] = []

  const diagnosen = loadDiagnosen(caseId)
  if (diagnosen.length > 0) {
    lines.push('## Diagnosen')
    for (const entry of diagnosen) {
      const label = entry.displayLabel?.trim() || entry.icd10.label.trim() || entry.icd10.code.trim()
      if (!label) continue
      const code = entry.icd10.code.trim() ? `${entry.icd10.code.trim()} ` : ''
      lines.push(`- ${code}${label}`)
    }
  }

  const medState = loadMedicationPlanState(caseId)
  const plan = medState
    ? medState.plans.find((p) => p.id === medState.currentPlanId) ??
      medState.plans.find((p) => p.isCurrent) ??
      null
    : null
  const meds = (plan?.medications ?? []).filter(
    (m) => !m.deletedAt && m.status !== 'discontinued',
  )
  if (meds.length > 0) {
    lines.push('## Aktuelle Medikation')
    for (const med of meds) {
      const dose = med.doseLineGerman?.trim() ? ` — ${med.doseLineGerman.trim()}` : ''
      const indication = med.indication?.trim() ? ` (Indikation: ${med.indication.trim()})` : ''
      lines.push(`- ${med.substance}${dose}${indication}`)
    }
  }

  return lines.join('\n').trim()
}
