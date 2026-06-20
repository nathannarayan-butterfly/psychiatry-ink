/**
 * Encrypted workspace vault — clinical data only (syncable ciphertext).
 *
 * Includes: document snapshots, page headings, page dates, lab graphs, timelines.
 * Excludes: patient name and date of birth (local-only per case in cryptoVault patient vault).
 * Includes: age (encrypted in clinical bundle — not an identifier alone).
 * Never sent to AI — decrypt only in browser.
 */

import { NOTION_PAGES } from '../components/notion/notionPages'
import type { SavedLabGraph } from '../types/lab'
import type { SavedTimeline, TimelineSnapshot } from '../types/timeline'
import type { LabSnapshot } from '../types/lab'
import {
  decryptJsonPayload,
  encryptJsonPayload,
  getWorkspaceVaultBlob,
  parseVaultBlob,
  saveWorkspaceVaultBlob,
  serializeVaultBlob,
  type EncryptedVaultBlob,
} from './cryptoVault'
import { getActiveCaseId } from './caseContext'
import {
  getActiveLabGraphId,
  loadLabGraphsList,
  saveLabGraphsList,
  setActiveLabGraphId,
} from './labPersistence'
import {
  loadNotionDocumentSnapshot,
  removeNotionDocumentSnapshot,
  saveNotionDocumentSnapshot,
  type NotionDocumentSnapshot,
} from './notionDocumentActions'
import { applyPageDates, loadAllPageDates } from './notionPageDate'
import { applyPageTimes, loadAllPageTimes } from './notionPageTime'
import { loadNotionPageHeading, saveNotionPageHeading } from './notionPageHeading'
import {
  getActiveTimelineId,
  loadTimelinesList,
  saveTimelinesList,
  setActiveTimelineId,
} from './timelinePersistence'
import { loadDiagnosen, saveDiagnosen, type DiagnoseEntry } from './diagnosenArchive'
import {
  applyClinicalImprintIndex,
  loadClinicalImprintIndex,
  reindexClinicalPayload,
} from './clinicalImprint'
import type { ClinicalImprintIndex } from '../types/clinicalImprint'
import type { IsdmClinicalAnalysis, IsdmInputState } from '../types/isdm'
import { applyIsdmAnalysis, applyIsdmInput, loadIsdmAnalysis, loadIsdmInput } from './isdm'
import {
  applyAttestationState,
  loadAttestationState,
  type ClinicianAttestationState,
} from './butterfly/attestationStorage'
import {
  applyClinicalQuestionNoteState,
  loadClinicalQuestionNoteState,
  type ClinicalQuestionNoteState,
} from './clinicalQuestions/answerNotes'
import {
  applyMedicationPlanState,
  loadMedicationPlanState,
} from './medication/storage'
import type { MedicationPlanState } from '../types/medicationPlan'
import {
  applyPsychotherapyPlan,
  loadPsychotherapyPlan,
} from './psychotherapy/storage'
import {
  applyPsychopathFindingState,
  loadPsychopathFindingState,
  shouldPersistPsychopathFindingState,
} from './overview/psychopathFindingStorage'
import type { PsychotherapyPlan } from '../types/psychotherapy'
import type { PsychopathFindingState } from '../types/psychopathFinding'
import {
  applyComplementaryTherapies,
  loadComplementaryTherapies,
} from './complementaryTherapy/storage'
import type { ComplementaryTherapy } from '../types/complementaryTherapy'
import {
  applyWeitereTherapie,
  loadWeitereTherapie,
} from './weitereTherapie/storage'
import type { WeitereTherapie } from '../types/weitereTherapie'
import type { Anforderung } from '../types/anforderung'
import {
  applyAnforderungen,
  loadAnforderungen,
} from './anforderungen/storage'
import {
  applyVerlaufstendenzState,
  loadVerlaufstendenzState,
  shouldPersistVerlaufstendenzState,
} from './verlaufstendenz/storage'
import type { VerlaufstendenzState } from '../types/verlaufstendenz'

