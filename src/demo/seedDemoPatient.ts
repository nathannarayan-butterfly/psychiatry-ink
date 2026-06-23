import type { LocalCaseMeta } from '../hooks/useCaseRegistry'
import { upsertCaseMeta, getCaseMeta } from '../hooks/useCaseRegistry'
import { createPatientOnApi } from '../services/patientRegistryApi'
import { savePatientMetadata } from '../utils/cryptoVault'
import { applyClinicalPayload } from '../utils/workspaceVault'
import { saveEncryptedWorkspace } from '../utils/workspaceVault'
import { saveDiagnostikBefunde } from '../utils/befundArchive'
import { saveBefunde } from '../utils/laborArchive'
import { saveSozialtherapie } from '../utils/sozialtherapie/storage'
import { saveVerlaufFeed } from '../utils/verlaufFeed'
import { caseStorageKey } from '../utils/caseContext'
import type { DokumentEntry } from '../utils/dokumenteArchive'
import { saveGeneratedDocument } from '../utils/generatedDocumentsVault'
import { listLocalCalendarItems, type CalendarStorageScope } from '../utils/calendarStore'
import { saveCombinationCheckStore } from '../utils/combinationCheck/storage'
import { saveLabMedCorrelationStore } from '../utils/labMedicationCorrelation/storage'
import { applyPrepAiCheckCache } from '../utils/prepAiCheck/storage'
import { DEMO_CASE_ID } from './constants'
import { getEffectiveDemoSeedVersion } from './demoVersion'
import { isDemoSeedDataComplete } from './demoDataIntegrity'
import { loadDemoFixture } from './loadDemoFixture'
import { type DemoLocale, normalizeDemoLocale, uiLanguageToDemoLocale } from './demoLocale'
import { loadStoredUiLanguage } from '../utils/clinicalLanguage'
import { patchDemoUserState, loadDemoUserState } from './demoUserState'
import { validateDemoFixture } from './validateDemoFixture'
import type { DemoSeedCounts } from './types'
import { WORKSPACE_PAYLOAD_VERSION } from '../utils/workspaceVault'
import { ensureDemoClinicalIntelligenceForCase } from './ensureDemoClinicalIntelligence'
import { saveClinicalIntelligenceState } from '../utils/clinicalIntelligence/storage'

function replaceDokumenteArchive(caseId: string, entries: DokumentEntry[]): void {
  try {
    localStorage.setItem(caseStorageKey('psychiatry-ink:dokumenteArchive', caseId), JSON.stringify(entries))
  } catch {
    // ignore
  }
}

export interface SeedDemoPatientOptions {
  userId: string
  calendarScope?: CalendarStorageScope
  skipValidation?: boolean
  force?: boolean
  /** UI language for synthetic clinical copy; defaults to stored UI language. */
  locale?: DemoLocale
}

export interface SeedDemoPatientResult {
  ok: boolean
  caseId: string
  validationErrors?: string[]
  counts: DemoSeedCounts
}

function countSeed(fixture: ReturnType<typeof loadDemoFixture>): DemoSeedCounts {
  const ws = fixture.workspace
  return {
    documents: Object.keys(ws.documents).length,
    verlaufEntries: fixture.verlaufFeed.length,
    diagnoses: ws.diagnoses.length,
    labValues: ws.labGraphs[0]?.entries.length ?? 0,
    laborBefunde: fixture.laborBefunde.length,
    befundRecords: fixture.befundRecords.length,
    calendarItems: fixture.calendarItems.length,
    dokumente: fixture.dokumente.length,
    generatedDocuments: fixture.generatedDocuments.length,
    clinicalImprints: ws.clinicalImprints?.imprints.length ?? 0,
    medications: ws.medicationPlanState?.plans[0]?.medications.length ?? 0,
    psychotherapySessions: ws.psychotherapyPlan?.sessions.length ?? 0,
    complementaryTherapies: ws.complementaryTherapies?.length ?? 0,
    sozialtherapieTargets: fixture.sozialtherapie.length,
    anforderungen: ws.anforderungen?.length ?? 0,
    isdmDomains: ws.isdmInput ? Object.keys(ws.isdmInput.domains).length : 0,
    butterflyAttestations: ws.butterflyAttestations
      ? Object.keys(ws.butterflyAttestations).length
      : 0,
  }
}

async function persistCalendarDemoItems(
  scope: CalendarStorageScope,
  fixture: ReturnType<typeof loadDemoFixture>,
): Promise<void> {
  const existing = await listLocalCalendarItems(scope, {
    from: '2000-01-01T00:00:00.000Z',
    to: '2099-12-31T23:59:59.999Z',
  })
  const withoutDemo = existing.filter((item) => !item.id.startsWith('demo-cal-'))
  const merged = [...withoutDemo, ...fixture.calendarItems]
  const { calendarStorageKey } = await import('../utils/calendarStore')
  const { encryptJsonPayload } = await import('../utils/cryptoVault')
  const { safeSetItem } = await import('../utils/safeStorage')
  const blob = await encryptJsonPayload(merged)
  safeSetItem(calendarStorageKey(scope), JSON.stringify(blob))
}

function resolveDemoLocale(options: SeedDemoPatientOptions): DemoLocale {
  if (options.locale) return options.locale
  return uiLanguageToDemoLocale(loadStoredUiLanguage())
}

