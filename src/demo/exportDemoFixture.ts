import { getCaseMeta } from '../hooks/useCaseRegistry'
import { loadPatientMetadata } from '../utils/cryptoVault'
import { loadDiagnostikBefunde } from '../utils/befundArchive'
import { loadBefunde } from '../utils/laborArchive'
import { listLocalCalendarItems, type CalendarStorageScope } from '../utils/calendarStore'
import { loadCombinationCheckStore } from '../utils/combinationCheck/storage'
import { loadDokumente } from '../utils/dokumenteArchive'
import { loadGeneratedDocuments } from '../utils/generatedDocumentsVault'
import { loadLabMedCorrelationStore } from '../utils/labMedicationCorrelation/storage'
import { loadPrepAiCheckCache } from '../utils/prepAiCheck/storage'
import { loadSozialtherapie } from '../utils/sozialtherapie/storage'
import { loadVerlaufFeed } from '../utils/verlaufFeed'
import { collectClinicalPayload } from '../utils/workspaceVault'
import {
  DEMO_CASE_ID,
  DEMO_FIXTURE_VERSION,
  DEMO_PATIENT_ID,
} from './constants'
import { getEffectiveDemoSeedVersion } from './demoVersion'
import { loadDemoFixture } from './loadDemoFixture'
import type { DemoPatientFixture } from './types'

/** Export the current local demo case state as a publishable fixture. */
export async function exportDemoFixtureFromLocal(
  caseId: string = DEMO_CASE_ID,
  calendarScope?: CalendarStorageScope,
): Promise<DemoPatientFixture> {
  const meta = getCaseMeta(caseId)
  if (!meta?.isDemoPatient) {
    throw new Error('Only demo patient cases can be exported')
  }

  const template = loadDemoFixture()
  const payload = collectClinicalPayload(undefined, caseId)
  const patientMeta = await loadPatientMetadata(caseId)

  let calendarItems = template.calendarItems
  if (calendarScope) {
    const items = await listLocalCalendarItems(calendarScope, {
      from: '2000-01-01T00:00:00.000Z',
      to: '2099-12-31T23:59:59.999Z',
    })
    const demoItems = items.filter((item) => item.caseId === caseId || item.id.startsWith('demo-cal-'))
    if (demoItems.length > 0) calendarItems = demoItems
  }

  const generatedDocuments = await loadGeneratedDocuments(caseId)

  return {
    version: DEMO_FIXTURE_VERSION,
    isDemoPatient: true,
    demoSeedVersion: getEffectiveDemoSeedVersion(),
    demoPatientId: DEMO_PATIENT_ID,
    demoCaseId: DEMO_CASE_ID,
    patient: {
      vorname: meta.localVorname ?? template.patient.vorname,
      nachname: meta.localNachname ?? template.patient.nachname,
      geburtsdatum: meta.localGeburtsdatum ?? patientMeta?.metadata.geburtsdatum ?? template.patient.geburtsdatum,
      geschlecht: meta.localGeschlecht ?? template.patient.geschlecht,
      age: meta.localAge ?? payload.age ?? template.patient.age,
      admissionDate: template.patient.admissionDate,
      patientId: DEMO_PATIENT_ID,
      caseId: DEMO_CASE_ID,
    },
    workspace: {
      age: payload.age,
      selectedDocumentType: payload.selectedDocumentType,
      documents: payload.documents,
      pageHeadings: payload.pageHeadings,
      pageDates: payload.pageDates,
      pageTimes: payload.pageTimes,
      timelines: payload.timelines,
      activeTimelineId: payload.activeTimelineId,
      labGraphs: payload.labGraphs,
      activeLabGraphId: payload.activeLabGraphId,
      diagnoses: payload.diagnoses,
      clinicalImprints: payload.clinicalImprints,
      medicationPlanState: payload.medicationPlanState,
      psychotherapyPlan: payload.psychotherapyPlan,
      complementaryTherapies: payload.complementaryTherapies,
      weitereTherapie: payload.weitereTherapie,
      activeVariantIds: payload.activeVariantIds,
    },
    verlaufFeed: loadVerlaufFeed(caseId),
    laborBefunde: loadBefunde(caseId),
    befundRecords: loadDiagnostikBefunde(caseId),
    sozialtherapie: loadSozialtherapie(caseId),
    dokumente: loadDokumente(caseId),
    generatedDocuments,
    calendarItems,
    modulePlaceholders: template.modulePlaceholders,
    aiTherapyDemo: {
      combinationCheck: loadCombinationCheckStore(caseId),
      labMedCorrelation: loadLabMedCorrelationStore(caseId),
      prepAiCheck: loadPrepAiCheckCache(caseId),
    },
  }
}