export const WORKSPACE_PAYLOAD_VERSION = 10

export const LAST_VAULT_EXPORT_KEY = 'psychiatry-ink:last-vault-export-at'

export const BACKUP_REMINDER_MS = 7 * 24 * 60 * 60 * 1000

export interface WorkspaceLivePatch {
  documentTypeId: string
  pageHeading: string
  pageDate?: string
  pageTime?: string
  sectionContents: Record<string, string>
  activeVariantIds?: Record<string, string>
  age?: string
  timelines?: SavedTimeline[]
  activeTimelineId?: string | null
  labGraphs?: SavedLabGraph[]
  activeLabGraphId?: string | null
  /** @deprecated v1 — migrated on read */
  lab?: LabSnapshot | null
  /** @deprecated v1 — migrated on read */
  timeline?: TimelineSnapshot | null
}

/**
 * Clinical workspace payload — safe for DB sync (no name/DOB; age inside ciphertext).
 *
 * Analysis layers:
 * - Layer 1 Ingestion: `clinicalImprints`
 * - Layer 2 Profiles: `isdmAnalysis`, `isdmInput`, `medicationPlanState`
 * - Layer 3 Future: Butterfly consumer (not stored here yet)
 */
export interface ClinicalWorkspacePayload {
  version: number
  updatedAt: string
  selectedDocumentType: string | null
  /** Structured age field — encrypted in sync blob; excluded from AI prompts by default. */
  age: string
  documents: Record<string, NotionDocumentSnapshot>
  pageHeadings: Record<string, string>
  pageDates: Record<string, string>
  pageTimes: Record<string, string>
  timelines: SavedTimeline[]
  activeTimelineId: string | null
  labGraphs: SavedLabGraph[]
  activeLabGraphId: string | null
  /** Diagnoses are part of the clinical case file (synced with workspace ciphertext). */
  diagnoses: DiagnoseEntry[]
  /** Layer 1 — universal clinical imprint index (ingestion). */
  clinicalImprints?: ClinicalImprintIndex
  /** Layer 2a — ISDM V.1 diagnostic mapping profile (subset of analysis, not the whole system). */
  isdmAnalysis?: IsdmClinicalAnalysis
  /** Layer 2a — ISDM phenomenology domain input (clinician-entered). */
  isdmInput?: IsdmInputState
  /** Layer 2a — Butterfly clinician attestations (criterionId → met/not_met). */
  butterflyAttestations?: ClinicianAttestationState
  /**
   * Layer 2a — clinical-question finding notes (PHI free text answered against
   * suggested questions). Vault-only by design; absent on older payloads.
   */
  clinicalQuestionNotes?: ClinicalQuestionNoteState
  /** Layer 2b — medication intelligence profile (plan, side effects, lab correlation). */
  medicationPlanState?: MedicationPlanState
  /** Layer 2c — psychotherapy plan & session documentation (v8+; defaults absent on older payloads). */
  psychotherapyPlan?: PsychotherapyPlan
  /** Overview psychopathological finding — current + history (v10+). */
  psychopathFindings?: PsychopathFindingState
  /** Overview Verlaufstendenz — draft + clinician-approved override (v10+). */
  verlaufstendenz?: VerlaufstendenzState
  /** Layer 2d — complementary therapies (additive; absent on older payloads, falls back to localStorage). */
  complementaryTherapies?: ComplementaryTherapy[]
  /** Layer 2e — weitere Therapieverfahren / neurostimulation (additive; absent on older payloads). */
  weitereTherapie?: WeitereTherapie[]
  /** Layer 2f — clinical orders / requisitions (Anforderungen; v10+). */
  anforderungen?: Anforderung[]
  /** Per-document variant selection (e.g. psychopath sub-mode). */
  activeVariantIds?: Record<string, string>
  /** @deprecated v1 — stripped on write */
  lab?: LabSnapshot | null
  /** @deprecated v1 — stripped on write */
  timeline?: TimelineSnapshot | null
}

