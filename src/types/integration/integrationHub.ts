export type IntegrationAdapterType = 'fhir' | 'hl7_v2' | 'cda' | 'pdf' | 'csv' | 'json'

export type IntegrationConnectionStatus = 'inactive' | 'active' | 'error' | 'disabled'

export type IntegrationBatchStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type IntegrationSyncDirection = 'import' | 'export' | 'bidirectional'

export type IntegrationSyncJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface IntegrationAdapter {
  id: string
  type: IntegrationAdapterType
  version: string
  capabilities: Record<string, unknown>
}

export interface IntegrationConnection {
  id: string
  organisationId: string
  adapterType: IntegrationAdapterType
  name: string
  status: IntegrationConnectionStatus
  config: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface IntegrationMapping {
  id: string
  connectionId: string
  sourceType: string
  targetType: string
  mappingRules: Record<string, unknown>
}

export interface IntegrationSyncJob {
  id: string
  connectionId: string
  direction: IntegrationSyncDirection
  status: IntegrationSyncJobStatus
  startedAt: string | null
  completedAt: string | null
  metadata: Record<string, unknown>
}

export interface IntegrationEventLogEntry {
  id: string
  organisationId: string
  userId: string | null
  action: string
  adapterType: IntegrationAdapterType | null
  caseId: string | null
  metadata: Record<string, unknown>
  ip: string | null
  createdAt: string
}

export interface ExternalSystemReference {
  id: string
  organisationId: string
  caseId: string
  localObjectType: string
  localObjectId: string
  externalSystem: string
  externalId: string
  metadata: Record<string, unknown>
}

export interface ImportBatch {
  id: string
  organisationId: string
  userId: string
  adapterType: IntegrationAdapterType
  filename: string | null
  status: IntegrationBatchStatus
  recordCount: number
  metadata: Record<string, unknown>
  createdAt: string
  completedAt: string | null
}

export interface ExportBatch {
  id: string
  organisationId: string
  userId: string
  adapterType: IntegrationAdapterType
  caseId: string | null
  objectTypes: string[]
  status: IntegrationBatchStatus
  metadata: Record<string, unknown>
  createdAt: string
  completedAt: string | null
}

export interface ClinicalObjectMapping {
  id: string
  batchId: string
  batchKind: 'import' | 'export'
  localType: string
  localId: string
  externalRef: string
  fhirResourceType: string | null
}

export interface TerminologyMapping {
  id: string
  system: string
  code: string
  display: string | null
  localCode: string
}

export interface IntegrationBatchHistoryItem {
  kind: 'import' | 'export'
  batch: ImportBatch | ExportBatch
}
