import { getCaseMeta } from '../hooks/useCaseRegistry'
import { loadBefunde } from '../utils/laborArchive'
import { loadDiagnosen } from '../utils/diagnosenArchive'
import { loadMedicationPlanState } from '../utils/medication/storage'
import { loadNotionDocumentSnapshot } from '../utils/notionDocumentActions'
import { loadCombinationCheckStore } from '../utils/combinationCheck/storage'
import { loadLabMedCorrelationStore } from '../utils/labMedicationCorrelation/storage'
import { loadPrepAiCheckCache } from '../utils/prepAiCheck/storage'
import { loadAnforderungen } from '../utils/anforderungen/storage'
import { loadClinicalIntelligenceState } from '../utils/clinicalIntelligence/storage'
import { loadAttestationState } from '../utils/butterfly/attestationStorage'
import { loadIsdmInput } from '../utils/isdm/inputStorage'
import { isDemoCaseId } from './constants'
import { getEffectiveDemoSeedVersion } from './demoVersion'

/** True when locally persisted demo case has the markers and modules sales demos need. */
export function isDemoSeedDataComplete(caseId: string): boolean {
  if (!isDemoCaseId(caseId)) return true

  const meta = getCaseMeta(caseId)
  if (!meta?.isDemoPatient) return false
  if (meta.demoSeedVersion !== getEffectiveDemoSeedVersion(meta.demoLocale ?? 'en')) return false
  if (!meta.localVorname?.trim() || !meta.localNachname?.trim()) return false

  const aufnahme = loadNotionDocumentSnapshot('aufnahme', caseId)
  if (!aufnahme?.sectionContents?.aufnahmeanlass?.trim()) return false

  const dx = loadDiagnosen(caseId)
  if (dx.length < 3) return false
  if (!dx.some((d) => d.icd10.code === 'F20.0')) return false
  if (!dx.some((d) => d.icd10.code === 'F10.2')) return false
  if (dx.some((d) => d.icd10.code.startsWith('F25'))) return false

  const med = loadMedicationPlanState(caseId)
  const meds = med?.plans[0]?.medications ?? []
  if (meds.filter((m) => m.status === 'active').length < 1) return false
  if (meds.length < 2) return false

  const combo = loadCombinationCheckStore(caseId)
  if (combo.findings.length < 2) return false

  const labMed = loadLabMedCorrelationStore(caseId)
  if (labMed.findings.length < 2) return false

  const prepAi = loadPrepAiCheckCache(caseId)
  if (prepAi.entries.length < 1) return false

  const laborBefunde = loadBefunde(caseId)
  if (laborBefunde.length < 2) return false

  const isdm = loadIsdmInput(caseId)
  if (!isdm || Object.values(isdm.domains).every((d) => d.presence === 'not_assessed')) return false

  const attestations = loadAttestationState(caseId)
  if (Object.keys(attestations).length < 3) return false

  const orders = loadAnforderungen(caseId)
  if (orders.length < 3) return false

  const ci = loadClinicalIntelligenceState(caseId)
  if (!ci.latestRun?.dimensional.activeDimensions.length) return false

  return true
}
