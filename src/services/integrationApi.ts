import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type {
  ExportBatch,
  ExternalSystemReference,
  ImportBatch,
  IntegrationAdapter,
  IntegrationAdapterType,
  IntegrationBatchHistoryItem,
  IntegrationConnection,
} from '../types/integration/integrationHub'

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  })
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const detail = (await response.json().catch(() => null)) as { error?: string } | null
  throw new Error(detail?.error ?? `${fallback} (${response.status})`)
}

export async function fetchIntegrationAdapters(): Promise<IntegrationAdapter[]> {
  const response = await apiFetch('/api/integration/adapters')
  if (!response.ok) await parseError(response, 'Failed to load adapters')
  const data = (await response.json()) as { adapters: IntegrationAdapter[] }
  return data.adapters ?? []
}

export async function fetchIntegrationConnections(): Promise<IntegrationConnection[]> {
  const response = await apiFetch('/api/integration/connections')
  if (!response.ok) await parseError(response, 'Failed to load connections')
  const data = (await response.json()) as { connections: IntegrationConnection[] }
  return data.connections ?? []
}

export async function saveIntegrationConnection(input: {
  adapterType: IntegrationAdapterType
  name: string
  config?: Record<string, unknown>
  enabled?: boolean
  connectionId?: string | null
}): Promise<IntegrationConnection> {
  const response = await apiFetch('/api/integration/connections', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'Failed to save connection')
  const data = (await response.json()) as { connection: IntegrationConnection }
  return data.connection
}

export async function fetchIntegrationBatches(limit = 50): Promise<IntegrationBatchHistoryItem[]> {
  const response = await apiFetch(`/api/integration/batches?limit=${encodeURIComponent(String(limit))}`)
  if (!response.ok) await parseError(response, 'Failed to load batch history')
  const data = (await response.json()) as { batches: IntegrationBatchHistoryItem[] }
  return data.batches ?? []
}

export async function registerImportBatch(input: {
  adapterType: IntegrationAdapterType
  filename?: string | null
  recordCount?: number
  caseId?: string | null
  metadata?: Record<string, unknown>
}): Promise<ImportBatch> {
  const response = await apiFetch('/api/integration/import-batches', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'Failed to register import batch')
  const data = (await response.json()) as { batch: ImportBatch }
  return data.batch
}

export async function registerExportBatch(input: {
  adapterType: IntegrationAdapterType
  caseId?: string | null
  objectTypes?: string[]
  metadata?: Record<string, unknown>
}): Promise<ExportBatch> {
  const response = await apiFetch('/api/integration/export-batches', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'Failed to register export batch')
  const data = (await response.json()) as { batch: ExportBatch }
  return data.batch
}

export async function postIntegrationEvent(input: {
  action: string
  adapterType?: IntegrationAdapterType | null
  caseId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const response = await apiFetch('/api/integration/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await parseError(response, 'Failed to log integration event')
}

export async function fetchExternalSystemReferences(query: {
  caseId?: string | null
  localObjectType?: string | null
  localObjectId?: string | null
  externalSystem?: string | null
  externalId?: string | null
}): Promise<ExternalSystemReference[]> {
  const params = new URLSearchParams()
  if (query.caseId) params.set('caseId', query.caseId)
  if (query.localObjectType) params.set('localObjectType', query.localObjectType)
  if (query.localObjectId) params.set('localObjectId', query.localObjectId)
  if (query.externalSystem) params.set('externalSystem', query.externalSystem)
  if (query.externalId) params.set('externalId', query.externalId)

  const response = await apiFetch(`/api/integration/external-refs?${params.toString()}`)
  if (!response.ok) await parseError(response, 'Failed to load external references')
  const data = (await response.json()) as { refs: ExternalSystemReference[] }
  return data.refs ?? []
}
