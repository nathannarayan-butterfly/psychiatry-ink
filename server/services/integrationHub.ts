import type { Request } from 'express'
import type { Organisation } from '../../src/types/organisation'
import {
  hasIntegrationCapability,
  type IntegrationCapabilityKey,
} from '../../src/data/org/planCapabilities'
import type {
  ExportBatch,
  ExternalSystemReference,
  ImportBatch,
  IntegrationAdapter,
  IntegrationAdapterType,
  IntegrationBatchHistoryItem,
  IntegrationConnection,
} from '../../src/types/integration/integrationHub'
import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'

export class IntegrationCapabilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IntegrationCapabilityError'
  }
}

export function assertIntegrationCapability(
  org: Organisation,
  capability: IntegrationCapabilityKey,
): void {
  if (org.tier === 'enterprise') {
    throw new IntegrationCapabilityError('Integration Hub is not enabled for Enterprise tier yet')
  }
  if (!hasIntegrationCapability(org.tier, capability)) {
    throw new IntegrationCapabilityError(`Integration capability not available: ${capability}`)
  }
}

function extractClientIp(req?: Request): string | null {
  if (!req) return null
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() ?? null
  }
  return req.socket?.remoteAddress ?? null
}

function mapAdapter(row: Record<string, unknown>): IntegrationAdapter {
  return {
    id: String(row.id),
    type: row.type as IntegrationAdapterType,
    version: String(row.version),
    capabilities: (row.capabilities ?? {}) as Record<string, unknown>,
  }
}

function mapConnection(row: Record<string, unknown>): IntegrationConnection {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    adapterType: row.adapter_type as IntegrationAdapterType,
    name: String(row.name),
    status: row.status as IntegrationConnection['status'],
    config: (row.config ?? {}) as Record<string, unknown>,
    enabled: Boolean(row.enabled),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapImportBatch(row: Record<string, unknown>): ImportBatch {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    userId: String(row.user_id),
    adapterType: row.adapter_type as IntegrationAdapterType,
    filename: row.filename ? String(row.filename) : null,
    status: row.status as ImportBatch['status'],
    recordCount: Number(row.record_count ?? 0),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  }
}

function mapExportBatch(row: Record<string, unknown>): ExportBatch {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    userId: String(row.user_id),
    adapterType: row.adapter_type as IntegrationAdapterType,
    caseId: row.case_id ? String(row.case_id) : null,
    objectTypes: Array.isArray(row.object_types) ? row.object_types.map(String) : [],
    status: row.status as ExportBatch['status'],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  }
}

function mapExternalRef(row: Record<string, unknown>): ExternalSystemReference {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    caseId: String(row.case_id),
    localObjectType: String(row.local_object_type),
    localObjectId: String(row.local_object_id),
    externalSystem: String(row.external_system),
    externalId: String(row.external_id),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }
}

export async function listIntegrationAdapters(): Promise<IntegrationAdapter[]> {
  if (!isKbAdminConfigured()) return []
  const { data, error } = await getKbSupabaseAdmin()
    .from('int_integration_adapters')
    .select('*')
    .order('type')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapAdapter(row as Record<string, unknown>))
}

export async function listIntegrationConnections(organisationId: string): Promise<IntegrationConnection[]> {
  if (!isKbAdminConfigured()) return []
  const { data, error } = await getKbSupabaseAdmin()
    .from('int_integration_connections')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapConnection(row as Record<string, unknown>))
}

export async function upsertIntegrationConnection(params: {
  organisationId: string
  adapterType: IntegrationAdapterType
  name: string
  config?: Record<string, unknown>
  enabled?: boolean
  connectionId?: string | null
}): Promise<IntegrationConnection> {
  if (!isKbAdminConfigured()) throw new Error('Supabase not configured')

  const now = new Date().toISOString()
  const payload = {
    organisation_id: params.organisationId,
    adapter_type: params.adapterType,
    name: params.name.trim(),
    config: params.config ?? {},
    enabled: params.enabled ?? false,
    status: params.enabled ? 'inactive' : 'inactive',
    updated_at: now,
  }

  if (params.connectionId) {
    const { data, error } = await getKbSupabaseAdmin()
      .from('int_integration_connections')
      .update(payload)
      .eq('id', params.connectionId)
      .eq('organisation_id', params.organisationId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapConnection(data as Record<string, unknown>)
  }

  const { data, error } = await getKbSupabaseAdmin()
    .from('int_integration_connections')
    .insert({ ...payload, created_at: now })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapConnection(data as Record<string, unknown>)
}

export async function listIntegrationBatches(
  organisationId: string,
  limit = 50,
): Promise<IntegrationBatchHistoryItem[]> {
  if (!isKbAdminConfigured()) return []

  const capped = Math.min(Math.max(limit, 1), 200)
  const [imports, exports] = await Promise.all([
    getKbSupabaseAdmin()
      .from('int_import_batches')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false })
      .limit(capped),
    getKbSupabaseAdmin()
      .from('int_export_batches')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false })
      .limit(capped),
  ])

  if (imports.error) throw new Error(imports.error.message)
  if (exports.error) throw new Error(exports.error.message)

  const items: IntegrationBatchHistoryItem[] = [
    ...(imports.data ?? []).map((row) => ({
      kind: 'import' as const,
      batch: mapImportBatch(row as Record<string, unknown>),
    })),
    ...(exports.data ?? []).map((row) => ({
      kind: 'export' as const,
      batch: mapExportBatch(row as Record<string, unknown>),
    })),
  ]

  return items.sort((a, b) => b.batch.createdAt.localeCompare(a.batch.createdAt)).slice(0, capped)
}