/** @deprecated Legacy field — stripped on import; never written to new payloads. */
interface LegacyWorkspacePayload extends ClinicalWorkspacePayload {
  patientMetadata?: { name?: string; age?: string; updatedAt?: string } | null
}

export type WorkspacePayload = ClinicalWorkspacePayload

const DOCUMENT_TYPE_IDS = NOTION_PAGES.filter((page) => page.documentTypeId).map(
  (page) => page.documentTypeId!,
)

function snapshotToSavedTimeline(snapshot: TimelineSnapshot, title: string): SavedTimeline {
  return {
    id: crypto.randomUUID(),
    title,
    layout: snapshot.layout,
    entries: snapshot.entries,
    updatedAt: new Date().toISOString(),
  }
}

function snapshotToSavedLabGraph(snapshot: LabSnapshot, title: string): SavedLabGraph {
  return {
    id: crypto.randomUUID(),
    title,
    entries: snapshot.entries,
    markers: snapshot.markers,
    selectedParameter: snapshot.selectedParameter,
    dateRangePreset: snapshot.dateRangePreset,
    updatedAt: new Date().toISOString(),
  }
}

function migrateV1GraphFields(payload: ClinicalWorkspacePayload): ClinicalWorkspacePayload {
  let timelines = payload.timelines ?? []
  let activeTimelineId = payload.activeTimelineId ?? null
  let labGraphs = payload.labGraphs ?? []
  let activeLabGraphId = payload.activeLabGraphId ?? null

  if (timelines.length === 0 && payload.timeline) {
    const migrated = snapshotToSavedTimeline(payload.timeline, 'Timeline 1')
    timelines = [migrated]
    activeTimelineId = migrated.id
  }

  if (labGraphs.length === 0 && payload.lab) {
    const migrated = snapshotToSavedLabGraph(payload.lab, 'Labor 1')
    labGraphs = [migrated]
    activeLabGraphId = migrated.id
  }

  return {
    ...payload,
    version: WORKSPACE_PAYLOAD_VERSION,
    pageDates: payload.pageDates ?? {},
    pageTimes: payload.pageTimes ?? {},
    timelines,
    activeTimelineId,
    labGraphs,
    activeLabGraphId,
    diagnoses: payload.diagnoses ?? [],
    clinicalImprints: payload.clinicalImprints,
    lab: undefined,
    timeline: undefined,
  }
}

