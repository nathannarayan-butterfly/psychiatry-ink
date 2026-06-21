import type { MedicationEntry } from '../../types/medicationPlan'
import type {
  MedicationEducationIdentityBlock,
  MedicationEducationLanguage,
  MedicationEducationPreGenerationPanel,
  MedicationEducationScope,
  PatientMedicationEducationDocument,
} from '../../types/medicationEducation'
import { loadPatientMetadata } from '../cryptoVault'
import { loadMedicationPlanState } from '../medication/storage'
import { activeMedications } from '../medication/planOps'
import { getMedicationEducationKbTemplate } from './kbTemplateStorage'
import { buildKbCoverageItem } from './kbCompleteness'
import { loadCombinationCheckStore } from '../combinationCheck/storage'
import { extractCombinationRisksFromFindings } from './combinationSynthesis'

const GRUENDLICH_TRIGGERS = [
  'clozapin',
  'clozapine',
  'lithium',
  'valpro',
  'valproat',
  'benzodiazep',
  'depot',
  'schwanger',
  'still',
  'pregnancy',
  'lactation',
]

function estimateCredits(scope: MedicationEducationScope, sectionCount: number, gruendlich: boolean): number {
  const base = scope === 'single' ? 3 : 5
  const perSection = gruendlich ? 4 : 2
  return base + sectionCount * perSection
}

export async function buildPreGenerationPanel(params: {
  caseId: string
  scope: MedicationEducationScope
  medicationIds: string[]
  language: MedicationEducationLanguage
  sectionCount: number
}): Promise<MedicationEducationPreGenerationPanel> {
  const planState = loadMedicationPlanState(params.caseId)
  const currentPlan = planState?.plans.find((p) => p.id === planState.currentPlanId) ?? planState?.plans[0]
  const allMeds = currentPlan?.medications ?? []
  const active = activeMedications(allMeds)

  let selected: MedicationEntry[]
  if (params.scope === 'single' || params.scope === 'selected') {
    selected = active.filter((m) => params.medicationIds.includes(m.id))
  } else {
    selected = active
  }

  const kbCoverage = await Promise.all(
    selected.map(async (m) => {
      const medId = m.kbDrugId ?? m.substanceId ?? m.id
      const template = await getMedicationEducationKbTemplate(medId, params.language)
      return buildKbCoverageItem(medId, m.substance, template)
    }),
  )

  const missingIndications = selected.filter((m) => !m.indication?.trim()).map((m) => m.substance)
  const missingMonitoring = kbCoverage
    .filter((k) => k.missingFields.includes('monitoringRequirements'))
    .map((k) => k.substanceName)

  const findings = selected.length > 1 ? loadCombinationCheckStore(params.caseId).findings : []
  const combinationWarnings = extractCombinationRisksFromFindings(findings)
    .filter((r) => r.severity === 'high' || r.severity === 'critical')
    .map((r) => `${r.substances}: ${r.mainRisk}`)

  const gruendlichReasons: string[] = []
  if (selected.length >= 4) gruendlichReasons.push('Polypharmazie (≥4 Medikamente)')
  for (const m of selected) {
    const lower = `${m.substance} ${m.formulation} ${m.indication}`.toLowerCase()
    for (const trigger of GRUENDLICH_TRIGGERS) {
      if (lower.includes(trigger)) {
        gruendlichReasons.push(`Komplexes Medikament/Risiko: ${m.substance}`)
        break
      }
    }
    if (m.formulation === 'depot') gruendlichReasons.push(`Depot: ${m.substance}`)
    if (!m.adherenceNote?.trim()) continue
    if (/schlecht|gering|vergess|non-adherence|poor/i.test(m.adherenceNote)) {
      gruendlichReasons.push(`Adhärenzprobleme: ${m.substance}`)
    }
  }
  if (combinationWarnings.length > 0) gruendlichReasons.push('Relevante Kombinationsrisiken')

  const recommendGruendlich = gruendlichReasons.length > 0 || params.scope !== 'single'

  return {
    medicationsIncluded: selected.map((m) => ({
      id: m.id,
      substance: m.substance,
      doseLine: m.doseLineGerman,
    })),
    kbCoverage,
    combinationWarnings,
    missingIndications,
    missingMonitoring,
    estimatedCredits: estimateCredits(params.scope, params.sectionCount, recommendGruendlich),
    recommendGruendlich,
    gruendlichReasons: [...new Set(gruendlichReasons)],
  }
}

export async function fetchMedicationEducationIdentity(caseId: string): Promise<MedicationEducationIdentityBlock> {
  const meta = await loadPatientMetadata(caseId)
  return {
    patientName: meta?.metadata.name ?? '[Patient]',
    patientDob: meta?.metadata.geburtsdatum ?? '',
    clinicName: '[Klinik]',
    clinicianName: '[Behandelnde/r Arzt/Ärztin]',
  }
}

export function checkDocumentOutdated(
  doc: PatientMedicationEducationDocument,
  currentPlanId?: string,
  currentPlanUpdatedAt?: string,
): boolean {
  if (!doc.medicationPlanVersionId || !currentPlanId) return false
  if (doc.medicationPlanVersionId !== currentPlanId) return true
  if (
    doc.sourceSnapshot.medicationPlanUpdatedAt &&
    currentPlanUpdatedAt &&
    doc.sourceSnapshot.medicationPlanUpdatedAt !== currentPlanUpdatedAt
  ) {
    return true
  }
  return false
}

export async function enrichOutdatedFlags(
  caseId: string,
  docs: PatientMedicationEducationDocument[],
): Promise<PatientMedicationEducationDocument[]> {
  const planState = loadMedicationPlanState(caseId)
  const currentPlan = planState?.plans.find((p) => p.id === planState.currentPlanId)
  return docs.map((d) => ({
    ...d,
    isOutdated: checkDocumentOutdated(d, currentPlan?.id, planState?.updatedAt),
  }))
}

export { aggregateKbCoveragePercent, assessKbTemplateCompleteness } from './kbCompleteness'
