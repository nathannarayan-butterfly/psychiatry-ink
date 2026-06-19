import { loadDiagnostikBefunde } from '../utils/befundArchive'
import { loadDokumente } from '../utils/dokumenteArchive'
import { loadVerlaufFeed } from '../utils/verlaufFeed'
import { loadSozialtherapie } from '../utils/sozialtherapie/storage'
import { loadDiagnosen } from '../utils/diagnosenArchive'
import { loadMedicationPlanState } from '../utils/medication/storage'
import { loadPsychotherapyPlan } from '../utils/psychotherapy/storage'
import { loadComplementaryTherapies } from '../utils/complementaryTherapy/storage'
import { loadWeitereTherapie } from '../utils/weitereTherapie/storage'
import { loadClinicalImprintIndex } from '../utils/clinicalImprint'
import { loadTimelinesList } from '../utils/timelinePersistence'
import { loadLabGraphsList } from '../utils/labPersistence'
import { loadBefunde } from '../utils/laborArchive'
import { loadNotionDocumentSnapshot } from '../utils/notionDocumentActions'
import { loadCombinationCheckStore } from '../utils/combinationCheck/storage'
import { loadLabMedCorrelationStore } from '../utils/labMedicationCorrelation/storage'
import { loadPrepAiCheckCache } from '../utils/prepAiCheck/storage'
import { loadAnforderungen } from '../utils/anforderungen/storage'
import { loadAttestationState } from '../utils/butterfly/attestationStorage'
import { loadIsdmInput } from '../utils/isdm/inputStorage'
import { loadIsdmAnalysis } from '../utils/isdm/storage'
import { loadClinicalQuestionNoteState } from '../utils/clinicalQuestions/answerNotes'
import { getCaseMeta } from '../hooks/useCaseRegistry'
import { DEMO_CASE_ID } from './constants'
import { loadDemoFixture } from './loadDemoFixture'
import { loadDemoUserState } from './demoUserState'
import type { DemoQaModuleResult } from './types'

function statusFrom(check: boolean, warn = false): DemoQaModuleResult['status'] {
  if (check) return 'pass'
  return warn ? 'warn' : 'fail'
}

