import type { UiLanguage } from '../../types/settings'
import type { GuidedEntryFieldValues, GuidedEntryPrefillContext } from '../../types/guidedEntry'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { loadDiagnosen, selectPrimaryCoding } from '../diagnosenArchive'
import { resolveDiagnosisLabelSync } from '../diagnosisDisplayRequests'
import { loadMedicationPlanState } from '../medication/storage'
import { getCurrentPlan, isMedicationVisible } from '../medication/planOps'
import { resolveOverviewPsychopathologyText } from '../overview/psychopathFindingOps'
import { loadVerlaufFeed } from '../verlaufFeed'
import { calculateAgeFromIsoDate } from '../clinicalDate'

function primaryDiagnosisLabel(caseId: string, language: UiLanguage): string {
  try {
    const entries = loadDiagnosen(caseId)
    const primary = entries.find((e) => e.diagnosisRole === 'main') ?? entries[0]
    if (!primary) return ''
    const { coding, version } = selectPrimaryCoding(primary)
    return (
      resolveDiagnosisLabelSync(coding, version, null, language === 'de' ? 'de' : 'en') ||
      primary.displayLabel ||
      coding.code ||
      ''
    )
  } catch {
    return ''
  }
}

function medicationSummary(caseId: string): string {
  try {
    const state = loadMedicationPlanState(caseId)
    if (!state) return ''
    const plan = getCurrentPlan(state)
    if (!plan) return ''
    const visible = plan.medications.filter((m) => isMedicationVisible(m))
    if (visible.length === 0) return ''
    return visible
      .slice(0, 5)
      .map((m) => m.substance || m.displayBrandName || '—')
      .join(', ')
  } catch {
    return ''
  }
}

function lastVerlaufSnippet(caseId: string): string {
  try {
    const entries = loadVerlaufFeed(caseId)
    const latest = entries[0]
    if (!latest?.content) return ''
    return latest.content.slice(0, 280)
  } catch {
    return ''
  }
}

/** Resolve a schema prefill path into a field value. */
export function resolveGuidedPrefill(
  path: string,
  ctx: GuidedEntryPrefillContext,
): string | boolean | string[] {
  const meta = getCaseMeta(ctx.caseId)
  const today = new Date().toISOString().slice(0, 10)

  switch (path) {
    case 'patient.age': {
      const age = calculateAgeFromIsoDate(meta?.localGeburtsdatum)
      return age !== null ? String(age) : meta?.localAge ?? ''
    }
    case 'patient.gender':
      return meta?.localGeschlecht ?? ''
    case 'case.primaryDiagnosis':
      return primaryDiagnosisLabel(ctx.caseId, ctx.language)
    case 'case.medications':
      return medicationSummary(ctx.caseId)
    case 'case.lastVerlauf':
      return lastVerlaufSnippet(ctx.caseId)
    case 'case.psychopathSummary':
      return resolveOverviewPsychopathologyText(ctx.caseId).text ?? ''
    case 'system.date':
      return today
    default:
      return ''
  }
}

export function buildPrefilledValues(
  fieldPrefillPaths: Array<{ fieldId: string; prefillPath?: string }>,
  ctx: GuidedEntryPrefillContext,
): { values: GuidedEntryFieldValues; sources: Record<string, 'prefill'> } {
  const values: GuidedEntryFieldValues = {}
  const sources: Record<string, 'prefill'> = {}

  for (const { fieldId, prefillPath } of fieldPrefillPaths) {
    if (!prefillPath) continue
    const resolved = resolveGuidedPrefill(prefillPath, ctx)
    if (
      resolved === '' ||
      resolved === false ||
      (Array.isArray(resolved) && resolved.length === 0)
    ) {
      continue
    }
    values[fieldId] = resolved
    sources[fieldId] = 'prefill'
  }

  return { values, sources }
}
