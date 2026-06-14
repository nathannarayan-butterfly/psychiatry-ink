/**
 * Client-side Integration Hub — vault decrypt/encrypt stays in browser.
 * Server receives metadata, batch records, and audit events only.
 */

import type {
  CanonicalCaseSnapshot,
  CanonicalClinicalObjectType,
} from '../types/integration/canonicalClinical'
import type { IntegrationAdapterType } from '../types/integration/integrationHub'
import { mapFromFHIR, mapToFHIR, type FhirBundle } from '../utils/integration/adapters/fhirMapper'
import { mapFromHL7v2, mapToHL7v2 } from '../utils/integration/adapters/hl7v2Mapper'
import { buildCanonicalCaseSnapshot } from '../utils/integration/buildCanonicalCase'
import {
  countCanonicalSnapshot,
  filterSnapshotForExport,
  parseImportSnapshot,
  type ExportScopeFlags,
  type IntegrationMergeScope,
} from '../utils/integration/canonicalScope'
import { mergeCanonicalIntoVault } from '../utils/integration/mergeCanonicalCase'
import {
  fetchExternalSystemReferences,
  postIntegrationEvent,
  registerExportBatch,
  registerImportBatch,
} from './integrationApi'

export type { FhirBundle } from '../utils/integration/adapters/fhirMapper'
export { mapFromFHIR, mapToFHIR } from '../utils/integration/adapters/fhirMapper'
export { mapFromHL7v2, mapToHL7v2 } from '../utils/integration/adapters/hl7v2Mapper'

export interface ExportClinicalObjectOptions {
  adapterType?: IntegrationAdapterType
  includePatientIdentity?: boolean
  displayTitle?: string
  objectTypes?: CanonicalClinicalObjectType[]
  auditIncludePhi?: boolean
  exportScope?: ExportScopeFlags
}

export interface ImportClinicalObjectOptions {
  scope?: IntegrationMergeScope
}

export interface ImportClinicalObjectResult {
  snapshot: CanonicalCaseSnapshot
  mergedFields: string[]
  batchId?: string
}