export async function createImportBatch(params: {
  organisationId: string
  userId: string
  adapterType: IntegrationAdapterType
  filename?: string | null
  recordCount?: number
  metadata?: Record<string, unknown>
  status?: ImportBatch['status']
}): Promise<ImportBatch> {
  if (!isKbAdminConfigured()) throw new Error('Supabase not configured')

  const { data, error } = await getKbSupabaseAdmin()
    .from('int_import_batches')
    .insert({
      organisation_id: params.organisationId,
      user_id: params.userId,
      adapter_type: params.adapterType,
      filename: params.filename ?? null,
      record_count: params.recordCount ?? 0,
      metadata: params.metadata ?? {},
      status: params.status ?? 'completed',
      completed_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapImportBatch(data as Record<string, unknown>)
}

export async function createExportBatch(params: {
  organisationId: string
  userId: string
  adapterType: IntegrationAdapterType
  caseId?: string | null
  objectTypes?: string[]
  metadata?: Record<string, unknown>
  status?: ExportBatch['status']
}): Promise<ExportBatch> {
  if (!isKbAdminConfigured()) throw new Error('Supabase not configured')

  const { data, error } = await getKbSupabaseAdmin()
    .from('int_export_batches')
    .insert({
      organisation_id: params.organisationId,
      user_id: params.userId,
      adapter_type: params.adapterType,
      case_id: params.caseId ?? null,
      object_types: params.objectTypes ?? [],
      metadata: params.metadata ?? {},
      status: params.status ?? 'completed',
      completed_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapExportBatch(data as Record<string, unknown>)
}

export async function logIntegrationEvent(params: {
  organisationId: string
  userId: string
  action: string
  adapterType?: IntegrationAdapterType | null
  caseId?: string | null
  metadata?: Record<string, unknown>
  req?: Request
}): Promise<void> {
  if (!isKbAdminConfigured()) return

  const { error } = await getKbSupabaseAdmin().from('int_integration_event_logs').insert({
    organisation_id: params.organisationId,
    user_id: params.userId,
    action: params.action,
    adapter_type: params.adapterType ?? null,
    case_id: params.caseId ?? null,
    metadata: params.metadata ?? {},
    ip: extractClientIp(params.req),
  })

  if (error) {
    console.error('[integration] event log failed:', error.message)
  }
}

export async function resolveExternalSystemReference(params: {
  organisationId: string
  caseId?: string | null
  localObjectType?: string | null
  localObjectId?: string | null
  externalSystem?: string | null
  externalId?: string | null
}): Promise<ExternalSystemReference[]> {
  if (!isKbAdminConfigured()) return []

  let query = getKbSupabaseAdmin()
    .from('int_external_system_references')
    .select('*')
    .eq('organisation_id', params.organisationId)

  if (params.caseId?.trim()) query = query.eq('case_id', params.caseId.trim())
  if (params.localObjectType?.trim()) query = query.eq('local_object_type', params.localObjectType.trim())
  if (params.localObjectId?.trim()) query = query.eq('local_object_id', params.localObjectId.trim())
  if (params.externalSystem?.trim()) query = query.eq('external_system', params.externalSystem.trim())
  if (params.externalId?.trim()) query = query.eq('external_id', params.externalId.trim())

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapExternalRef(row as Record<string, unknown>))
}

export async function upsertExternalSystemReference(params: {
  organisationId: string
  caseId: string
  localObjectType: string
  localObjectId: string
  externalSystem: string
  externalId: string
  metadata?: Record<string, unknown>
}): Promise<ExternalSystemReference> {
  if (!isKbAdminConfigured()) throw new Error('Supabase not configured')

  const now = new Date().toISOString()
  const { data, error } = await getKbSupabaseAdmin()
    .from('int_external_system_references')
    .upsert(
      {
        organisation_id: params.organisationId,
        case_id: params.caseId,
        local_object_type: params.localObjectType,
        local_object_id: params.localObjectId,
        external_system: params.externalSystem,
        external_id: params.externalId,
        metadata: params.metadata ?? {},
        updated_at: now,
      },
      { onConflict: 'organisation_id,local_object_type,local_object_id,external_system' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapExternalRef(data as Record<string, unknown>)
}
