/**
 * Canonical import/export scope — counts, filtering, and German preview labels.
 */

import type { CanonicalCaseSnapshot } from '../../types/integration/canonicalClinical'
import type { FhirBundle } from './adapters/fhirMapper'
import { mapFromFHIR } from './adapters/fhirMapper'

export type IntegrationMergeScope = 'full' | 'labs_only' | 'diagnoses_only' | 'medications_only'

export interface ExportScopeFlags {
  patientProfile: boolean
  diagnoses: boolean
  medicationPlan: boolean
  labResults: boolean
  clinicalCourse: boolean
  documents: boolean
  therapy: boolean
  consultations: boolean
}

export const DEFAULT_EXPORT_SCOPE: ExportScopeFlags = {
  patientProfile: false,
  diagnoses: true,
  medicationPlan: true,
  labResults: true,
  clinicalCourse: true,
  documents: true,
  therapy: true,
  consultations: true,
}

export const LABS_ONLY_EXPORT_SCOPE: ExportScopeFlags = {
  patientProfile: false,
  diagnoses: false,
  medicationPlan: false,
  labResults: true,
  clinicalCourse: false,
  documents: false,
  therapy: false,
  consultations: false,
}

export type CanonicalSnapshotCounts = {
  patientProfile: number
  diagnoses: number
  medicationItems: number
  labResults: number
  clinicalCourse: number
  anamnesisDocuments: number
  arztbriefDocuments: number
  customDocuments: number
  therapyPlan: number
  consultationRequests: number
  consultationReports: number
}

export function countCanonicalSnapshot(snapshot: CanonicalCaseSnapshot): CanonicalSnapshotCounts {
  const hasPatient =
    Boolean(snapshot.case.patient?.name) ||
    Boolean(snapshot.case.patient?.geburtsdatum) ||
    Boolean(snapshot.case.patient?.age)

  return {
    patientProfile: hasPatient ? 1 : 0,
    diagnoses: snapshot.diagnoses.length,
    medicationItems: snapshot.medicationPlan?.items.length ?? 0,
    labResults: snapshot.labResults.length,
    clinicalCourse: snapshot.clinicalCourse.length,
    anamnesisDocuments: snapshot.anamnesisDocuments.length,
    arztbriefDocuments: snapshot.arztbriefDocuments.length,
    customDocuments: snapshot.customDocuments.length,
    therapyPlan: snapshot.therapyPlan ? 1 : 0,
    consultationRequests: snapshot.consultationRequests.length,
    consultationReports: snapshot.consultationReports.length,
  }
}

type PreviewPart = { key: string; count: number; label: string }

function buildPreviewParts(counts: CanonicalSnapshotCounts, scope?: ExportScopeFlags): PreviewPart[] {
  const parts: PreviewPart[] = []
  const include = (flag: boolean | undefined, count: number, label: string, key: string) => {
    if (flag === false || count <= 0) return
    parts.push({ key, count, label })
  }

  if (!scope || scope.patientProfile) {
    include(true, counts.patientProfile, 'Patientenprofil', 'patientProfile')
  }
  include(scope?.diagnoses ?? true, counts.diagnoses, 'Diagnosen', 'diagnoses')
  include(scope?.medicationPlan ?? true, counts.medicationItems, 'Medikamente', 'medications')
  include(scope?.labResults ?? true, counts.labResults, 'Laborwerte', 'labResults')
  include(scope?.clinicalCourse ?? true, counts.clinicalCourse, 'Verlaufseinträge', 'clinicalCourse')

  const docCount =
    (scope?.documents === false ? 0 : counts.anamnesisDocuments) +
    (scope?.documents === false ? 0 : counts.arztbriefDocuments) +
    (scope?.documents === false ? 0 : counts.customDocuments)
  include(scope?.documents ?? true, docCount, 'Dokumente', 'documents')

  include(scope?.therapy ?? true, counts.therapyPlan, 'Therapieplan', 'therapy')

  const konsilCount =
    (scope?.consultations === false ? 0 : counts.consultationRequests) +
    (scope?.consultations === false ? 0 : counts.consultationReports)
  include(scope?.consultations ?? true, konsilCount, 'Konsile', 'consultations')

  return parts
}