export function collectClinicalPayload(
  live?: WorkspaceLivePatch,
  caseId?: string,
): ClinicalWorkspacePayload {
  const documents: Record<string, NotionDocumentSnapshot> = {}

  for (const documentTypeId of DOCUMENT_TYPE_IDS) {
    const stored = loadNotionDocumentSnapshot(documentTypeId, caseId)
    if (live?.documentTypeId === documentTypeId) {
      documents[documentTypeId] = {
        documentTypeId,
        pageHeading: live.pageHeading,
        sectionContents: { ...live.sectionContents },
        savedAt: new Date().toISOString(),
      }
    } else if (stored) {
      documents[documentTypeId] = stored
    }
  }

  const pageHeadings: Record<string, string> = {}
  for (const documentTypeId of DOCUMENT_TYPE_IDS) {
    const heading =
      live?.documentTypeId === documentTypeId
        ? live.pageHeading
        : loadNotionPageHeading(documentTypeId, caseId)
    if (heading.trim()) pageHeadings[documentTypeId] = heading
  }

  const pageDates = loadAllPageDates(caseId)
  const pageTimes = loadAllPageTimes(caseId)
  if (live?.documentTypeId) {
    const pageId = NOTION_PAGES.find((p) => p.documentTypeId === live.documentTypeId)?.id
    if (pageId) {
      if (live.pageDate !== undefined) {
        if (live.pageDate.trim()) pageDates[pageId] = live.pageDate
        else delete pageDates[pageId]
      }
      if (live.pageTime !== undefined) {
        if (live.pageTime.trim()) pageTimes[pageId] = live.pageTime
        else delete pageTimes[pageId]
      }
    }
  }

  const timelines = live?.timelines ?? loadTimelinesList(caseId)
  const activeTimelineId = live?.activeTimelineId ?? getActiveTimelineId(caseId)
  const labGraphs = live?.labGraphs ?? loadLabGraphsList(caseId)
  const activeLabGraphId = live?.activeLabGraphId ?? getActiveLabGraphId(caseId)
  const storageCaseId = caseId ?? getActiveCaseId()
  const diagnoses = loadDiagnosen(storageCaseId)
  const clinicalImprints = loadClinicalImprintIndex(storageCaseId)
  const isdmAnalysis = loadIsdmAnalysis(storageCaseId) ?? undefined
  const isdmInput = loadIsdmInput(storageCaseId) ?? undefined
  const butterflyAttestationState = loadAttestationState(storageCaseId)
  const butterflyAttestations = Object.keys(butterflyAttestationState).length
    ? butterflyAttestationState
    : undefined
  const questionNoteState = loadClinicalQuestionNoteState(storageCaseId)
  const clinicalQuestionNotes = Object.keys(questionNoteState).length ? questionNoteState : undefined
  const medicationPlanState = loadMedicationPlanState(storageCaseId) ?? undefined
  const psychotherapyPlan = loadPsychotherapyPlan(storageCaseId) ?? undefined
  const psychopathFindings = loadPsychopathFindingState(storageCaseId)
  const verlaufstendenz = loadVerlaufstendenzState(storageCaseId)
  const complementaryTherapies = loadComplementaryTherapies(storageCaseId)
  const weitereTherapie = loadWeitereTherapie(storageCaseId)
  const anforderungen = loadAnforderungen(storageCaseId)

  return {
    version: WORKSPACE_PAYLOAD_VERSION,
    updatedAt: new Date().toISOString(),
    selectedDocumentType: live?.documentTypeId ?? null,
    age: live?.age ?? '',
    documents,
    pageHeadings,
    pageDates,
    pageTimes,
    timelines,
    activeTimelineId,
    labGraphs,
    activeLabGraphId,
    diagnoses,
    clinicalImprints,
    isdmAnalysis,
    isdmInput,
    butterflyAttestations,
    clinicalQuestionNotes,
    medicationPlanState,
    psychotherapyPlan,
    psychopathFindings: shouldPersistPsychopathFindingState(psychopathFindings)
      ? psychopathFindings
      : undefined,
    verlaufstendenz: shouldPersistVerlaufstendenzState(verlaufstendenz) ? verlaufstendenz : undefined,
    complementaryTherapies: complementaryTherapies.length ? complementaryTherapies : undefined,
    weitereTherapie: weitereTherapie.length ? weitereTherapie : undefined,
    anforderungen: anforderungen.length ? anforderungen : undefined,
    activeVariantIds: live?.activeVariantIds,
  }
}

