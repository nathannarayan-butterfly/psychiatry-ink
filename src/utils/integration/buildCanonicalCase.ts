/**
 * Build canonical clinical snapshot from decrypted local vault (browser only).
 */

import { NOTION_PAGES } from '../../components/notion/notionPages'
import type {
  AnamnesisDocument,
  CanonicalCaseSnapshot,
  ClinicalCase,
  ClinicalCourseEntry,
  DiagnosisItem,
  Encounter,
  LabResult,
  MedicationItem,
  MedicationPlan,
  MentalStatusExam,
  PatientProfile,
  TherapyPlan,
} from '../../types/integration/canonicalClinical'
import type { MedicationPlanState } from '../../types/medicationPlan'
import { loadPatientMetadata } from '../cryptoVault'
import {
  collectClinicalPayload,
  loadEncryptedWorkspace,
  type ClinicalWorkspacePayload,
} from '../workspaceVault'

export interface BuildCanonicalCaseOptions {
  caseId: string
  displayTitle?: string
  includePatientIdentity?: boolean
}

function mapDiagnoses(payload: ClinicalWorkspacePayload): DiagnosisItem[] {
  return (payload.diagnoses ?? []).map((entry) => ({
    id: entry.id,
    icd10Code: entry.icd10.code || undefined,
    icd10Label: entry.icd10.label || undefined,
    icd11Code: entry.icd11.code || undefined,
    icd11Label: entry.icd11.label || undefined,
    dsmCode: entry.dsm.code || undefined,
    dsmLabel: entry.dsm.label || undefined,
    status: 'active' as const,
  }))
}

function mapMedicationPlan(payload: ClinicalWorkspacePayload): MedicationPlan | undefined {
  const state: MedicationPlanState | undefined = payload.medicationPlanState
  if (!state) return undefined

  const currentPlan =
    state.plans.find((plan) => plan.id === state.currentPlanId) ??
    state.plans.find((plan) => plan.isCurrent) ??
    state.plans[0]

  const items: MedicationItem[] = (currentPlan?.medications ?? []).map((med) => ({
    id: med.id,
    name: med.substance,
    dose: med.doseLineGerman || med.strength || undefined,
    frequency: med.prn ? 'PRN' : undefined,
    route: med.formulation || undefined,
    status: med.status === 'discontinued' ? 'stopped' : med.status === 'paused' ? 'on-hold' : 'active',
    notes: med.indication || med.freeTextLine || undefined,
  }))

  const sideEffects = (state.sideEffectReports ?? []).map((se) => ({
    id: se.id,
    medicationId: se.suspectedMedicationId || undefined,
    description: se.symptom,
    severity: se.severity as 'mild' | 'moderate' | 'severe' | undefined,
    reportedAt: se.onsetDate || undefined,
  }))

  return {
    caseId: '',
    items,
    sideEffects,
    updatedAt: state.updatedAt,
  }
}

function mapAnamnesisDocuments(
  caseId: string,
  payload: ClinicalWorkspacePayload,
): AnamnesisDocument[] {
  const docs: AnamnesisDocument[] = []
  for (const page of NOTION_PAGES) {
    const snapshot = payload.documents[page.id]
    if (!snapshot?.sectionContents) continue
    const content = Object.values(snapshot.sectionContents)
      .filter(Boolean)
      .join('\n\n')
      .trim()
    if (!content) continue
    docs.push({
      id: `${caseId}:${page.id}`,
      caseId,
      pageId: page.id,
      title: payload.pageHeadings[page.id] || page.id,
      content,
      updatedAt: payload.updatedAt,
    })
  }
  return docs
}

function mapLabResults(caseId: string, payload: ClinicalWorkspacePayload): LabResult[] {
  const results: LabResult[] = []
  for (const graph of payload.labGraphs ?? []) {
    for (const entry of graph.entries ?? []) {
      results.push({
        id: entry.id,
        caseId,
        name: entry.parameter || graph.title || 'Laborwert',
        value: entry.value != null ? String(entry.value) : undefined,
        unit: entry.unit || undefined,
        referenceRange:
          entry.referenceLow != null || entry.referenceHigh != null
            ? `${entry.referenceLow ?? '–'} – ${entry.referenceHigh ?? '–'}`
            : undefined,
        observedAt: entry.date || undefined,
        graphId: graph.id,
      })
    }
  }
  return results
}

function mapClinicalCourse(caseId: string, payload: ClinicalWorkspacePayload): ClinicalCourseEntry[] {
  const entries: ClinicalCourseEntry[] = []
  for (const timeline of payload.timelines ?? []) {
    for (const entry of timeline.entries ?? []) {
      entries.push({
        id: entry.id,
        caseId,
        date: entry.displayDate || entry.dateValue || undefined,
        summary: [entry.heading, entry.subheading].filter(Boolean).join(' — '),
        source: timeline.title || undefined,
      })
    }
  }
  return entries
}