export function runDemoQaChecklist(caseId: string = DEMO_CASE_ID, userId?: string): DemoQaModuleResult[] {
  const fixture = loadDemoFixture()
  const meta = getCaseMeta(caseId)
  const userState = userId ? loadDemoUserState(userId) : null
  const results: DemoQaModuleResult[] = []

  results.push({
    module: 'Patient master data',
    status: statusFrom(Boolean(meta?.isDemoPatient && meta.localNachname === 'Demo')),
    message: meta?.isDemoPatient ? 'Demo patient registered' : 'Demo markers missing in registry',
  })

  results.push({
    module: 'Anamnese (Aufnahme)',
    status: statusFrom(Boolean(loadNotionDocumentSnapshot('aufnahme', caseId)?.sectionContents.aufnahmeanlass)),
    message: 'Aufnahme sections loaded',
  })

  results.push({
    module: 'Psychopathological findings',
    status: statusFrom(Boolean(loadNotionDocumentSnapshot('psychopath', caseId))),
    message: 'Psychopath document present',
  })

  const dx = loadDiagnosen(caseId)
  results.push({
    module: 'Diagnosis list',
    status: statusFrom(
      dx.length >= 3 &&
        dx.some((d) => d.icd10.code === 'F20.0') &&
        !dx.some((d) => d.icd10.code.startsWith('F25')),
    ),
    message: `${dx.length} diagnoses (F20.0 main, no F25.x)`,
    count: dx.length,
  })

  const med = loadMedicationPlanState(caseId)
  const medCount = med?.plans[0]?.medications.length ?? 0
  const activeMedCount =
    med?.plans[0]?.medications.filter((m) => m.status === 'active').length ?? 0
  results.push({
    module: 'Medication plan',
    status: statusFrom(medCount >= 2 && activeMedCount >= 1),
    message: `${activeMedCount} active / ${medCount} total medications`,
    count: medCount,
  })

  const combo = loadCombinationCheckStore(caseId)
  results.push({
    module: 'Kombinations-Check (cached)',
    status: statusFrom(combo.findings.length >= 2),
    message: `${combo.findings.length} interaction findings`,
    count: combo.findings.length,
  })

  const labMed = loadLabMedCorrelationStore(caseId)
  results.push({
    module: 'Labor-Med-Korrelation (cached)',
    status: statusFrom(labMed.findings.length >= 2),
    message: `${labMed.findings.length} correlation findings`,
    count: labMed.findings.length,
  })

  const prepAi = loadPrepAiCheckCache(caseId)
  results.push({
    module: 'Verfügbare Präparate (cached)',
    status: statusFrom(prepAi.entries.length >= 1),
    message: `${prepAi.entries.length} prep AI summaries`,
    count: prepAi.entries.length,
  })

  const labs = loadLabGraphsList(caseId)
  const labCount = labs[0]?.entries.length ?? 0
  results.push({
    module: 'Labor',
    status: statusFrom(labCount >= 10),
    message: `${labCount} lab values`,
    count: labCount,
  })

  const laborBefunde = loadBefunde(caseId)
  results.push({
    module: 'Laborbefunde',
    status: statusFrom(laborBefunde.length >= 2),
    message: `${laborBefunde.length} Laborbefunde`,
    count: laborBefunde.length,
  })

  const befund = loadDiagnostikBefunde(caseId)
  results.push({
    module: 'Investigations / Befunde',
    status: statusFrom(befund.length >= 1),
    message: `${befund.length} Befund records`,
    count: befund.length,
  })

  const verlauf = loadVerlaufFeed(caseId)
  results.push({
    module: 'Verlauf feed',
    status: statusFrom(verlauf.length >= 12),
    message: `${verlauf.length} Verlauf entries`,
    count: verlauf.length,
  })

  const psycho = loadPsychotherapyPlan(caseId)
  results.push({
    module: 'Psychotherapie',
    status: statusFrom((psycho?.sessions.length ?? 0) >= 1),
    message: `${psycho?.sessions.length ?? 0} sessions`,
    count: psycho?.sessions.length,
  })

  const komp = loadComplementaryTherapies(caseId)
  results.push({
    module: 'Komplementärtherapie',
    status: statusFrom(komp.length >= 1),
    message: `${komp.length} therapies`,
    count: komp.length,
  })

  const sozial = loadSozialtherapie(caseId)
  results.push({
    module: 'Sozialtherapie',
    status: statusFrom(sozial.length >= 1),
    message: `${sozial.length} targets`,
    count: sozial.length,
  })

  const weitere = loadWeitereTherapie(caseId)
  results.push({
    module: 'Weitere Therapie',
    status: statusFrom(weitere.length >= 1, true),
    message: `${weitere.length} entries`,
    count: weitere.length,
  })

  results.push({
    module: 'Timeline',
    status: statusFrom(loadTimelinesList(caseId).length >= 1),
    message: `${loadTimelinesList(caseId).length} timelines`,
  })

  const docs = loadDokumente(caseId)
  results.push({
    module: 'Documents archive',
    status: statusFrom(docs.length >= 3),
    message: `${docs.length} documents`,
    count: docs.length,
  })

  const imprints = loadClinicalImprintIndex(caseId)
  results.push({
    module: 'Clinical Imprint',
    status: statusFrom((imprints?.imprints.length ?? 0) >= 5),
    message: `${imprints?.imprints.length ?? 0} imprints`,
    count: imprints?.imprints.length,
  })

  const isdmInput = loadIsdmInput(caseId)
  const assessedDomains = isdmInput
    ? Object.values(isdmInput.domains).filter((d) => d.presence !== 'not_assessed').length
    : 0
  results.push({
    module: 'ISDM input',
    status: statusFrom(assessedDomains >= 15),
    message: `${assessedDomains} assessed phenomenology domains`,
    count: assessedDomains,
  })

  const isdmAnalysis = loadIsdmAnalysis(caseId)
  results.push({
    module: 'ISDM analysis',
    status: statusFrom((isdmAnalysis?.diagnosticMappings.length ?? 0) >= 1),
    message: `${isdmAnalysis?.diagnosticMappings.length ?? 0} diagnostic mappings`,
    count: isdmAnalysis?.diagnosticMappings.length,
  })

  const attestations = loadAttestationState(caseId)
  results.push({
    module: 'Butterfly attestations',
    status: statusFrom(Object.keys(attestations).length >= 5),
    message: `${Object.keys(attestations).length} criterion attestations`,
    count: Object.keys(attestations).length,
  })

  const questionNotes = loadClinicalQuestionNoteState(caseId)
  results.push({
    module: 'Clinical question notes',
    status: statusFrom(Object.keys(questionNotes).length >= 2, true),
    message: `${Object.keys(questionNotes).length} finding notes`,
    count: Object.keys(questionNotes).length,
  })

  const anforderungen = loadAnforderungen(caseId)
  results.push({
    module: 'Anforderungen',
    status: statusFrom(anforderungen.length >= 5),
    message: `${anforderungen.length} orders (Labor/Befunde/Therapie)`,
    count: anforderungen.length,
  })

  results.push({
    module: 'Calendar (fixture)',
    status: statusFrom(fixture.calendarItems.length >= 1, true),
    message: `${fixture.calendarItems.length} demo calendar items in fixture`,
    count: fixture.calendarItems.length,
  })

  results.push({
    module: 'Consultation (Konsil)',
    status: 'warn',
    message: fixture.modulePlaceholders.consultation
      ? 'Server-side module — placeholder in fixture only'
      : 'Not configured',
  })

  results.push({
    module: 'DiscussCase',
    status: 'warn',
    message: fixture.modulePlaceholders.discussCase
      ? 'Server-side module — placeholder in fixture only'
      : 'Not configured',
  })

  if (userState?.status === 'archived') {
    results.push({
      module: 'User archive state',
      status: 'warn',
      message: 'Demo archived for this user',
    })
  }

  return results
}