export function applyClinicalPayload(
  payload: ClinicalWorkspacePayload,
  caseId?: string,
): void {
  const normalized = migrateV1GraphFields(payload)

  for (const documentTypeId of DOCUMENT_TYPE_IDS) {
    const snapshot = normalized.documents[documentTypeId]
    if (snapshot) {
      saveNotionDocumentSnapshot(snapshot, caseId)
    } else {
      removeNotionDocumentSnapshot(documentTypeId, caseId)
    }

    const heading = normalized.pageHeadings[documentTypeId] ?? snapshot?.pageHeading ?? ''
    saveNotionPageHeading(documentTypeId, heading, caseId)
  }

  applyPageDates(normalized.pageDates, caseId)
  applyPageTimes(normalized.pageTimes, caseId)

  const storageCaseId = caseId ?? getActiveCaseId()

  saveTimelinesList(normalized.timelines, storageCaseId)
  setActiveTimelineId(normalized.activeTimelineId, storageCaseId)

  saveLabGraphsList(normalized.labGraphs, storageCaseId)
  setActiveLabGraphId(normalized.activeLabGraphId, storageCaseId)

  if (Array.isArray(normalized.diagnoses)) {
    saveDiagnosen(storageCaseId, normalized.diagnoses)
  }

  if (normalized.clinicalImprints?.imprints?.length) {
    applyClinicalImprintIndex(normalized.clinicalImprints, storageCaseId)
  } else {
    const rebuilt = reindexClinicalPayload(storageCaseId, normalized)
    normalized.clinicalImprints = rebuilt
  }

  if (normalized.isdmAnalysis) {
    applyIsdmAnalysis(normalized.isdmAnalysis, storageCaseId)
  } else {
    void import('./isdm').then(({ scheduleIsdmRebuild }) => {
      scheduleIsdmRebuild(storageCaseId, 'vault')
    })
  }

  if (normalized.isdmInput) {
    applyIsdmInput(normalized.isdmInput, storageCaseId)
    void import('./isdm').then(({ scheduleIsdmRebuild }) => {
      scheduleIsdmRebuild(storageCaseId, 'input')
    })
  }

  if (normalized.butterflyAttestations) {
    applyAttestationState(normalized.butterflyAttestations, storageCaseId)
    void import('./isdm').then(({ scheduleIsdmRebuild }) => {
      scheduleIsdmRebuild(storageCaseId, 'attestation')
    })
  }

  if (normalized.clinicalQuestionNotes) {
    applyClinicalQuestionNoteState(normalized.clinicalQuestionNotes, storageCaseId)
  }

  if (normalized.medicationPlanState) {
    applyMedicationPlanState(normalized.medicationPlanState, storageCaseId)
  }

  if (normalized.psychotherapyPlan) {
    applyPsychotherapyPlan(normalized.psychotherapyPlan, storageCaseId)
  }

  if (normalized.psychopathFindings) {
    applyPsychopathFindingState(normalized.psychopathFindings, storageCaseId)
  }

  if (normalized.verlaufstendenz) {
    applyVerlaufstendenzState(normalized.verlaufstendenz, storageCaseId)
  }

  if (normalized.complementaryTherapies) {
    applyComplementaryTherapies(normalized.complementaryTherapies, storageCaseId)
  }

  if (normalized.weitereTherapie) {
    applyWeitereTherapie(normalized.weitereTherapie, storageCaseId)
  }

  if (normalized.anforderungen) {
    applyAnforderungen(normalized.anforderungen, storageCaseId)
  }
}

/** Strips legacy patient metadata from older vault files; never applies name/age from sync. */
export async function applyWorkspacePayloadAsync(
  payload: ClinicalWorkspacePayload,
  caseId?: string,
): Promise<void> {
  applyClinicalPayload(payload, caseId)
}

function stripLegacyFields(raw: LegacyWorkspacePayload): ClinicalWorkspacePayload {
  const { patientMetadata: legacy, lab, timeline, ...clinical } = raw
  const age =
    clinical.age?.trim() ||
    legacy?.age?.trim() ||
    ''
  const migrated = migrateV1GraphFields({
    ...clinical,
    age,
    pageDates: clinical.pageDates ?? {},
    pageTimes: clinical.pageTimes ?? {},
    timelines: clinical.timelines ?? [],
    activeTimelineId: clinical.activeTimelineId ?? null,
    labGraphs: clinical.labGraphs ?? [],
    activeLabGraphId: clinical.activeLabGraphId ?? null,
    diagnoses: clinical.diagnoses ?? [],
    lab: lab ?? null,
    timeline: timeline ?? null,
  })
  return migrated
}

export async function encryptWorkspacePayload(
  payload: ClinicalWorkspacePayload,
): Promise<EncryptedVaultBlob> {
  const toEncrypt = clinicalPayloadForEncryption(payload)
  return encryptJsonPayload(toEncrypt)
}