function mapMentalStatusExam(caseId: string, payload: ClinicalWorkspacePayload): MentalStatusExam | undefined {
  const psychopath = payload.documents.psychopath?.sectionContents
  if (!psychopath || Object.keys(psychopath).length === 0) return undefined
  return {
    caseId,
    pageId: 'psychopath',
    sections: psychopath,
    updatedAt: payload.updatedAt,
  }
}

function mapTherapyPlan(caseId: string, payload: ClinicalWorkspacePayload): TherapyPlan | undefined {
  const psychotherapy = payload.psychotherapyPlan
  const complementary = payload.complementaryTherapies
  const weitere = payload.weitereTherapie
  if (!psychotherapy && !complementary?.length && !weitere?.length) return undefined

  const goals = psychotherapy
    ? [
        ...psychotherapy.goals.shortTerm.map((g) => g.text),
        ...psychotherapy.goals.mediumTerm.map((g) => g.text),
        ...psychotherapy.goals.longTerm.map((g) => g.text),
      ].filter(Boolean)
    : undefined

  return {
    caseId,
    modality: psychotherapy?.methods?.find((m) => m.selected)?.methodId || psychotherapy?.methods?.[0]?.methodId || undefined,
    goals,
    complementaryTherapies: [
      ...(complementary?.map((t) => t.name).filter(Boolean) ?? []),
      ...(weitere?.map((t) => t.type).filter(Boolean) ?? []),
    ],
    updatedAt: psychotherapy?.updatedAt,
  }
}

function buildEncounter(caseId: string, payload: ClinicalWorkspacePayload): Encounter {
  return {
    id: `${caseId}:primary`,
    caseId,
    status: 'in-progress',
    type: payload.selectedDocumentType || undefined,
    periodStart: payload.pageDates.anamnese || payload.updatedAt,
    note: payload.pageHeadings.anamnese || undefined,
  }
}

async function resolvePatientProfile(
  caseId: string,
  payload: ClinicalWorkspacePayload,
  includeIdentity: boolean,
): Promise<PatientProfile | undefined> {
  const profile: PatientProfile = {
    caseId,
    age: payload.age || undefined,
  }

  if (includeIdentity) {
    const patientVault = await loadPatientMetadata(caseId)
    if (patientVault?.metadata) {
      profile.name = patientVault.metadata.name || undefined
      profile.geburtsdatum = patientVault.metadata.geburtsdatum || undefined
    }
  }

  return profile
}

export async function buildCanonicalCaseSnapshot(
  options: BuildCanonicalCaseOptions,
): Promise<CanonicalCaseSnapshot> {
  const { caseId, displayTitle, includePatientIdentity = false } = options

  const loaded = await loadEncryptedWorkspace(caseId)
  const payload = loaded?.payload ?? collectClinicalPayload(undefined, caseId)

  const patient = await resolvePatientProfile(caseId, payload, includePatientIdentity)

  const clinicalCase: ClinicalCase = {
    caseId,
    displayTitle: displayTitle || payload.pageHeadings.anamnese || caseId,
    documentTypeId: payload.selectedDocumentType,
    updatedAt: payload.updatedAt,
    patient,
  }

  const medicationPlan = mapMedicationPlan(payload)
  if (medicationPlan) medicationPlan.caseId = caseId

  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    case: clinicalCase,
    encounters: [buildEncounter(caseId, payload)],
    anamnesisDocuments: mapAnamnesisDocuments(caseId, payload),
    clinicalCourse: mapClinicalCourse(caseId, payload),
    mentalStatusExam: mapMentalStatusExam(caseId, payload),
    diagnoses: mapDiagnoses(payload),
    medicationPlan,
    labResults: mapLabResults(caseId, payload),
    therapyPlan: mapTherapyPlan(caseId, payload),
    arztbriefDocuments: [],
    customDocuments: [],
    consultationRequests: [],
    consultationReports: [],
  }
}

export async function buildCanonicalCaseFromPayload(
  caseId: string,
  payload: ClinicalWorkspacePayload,
  options?: { displayTitle?: string; includePatientIdentity?: boolean },
): Promise<CanonicalCaseSnapshot> {
  const patient = await resolvePatientProfile(
    caseId,
    payload,
    options?.includePatientIdentity ?? false,
  )

  const medicationPlan = mapMedicationPlan(payload)
  if (medicationPlan) medicationPlan.caseId = caseId

  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    case: {
      caseId,
      displayTitle: options?.displayTitle || payload.pageHeadings.anamnese || caseId,
      documentTypeId: payload.selectedDocumentType,
      updatedAt: payload.updatedAt,
      patient,
    },
    encounters: [buildEncounter(caseId, payload)],
    anamnesisDocuments: mapAnamnesisDocuments(caseId, payload),
    clinicalCourse: mapClinicalCourse(caseId, payload),
    mentalStatusExam: mapMentalStatusExam(caseId, payload),
    diagnoses: mapDiagnoses(payload),
    medicationPlan,
    labResults: mapLabResults(caseId, payload),
    therapyPlan: mapTherapyPlan(caseId, payload),
    arztbriefDocuments: [],
    customDocuments: [],
    consultationRequests: [],
    consultationReports: [],
  }
}
