/**
 * Apply accepted Übersicht widget suggestions after import candidates are persisted.
 * Only writes to stores the clinician explicitly accepted — never auto-commits chart data.
 */
import type { OverviewWidgetSuggestion } from '../../schemas/documentImport/aiSuggestion'
import type { PersistResult } from './persistCandidates'
import { setComplianceAggregateOverride } from '../overview/complianceAggregate'
import { getOrCreateMedicationPlanState } from '../medication/storage'
import { buildMedicationItems } from '../overview/complianceSummary'
import { collectOrderedTherapies } from '../therapyAdherence'
import { loadComplementaryTherapies } from '../complementaryTherapy/storage'
import { loadPsychotherapyPlan, savePsychotherapyPlan, getOrCreatePsychotherapyPlan } from '../psychotherapy/storage'
import { loadWeitereTherapie, saveWeitereTherapie } from '../weitereTherapie/storage'
import { createWeitereTherapie } from '../../types/weitereTherapie'
import { loadSozialtherapie } from '../sozialtherapie/storage'

export interface ApplyOverviewSuggestionsParams {
  caseId: string
  suggestions: OverviewWidgetSuggestion[]
  /** Suggestion indices the clinician accepted (parallel to suggestions array). */
  acceptedIndices: Set<number>
  persistResult: PersistResult
}

export interface ApplyOverviewSuggestionsResult {
  applied: number
  skipped: number
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function findMedicationKey(caseId: string, itemLabel: string): string | null {
  const state = getOrCreateMedicationPlanState(caseId)
  const plan = state.plans.find((p) => p.id === state.currentPlanId) ?? state.plans[0]
  if (!plan) return null
  const items = buildMedicationItems(plan.medications)
  const needle = normalizeLabel(itemLabel)
  const match =
    items.find((item) => normalizeLabel(item.label) === needle) ??
    items.find((item) => item.aliases.some((alias) => needle.includes(alias) || alias.includes(needle)))
  return match?.key ?? null
}

function findTherapyKey(
  caseId: string,
  itemLabel: string,
  language: 'de' = 'de',
): string | null {
  const ordered = collectOrderedTherapies({
    language,
    psychotherapyPlan: loadPsychotherapyPlan(caseId),
    complementaryTherapies: loadComplementaryTherapies(caseId),
    weitereEntries: loadWeitereTherapie(caseId),
    sozialTargets: loadSozialtherapie(caseId),
  })
  const needle = normalizeLabel(itemLabel)
  const match = ordered.find(
    (t) =>
      normalizeLabel(t.label) === needle ||
      t.aliases.some((alias) => needle.includes(alias) || alias.includes(needle)),
  )
  return match?.key ?? null
}

export function applyAcceptedOverviewSuggestions(
  params: ApplyOverviewSuggestionsParams,
): ApplyOverviewSuggestionsResult {
  const { caseId, suggestions, acceptedIndices, persistResult } = params
  if (acceptedIndices.size === 0 || persistResult.persisted.length === 0) {
    return { applied: 0, skipped: suggestions.length }
  }

  let applied = 0
  let skipped = 0

  for (let i = 0; i < suggestions.length; i++) {
    if (!acceptedIndices.has(i)) {
      skipped += 1
      continue
    }
    const suggestion = suggestions[i]!
    try {
      switch (suggestion.widget) {
        case 'compliance': {
          const key =
            suggestion.itemGroup === 'medication'
              ? findMedicationKey(caseId, suggestion.itemLabel)
              : findTherapyKey(caseId, suggestion.itemLabel)
          if (!key) {
            skipped += 1
            continue
          }
          setComplianceAggregateOverride(key, suggestion.status, caseId)
          applied += 1
          break
        }
        case 'psychotherapy': {
          const plan = getOrCreatePsychotherapyPlan(caseId)
          const next = { ...plan }
          if (suggestion.method?.trim()) {
            const methodLabel = suggestion.method.trim()
            const existing = next.methods.find((m) => m.selected)
            if (existing) {
              next.methods = next.methods.map((m) =>
                m.id === existing.id ? { ...m, notes: methodLabel } : m,
              )
            } else {
              next.methods = [
                ...next.methods,
                {
                  id: `import-${Date.now()}`,
                  methodId: 'supportive',
                  notes: methodLabel,
                  selected: true,
                },
              ]
            }
            if (next.overview.status === 'not-started') {
              next.overview = { ...next.overview, status: 'active' }
            }
          }
          if (suggestion.mainGoal?.trim()) {
            const goalText = suggestion.mainGoal.trim()
            next.goals = {
              ...next.goals,
              shortTerm: [{ id: `import-goal-${Date.now()}`, text: goalText, status: 'open' }],
            }
          }
          savePsychotherapyPlan(next, caseId)
          applied += 1
          break
        }
        case 'angemeldete-therapien': {
          const existing = loadWeitereTherapie(caseId)
          const normalized = normalizeLabel(suggestion.label)
          const already = existing.some((e) => normalizeLabel(e.type) === normalized)
          if (already) {
            skipped += 1
            continue
          }
          const entry = createWeitereTherapie(suggestion.label)
          entry.status = 'ongoing'
          entry.clinicalGoal = suggestion.goalSummary?.trim() || undefined
          saveWeitereTherapie([...existing, entry], caseId)
          applied += 1
          break
        }
        case 'verlaufstendenz':
        case 'safety':
          // Derived overview widgets — informational in review; chart derives after import.
          skipped += 1
          break
        default:
          skipped += 1
      }
    } catch {
      skipped += 1
    }
  }

  return { applied, skipped }
}