/** Normalized clinical payload for org case-key encryption (no user RSA wrap). */
export function clinicalPayloadForEncryption(
  payload: ClinicalWorkspacePayload,
): Omit<ClinicalWorkspacePayload, 'lab' | 'timeline'> {
  const normalized = migrateV1GraphFields(payload)
  const { lab: _lab, timeline: _timeline, ...toEncrypt } = normalized
  return toEncrypt
}

export async function decryptWorkspaceBlob(blob: EncryptedVaultBlob): Promise<ClinicalWorkspacePayload> {
  const raw = await decryptJsonPayload<LegacyWorkspacePayload>(blob)
  const payload = stripLegacyFields(raw)
  if (typeof payload.version !== 'number' || typeof payload.updatedAt !== 'string') {
    throw new Error('Invalid workspace vault format')
  }
  return {
    ...payload,
    age: payload.age ?? '',
    diagnoses: payload.diagnoses ?? [],
    clinicalImprints: payload.clinicalImprints,
    isdmAnalysis: payload.isdmAnalysis,
    isdmInput: payload.isdmInput,
    butterflyAttestations: payload.butterflyAttestations,
    medicationPlanState: payload.medicationPlanState,
    psychotherapyPlan: payload.psychotherapyPlan,
    psychopathFindings: payload.psychopathFindings,
    verlaufstendenz: payload.verlaufstendenz,
    complementaryTherapies: payload.complementaryTherapies,
    weitereTherapie: payload.weitereTherapie,
    anforderungen: payload.anforderungen,
  }
}

export async function saveEncryptedWorkspace(
  live?: WorkspaceLivePatch,
  caseId?: string,
): Promise<EncryptedVaultBlob> {
  const payload = collectClinicalPayload(live, caseId)
  const blob = await encryptWorkspacePayload(payload)
  await saveWorkspaceVaultBlob(blob, caseId)
  return blob
}

export async function loadEncryptedWorkspace(caseId?: string): Promise<{
  blob: EncryptedVaultBlob
  payload: ClinicalWorkspacePayload
} | null> {
  const blob = await getWorkspaceVaultBlob(caseId)
  if (!blob) return null
  try {
    const payload = await decryptWorkspaceBlob(blob)
    return { blob, payload }
  } catch {
    return null
  }
}

export function downloadWorkspaceVaultFile(blob: EncryptedVaultBlob, filename = 'workspace-vault.json'): void {
  const content = serializeVaultBlob(blob)
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function parseWorkspaceVaultFile(json: string): EncryptedVaultBlob {
  return parseVaultBlob(json)
}

export function recordVaultExport(caseId?: string): void {
  try {
    const key = caseId ? `${LAST_VAULT_EXPORT_KEY}:${caseId}` : LAST_VAULT_EXPORT_KEY
    localStorage.setItem(key, new Date().toISOString())
  } catch {
    // ignore
  }
}

export function getLastVaultExportAt(caseId?: string): string | null {
  try {
    const key = caseId ? `${LAST_VAULT_EXPORT_KEY}:${caseId}` : LAST_VAULT_EXPORT_KEY
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function shouldShowBackupReminder(
  tierAllowsDb: boolean,
  hasDbSnapshot: boolean,
  hasAccountKeyBackup = false,
): boolean {
  if (hasAccountKeyBackup || hasDbSnapshot) return false

  const lastExport = getLastVaultExportAt()
  const exportStale =
    !lastExport || Date.now() - new Date(lastExport).getTime() > BACKUP_REMINDER_MS

  if (!exportStale) return false

  if (!tierAllowsDb) return true
  return true
}

/** Non-PHI hint for dashboard cards (document type label, not page heading). */
export function deriveTitleHint(
  payload: ClinicalWorkspacePayload,
  documentTypeLabel: (typeId: string) => string,
): string | null {
  const typeId = payload.selectedDocumentType
  if (!typeId) return null
  const label = documentTypeLabel(typeId).trim()
  return label || null
}
