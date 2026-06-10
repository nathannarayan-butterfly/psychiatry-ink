import { loadDiagnosen } from '../diagnosenArchive'
import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import { loadClinicalImprintIndex } from '../clinicalImprint'
import { loadMedicationPlanState } from '../medication/storage'
import { buildIsdmAnalysis, type IsdmBuildInput } from './buildAnalysis'
import { loadIsdmInput } from './inputStorage'
import { saveIsdmAnalysis } from './storage'

export type IsdmRebuildReason =
  | 'imprint'
  | 'checklist'
  | 'diagnosis'
  | 'verlauf'
  | 'profile'
  | 'vault'
  | 'input'

type ChecklistGetter = () => Record<string, Record<string, boolean>>

const pendingCases = new Map<string, IsdmRebuildReason>()
const checklistGetters = new Map<string, ChecklistGetter>()
let flushTimer: number | null = null

function collectVerlaufText(caseId: string): string {
  const parts: string[] = []
  for (const documentTypeId of ['verlauf', 'therapie-verlauf'] as const) {
    const snapshot = loadNotionDocumentSnapshot(documentTypeId, caseId)
    if (!snapshot) continue
    parts.push(...Object.values(snapshot.sectionContents))
  }
  return parts.join('\n\n').trim()
}

export function collectIsdmBuildInput(
  caseId: string,
  checklistSelections: Record<string, Record<string, boolean>> = {},
): IsdmBuildInput {
  return {
    caseId,
    imprints: loadClinicalImprintIndex(caseId),
    checklistSelections,
    isdmInput: loadIsdmInput(caseId) ?? undefined,
    diagnoses: loadDiagnosen(caseId),
    verlaufText: collectVerlaufText(caseId),
    medicationPlanState: loadMedicationPlanState(caseId) ?? undefined,
  }
}

export function registerIsdmChecklistGetter(caseId: string, getter: ChecklistGetter | null): void {
  if (!getter) {
    checklistGetters.delete(caseId)
    return
  }
  checklistGetters.set(caseId, getter)
}

function attachDevDebug(caseId: string, analysis: ReturnType<typeof buildIsdmAnalysis>): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return
  ;(window as Window & { __isdm?: unknown }).__isdm = {
    caseId,
    analysis,
    rebuild: () => scheduleIsdmRebuild(caseId, 'profile'),
  }
}

function flushIsdmRebuild(caseId: string): void {
  const getter = checklistGetters.get(caseId)
  const checklistSelections = getter?.() ?? {}
  const analysis = buildIsdmAnalysis(collectIsdmBuildInput(caseId, checklistSelections))
  saveIsdmAnalysis(analysis, caseId)
  attachDevDebug(caseId, analysis)
}

export function scheduleIsdmRebuild(caseId: string, reason: IsdmRebuildReason = 'imprint'): void {
  if (!caseId.trim()) return
  pendingCases.set(caseId, reason)
  if (flushTimer !== null) return

  flushTimer = window.setTimeout(() => {
    flushTimer = null
    const cases = [...pendingCases.keys()]
    pendingCases.clear()
    for (const id of cases) {
      flushIsdmRebuild(id)
    }
  }, 1200)
}