function downloadBlob(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
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

export async function exportClinicalObject(
  type: CanonicalClinicalObjectType | 'case',
  caseId: string,
  options: ExportClinicalObjectOptions = {},
): Promise<{ snapshot: CanonicalCaseSnapshot; download?: { filename: string; mimeType: string; content: string } }> {
  const fullSnapshot = await buildCanonicalCaseSnapshot({
    caseId,
    displayTitle: options.displayTitle,
    includePatientIdentity: options.includePatientIdentity ?? false,
  })

  const snapshot = options.exportScope
    ? filterSnapshotForExport(fullSnapshot, {
        ...options.exportScope,
        patientProfile: options.exportScope.patientProfile || (options.includePatientIdentity ?? false),
      })
    : fullSnapshot

  const adapterType = options.adapterType ?? 'json'
  let content = ''
  let filename = `${caseId}-${type}.json`
  let mimeType = 'application/json'

  if (adapterType === 'fhir') {
    content = JSON.stringify(mapToFHIR(snapshot), null, 2)
    filename = `${caseId}-fhir-bundle.json`
  } else if (adapterType === 'hl7_v2') {
    content = mapToHL7v2(snapshot).raw
    filename = `${caseId}.hl7`
    mimeType = 'text/plain'
  } else {
    content = JSON.stringify(snapshot, null, 2)
  }

  await registerExportBatch({
    adapterType,
    caseId,
    objectTypes: options.objectTypes ?? [type],
    metadata: {
      includePatientIdentity: options.includePatientIdentity ?? false,
      objectType: type,
    },
  })

  await logIntegrationEvent({
    action: 'export_completed',
    adapterType,
    caseId,
    metadata: {
      objectType: type,
      includePatientIdentity: options.auditIncludePhi ? options.includePatientIdentity : undefined,
    },
  })

  return {
    snapshot,
    download: { filename, mimeType, content },
  }
}

export async function previewImportFile(
  file: File,
  adapterType: 'json' | 'csv' | 'fhir',
  targetCaseId: string,
): Promise<{ snapshot: CanonicalCaseSnapshot; counts: ReturnType<typeof countCanonicalSnapshot>; sourceCaseId?: string }> {
  const snapshot = await parseImportSnapshot(file, adapterType, targetCaseId)
  const sourceCaseId = snapshot.case.caseId
  return {
    snapshot,
    counts: countCanonicalSnapshot(snapshot),
    sourceCaseId: sourceCaseId && sourceCaseId !== targetCaseId ? sourceCaseId : undefined,
  }
}

export async function buildExportPreview(
  caseId: string,
  options: { displayTitle?: string; includePatientIdentity?: boolean; exportScope?: ExportScopeFlags },
): Promise<{ counts: ReturnType<typeof countCanonicalSnapshot>; snapshot: CanonicalCaseSnapshot }> {
  const snapshot = await buildCanonicalCaseSnapshot({
    caseId,
    displayTitle: options.displayTitle,
    includePatientIdentity: options.includePatientIdentity ?? false,
  })
  const scoped = options.exportScope
    ? filterSnapshotForExport(snapshot, {
        ...options.exportScope,
        patientProfile: options.exportScope.patientProfile || (options.includePatientIdentity ?? false),
      })
    : snapshot
  return { counts: countCanonicalSnapshot(scoped), snapshot: scoped }
}

export async function importClinicalObject(
  file: File,
  adapterType: IntegrationAdapterType,
  caseId: string,
  options: ImportClinicalObjectOptions = {},
): Promise<ImportClinicalObjectResult> {
  const text = await file.text()
  let snapshot: CanonicalCaseSnapshot

  if (adapterType === 'json') {
    const parsed = JSON.parse(text) as CanonicalCaseSnapshot | FhirBundle
    snapshot =
      parsed && typeof parsed === 'object' && (parsed as FhirBundle).resourceType === 'Bundle'
        ? mapFromFHIR(parsed as FhirBundle)
        : (parsed as CanonicalCaseSnapshot)
  } else if (adapterType === 'fhir') {
    snapshot = mapFromFHIR(JSON.parse(text) as FhirBundle)
  } else if (adapterType === 'hl7_v2') {
    snapshot = mapFromHL7v2(text)
  } else if (adapterType === 'csv') {
    snapshot = parseCsvToSnapshot(text, caseId)
  } else {
    throw new Error(`Import für Adapter ${adapterType} noch nicht implementiert`)
  }

  snapshot.case.caseId = caseId
  const { mergedFields } = await mergeCanonicalIntoVault(caseId, snapshot, options.scope ?? 'full')

  const batch = await registerImportBatch({
    adapterType,
    filename: file.name,
    recordCount: snapshot.diagnoses.length + snapshot.labResults.length,
    caseId,
    metadata: { mergedFields },
  })

  await logIntegrationEvent({
    action: 'import_completed',
    adapterType,
    caseId,
    metadata: { filename: file.name, mergedFields },
  })

  return { snapshot, mergedFields, batchId: batch.id }
}

export async function exportAsJSON(caseId: string, options?: ExportClinicalObjectOptions): Promise<void> {
  const result = await exportClinicalObject('case', caseId, { ...options, adapterType: 'json' })
  if (result.download) {
    downloadBlob(result.download.filename, result.download.content, result.download.mimeType)
  }
}

export async function exportAsFHIR(caseId: string, options?: ExportClinicalObjectOptions): Promise<void> {
  const result = await exportClinicalObject('case', caseId, { ...options, adapterType: 'fhir' })
  if (result.download) {
    downloadBlob(result.download.filename, result.download.content, result.download.mimeType)
  }
}

export async function exportAsPDFWithMetadata(
  caseId: string,
  options?: ExportClinicalObjectOptions,
): Promise<void> {
  const snapshot = await buildCanonicalCaseSnapshot({
    caseId,
    includePatientIdentity: options?.includePatientIdentity ?? false,
    displayTitle: options?.displayTitle,
  })

  const metadata = {
    title: snapshot.case.displayTitle ?? caseId,
    exportedAt: snapshot.exportedAt,
    schemaVersion: snapshot.schemaVersion,
    diagnosisCount: snapshot.diagnoses.length,
    documentCount: snapshot.anamnesisDocuments.length,
  }

  const printable = [
    `# ${metadata.title}`,
    `Exportiert: ${metadata.exportedAt}`,
    '',
    '## Diagnosen',
    ...snapshot.diagnoses.map((dx) => `- ${dx.icd10Code ?? ''} ${dx.icd10Label ?? ''}`.trim()),
    '',
    '## Dokumente',
    ...snapshot.anamnesisDocuments.map((doc) => `### ${doc.title ?? doc.pageId}\n${doc.content}`),
  ].join('\n')

  await registerExportBatch({
    adapterType: 'pdf',
    caseId,
    objectTypes: ['case'],
    metadata,
  })

  downloadBlob(`${caseId}-export.txt`, printable, 'text/plain')
}

export async function importFromJSON(
  file: File,
  caseId: string,
  options?: ImportClinicalObjectOptions,
): Promise<ImportClinicalObjectResult> {
  return importClinicalObject(file, 'json', caseId, options)
}

export async function importFromCSV(
  file: File,
  caseId: string,
  options?: ImportClinicalObjectOptions,
): Promise<ImportClinicalObjectResult> {
  return importClinicalObject(file, 'csv', caseId, options)
}

export { countCanonicalSnapshot, formatExportPreviewSummary, formatImportPreviewSummary } from '../utils/integration/canonicalScope'
export type { ExportScopeFlags, IntegrationMergeScope } from '../utils/integration/canonicalScope'

export async function logIntegrationEvent(input: {
  action: string
  adapterType?: IntegrationAdapterType | null
  caseId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  await postIntegrationEvent(input)
}

export async function resolveExternalSystemReference(query: {
  caseId?: string | null
  localObjectType?: string | null
  localObjectId?: string | null
  externalSystem?: string | null
  externalId?: string | null
}) {
  return fetchExternalSystemReferences(query)
}