export async function seedDemoPatient(options: SeedDemoPatientOptions): Promise<SeedDemoPatientResult> {
  const locale = resolveDemoLocale(options)
  const fixture = loadDemoFixture(locale)
  const seedVersion = getEffectiveDemoSeedVersion()
  const validation = validateDemoFixture(fixture, { expectedSeedVersion: seedVersion })
  if (!options.skipValidation && !validation.ok) {
    return {
      ok: false,
      caseId: DEMO_CASE_ID,
      validationErrors: validation.errors.map((e) => e.message),
      counts: countSeed(fixture),
    }
  }

  const caseId = DEMO_CASE_ID
  const existing = getCaseMeta(caseId)
  const userState = loadDemoUserState(options.userId)
  const localeMatches = normalizeDemoLocale(userState.locale, locale) === locale
  const dataComplete = isDemoSeedDataComplete(caseId)
  if (existing?.isDemoPatient && !options.force && dataComplete && localeMatches) {
    ensureDemoClinicalIntelligenceForCase(caseId)
    const counts = countSeed(fixture)
    patchDemoUserState(options.userId, {
      status: 'installed',
      seedVersion,
      locale,
      installedAt: existing.createdAt,
    })
    return { ok: true, caseId, counts }
  }

  const now = new Date().toISOString()
  const meta: Partial<LocalCaseMeta> = {
    localVorname: fixture.patient.vorname,
    localNachname: fixture.patient.nachname,
    localName: `${fixture.patient.vorname} ${fixture.patient.nachname}`,
    localGeburtsdatum: fixture.patient.geburtsdatum,
    localGeschlecht: fixture.patient.geschlecht,
    localAge: fixture.patient.age,
    pageHeading: fixture.workspace.pageHeadings.aufnahme,
    lastDocumentType: 'aufnahme',
    lastOpened: now,
    createdAt: existing?.createdAt ?? now,
    isDemoPatient: true,
    demoSeedVersion: seedVersion,
    demoPatientId: fixture.demoPatientId,
  }

  upsertCaseMeta(caseId, meta)
  void createPatientOnApi({ caseId, ...meta, lastOpened: now, createdAt: meta.createdAt ?? now }).catch(() => {})

  await savePatientMetadata(
    {
      name: `${fixture.patient.vorname} ${fixture.patient.nachname}`,
      geburtsdatum: fixture.patient.geburtsdatum,
      updatedAt: now,
    },
    caseId,
  )

  const payload = {
    version: WORKSPACE_PAYLOAD_VERSION,
    updatedAt: now,
    selectedDocumentType: fixture.workspace.selectedDocumentType,
    age: fixture.workspace.age,
    documents: fixture.workspace.documents,
    pageHeadings: fixture.workspace.pageHeadings,
    pageDates: fixture.workspace.pageDates,
    pageTimes: fixture.workspace.pageTimes,
    timelines: fixture.workspace.timelines,
    activeTimelineId: fixture.workspace.activeTimelineId,
    labGraphs: fixture.workspace.labGraphs,
    activeLabGraphId: fixture.workspace.activeLabGraphId,
    diagnoses: fixture.workspace.diagnoses,
    clinicalImprints: fixture.workspace.clinicalImprints,
    isdmAnalysis: fixture.workspace.isdmAnalysis,
    isdmInput: fixture.workspace.isdmInput,
    butterflyAttestations: fixture.workspace.butterflyAttestations,
    clinicalQuestionNotes: fixture.workspace.clinicalQuestionNotes,
    anforderungen: fixture.workspace.anforderungen,
    medicationPlanState: fixture.workspace.medicationPlanState,
    psychotherapyPlan: fixture.workspace.psychotherapyPlan,
    complementaryTherapies: fixture.workspace.complementaryTherapies,
    weitereTherapie: fixture.workspace.weitereTherapie,
    activeVariantIds: fixture.workspace.activeVariantIds,
  }

  applyClinicalPayload(payload, caseId)
  await saveEncryptedWorkspace(undefined, caseId)

  saveVerlaufFeed(fixture.verlaufFeed, caseId)
  saveBefunde(caseId, fixture.laborBefunde)
  saveDiagnostikBefunde(caseId, fixture.befundRecords)
  saveSozialtherapie(fixture.sozialtherapie, caseId)
  replaceDokumenteArchive(caseId, fixture.dokumente)

  for (const doc of fixture.generatedDocuments) {
    await saveGeneratedDocument(caseId, doc)
  }

  if (options.calendarScope) {
    await persistCalendarDemoItems(options.calendarScope, fixture)
  }

  if (fixture.aiTherapyDemo) {
    saveCombinationCheckStore(fixture.aiTherapyDemo.combinationCheck)
    saveLabMedCorrelationStore(fixture.aiTherapyDemo.labMedCorrelation)
    applyPrepAiCheckCache(fixture.aiTherapyDemo.prepAiCheck, caseId)
  }

  if (fixture.clinicalIntelligence) {
    saveClinicalIntelligenceState(fixture.clinicalIntelligence)
  }

  patchDemoUserState(options.userId, {
    status: 'installed',
    seedVersion,
    locale,
    installedAt: now,
    archivedAt: undefined,
    removedAt: undefined,
  })

  return { ok: true, caseId, counts: countSeed(fixture) }
}