export function formatExportPreviewSummary(
  counts: CanonicalSnapshotCounts,
  scope?: ExportScopeFlags,
): string {
  const parts = buildPreviewParts(counts, scope)
  if (parts.length === 0) return 'Keine exportierbaren Daten im gewählten Umfang.'
  return `Exportiert: ${parts.map((p) => `${p.count} ${p.label}`).join(', ')}`
}

export function formatImportPreviewSummary(counts: CanonicalSnapshotCounts): string {
  const parts = buildPreviewParts(counts)
  if (parts.length === 0) return 'Die Datei enthält keine erkennbaren klinischen Daten.'
  return `Enthält: ${parts.map((p) => `${p.label} (${p.count})`).join(', ')}`
}

export function filterSnapshotForExport(
  snapshot: CanonicalCaseSnapshot,
  scope: ExportScopeFlags,
): CanonicalCaseSnapshot {
  const filtered: CanonicalCaseSnapshot = {
    ...snapshot,
    case: {
      ...snapshot.case,
      patient: scope.patientProfile ? snapshot.case.patient : undefined,
    },
    diagnoses: scope.diagnoses ? snapshot.diagnoses : [],
    medicationPlan: scope.medicationPlan ? snapshot.medicationPlan : undefined,
    labResults: scope.labResults ? snapshot.labResults : [],
    clinicalCourse: scope.clinicalCourse ? snapshot.clinicalCourse : [],
    anamnesisDocuments: scope.documents ? snapshot.anamnesisDocuments : [],
    arztbriefDocuments: scope.documents ? snapshot.arztbriefDocuments : [],
    customDocuments: scope.documents ? snapshot.customDocuments : [],
    therapyPlan: scope.therapy ? snapshot.therapyPlan : undefined,
    consultationRequests: scope.consultations ? snapshot.consultationRequests : [],
    consultationReports: scope.consultations ? snapshot.consultationReports : [],
    mentalStatusExam: scope.documents ? snapshot.mentalStatusExam : undefined,
    encounters: scope.clinicalCourse || scope.documents ? snapshot.encounters : [],
  }
  return filtered
}

function parseCsvToSnapshot(text: string, caseId: string): CanonicalCaseSnapshot {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const diagnoses = lines.slice(1).map((line, index) => {
    const [code, label] = line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''))
    return {
      id: `csv-${index}`,
      icd10Code: code || undefined,
      icd10Label: label || undefined,
      status: 'active' as const,
    }
  })

  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    case: { caseId, updatedAt: new Date().toISOString() },
    encounters: [],
    anamnesisDocuments: [],
    clinicalCourse: [],
    diagnoses,
    labResults: [],
    arztbriefDocuments: [],
    customDocuments: [],
    consultationRequests: [],
    consultationReports: [],
  }
}

export async function parseImportSnapshot(
  file: File,
  adapterType: 'json' | 'csv' | 'fhir',
  targetCaseId: string,
): Promise<CanonicalCaseSnapshot> {
  const text = await file.text()

  if (adapterType === 'csv') {
    return parseCsvToSnapshot(text, targetCaseId)
  }

  const parsed = JSON.parse(text) as CanonicalCaseSnapshot | FhirBundle
  if (parsed && typeof parsed === 'object' && (parsed as FhirBundle).resourceType === 'Bundle') {
    return mapFromFHIR(parsed as FhirBundle)
  }
  return parsed as CanonicalCaseSnapshot
}

export function filterSnapshotForMerge(
  snapshot: CanonicalCaseSnapshot,
  scope: IntegrationMergeScope,
): CanonicalCaseSnapshot {
  if (scope === 'full') return snapshot

  const empty: CanonicalCaseSnapshot = {
    schemaVersion: snapshot.schemaVersion,
    exportedAt: snapshot.exportedAt,
    case: snapshot.case,
    encounters: [],
    anamnesisDocuments: [],
    clinicalCourse: [],
    diagnoses: [],
    labResults: [],
    arztbriefDocuments: [],
    customDocuments: [],
    consultationRequests: [],
    consultationReports: [],
  }

  if (scope === 'labs_only') {
    return { ...empty, labResults: snapshot.labResults }
  }
  if (scope === 'diagnoses_only') {
    return { ...empty, diagnoses: snapshot.diagnoses }
  }
  if (scope === 'medications_only') {
    return { ...empty, medicationPlan: snapshot.medicationPlan }
  }
  return snapshot
}
