import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { IntegrationCapabilityKey } from '../../src/data/org/planCapabilities'
import type { IntegrationAdapterType } from '../../src/types/integration/integrationHub'
import { resolveAccountId } from '../middleware/auth'
import { recordAuditLog } from '../services/auditLog'
import {
  assertIntegrationCapability,
  createExportBatch,
  createImportBatch,
  IntegrationCapabilityError,
  listIntegrationAdapters,
  listIntegrationBatches,
  listIntegrationConnections,
  logIntegrationEvent,
  resolveExternalSystemReference,
  upsertExternalSystemReference,
  upsertIntegrationConnection,
} from '../services/integrationHub'
import {
  buildOrganisationContext,
  canExportDocument,
  canViewCase,
  hasPermission,
  ORG_HEADER,
} from '../services/orgPermissions'
import { isOrgStoreConfigured } from '../services/orgStore'

export const integrationRouter: Router = createRouter()

const ADAPTER_TYPES = new Set<IntegrationAdapterType>([
  'fhir',
  'hl7_v2',
  'cda',
  'pdf',
  'csv',
  'json',
])

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

function requireSupabase(res: Response): boolean {
  if (!isOrgStoreConfigured()) {
    res.status(503).json({
      error: 'Integration Hub requires Supabase configuration (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

async function resolveOrgContext(req: Request, res: Response) {
  const userId = requireAuth(req, res)
  if (!userId) return null
  if (!requireSupabase(res)) return null

  const { organisation, role, member, permissions } = await buildOrganisationContext(
    userId,
    req.headers[ORG_HEADER],
  )
  if (!organisation || !member) {
    res.status(404).json({ error: 'Organisation context unavailable' })
    return null
  }

  return { userId, organisation, role, member, permissions }
}

function parseAdapterType(value: unknown): IntegrationAdapterType | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim() as IntegrationAdapterType
  return ADAPTER_TYPES.has(trimmed) ? trimmed : null
}

function handleCapabilityError(res: Response, err: unknown): boolean {
  if (err instanceof IntegrationCapabilityError) {
    res.status(403).json({ error: err.message })
    return true
  }
  return false
}

async function requireIntegrationAccess(
  ctx: NonNullable<Awaited<ReturnType<typeof resolveOrgContext>>>,
  res: Response,
  options: {
    capability: IntegrationCapabilityKey
    permission: 'documents.export' | 'labs.import'
    caseId?: string | null
  },
): Promise<boolean> {
  try {
    assertIntegrationCapability(ctx.organisation, options.capability)
  } catch (err) {
    if (handleCapabilityError(res, err)) return false
    throw err
  }

  const permissionOk = options.permission === 'labs.import'
    ? await hasPermission(ctx.userId, ctx.organisation.id, 'labs.import')
    : await canExportDocument(ctx.userId, ctx.organisation.id, options.caseId ?? undefined)

  if (!permissionOk) {
    res.status(403).json({ error: 'Permission denied for integration action' })
    return false
  }

  if (options.caseId) {
    const canView = await canViewCase(ctx.userId, ctx.organisation.id, options.caseId)
    if (!canView) {
      res.status(403).json({ error: 'Case access denied' })
      return false
    }
  }

  return true
}

async function auditIntegration(
  req: Request,
  ctx: NonNullable<Awaited<ReturnType<typeof resolveOrgContext>>>,
  action: string,
  caseId?: string | null,
  metadata?: Record<string, unknown>,
  adapterType?: IntegrationAdapterType | null,
): Promise<void> {
  void recordAuditLog({
    organisationId: ctx.organisation.id,
    userId: ctx.userId,
    action: 'document_exported',
    caseId,
    metadata: { integrationAction: action, adapterType, ...metadata },
    req,
  })

  void logIntegrationEvent({
    organisationId: ctx.organisation.id,
    userId: ctx.userId,
    action,
    adapterType,
    caseId,
    metadata: metadata ?? {},
    req,
  })
}

integrationRouter.get('/adapters', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  try {
    assertIntegrationCapability(ctx.organisation, 'fileImportExport')
  } catch (err) {
    if (handleCapabilityError(res, err)) return
    throw err
  }

  const adapters = await listIntegrationAdapters()
  res.json({ adapters })
})

integrationRouter.get('/connections', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const allowed = await requireIntegrationAccess(ctx, res, {
    capability: 'fhir',
    permission: 'documents.export',
  })
  if (!allowed) return

  const connections = await listIntegrationConnections(ctx.organisation.id)
  res.json({ connections })
})

integrationRouter.post('/connections', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const allowed = await requireIntegrationAccess(ctx, res, {
    capability: 'fhir',
    permission: 'documents.export',
  })
  if (!allowed) return

  const adapterType = parseAdapterType(req.body?.adapterType) ?? 'fhir'
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : 'FHIR Endpoint'
  const config =
    req.body?.config && typeof req.body.config === 'object' && !Array.isArray(req.body.config)
      ? (req.body.config as Record<string, unknown>)
      : {}
  const enabled = req.body?.enabled === true
  const connectionId = typeof req.body?.connectionId === 'string' ? req.body.connectionId : null

  try {
    const connection = await upsertIntegrationConnection({
      organisationId: ctx.organisation.id,
      adapterType,
      name,
      config,
      enabled,
      connectionId,
    })

    await auditIntegration(req, ctx, 'connection_upserted', null, {
      connectionId: connection.id,
      adapterType,
      enabled,
    })

    res.json({ connection })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save connection'
    res.status(500).json({ error: message })
  }
})

integrationRouter.get('/batches', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const allowed = await requireIntegrationAccess(ctx, res, {
    capability: 'fileImportExport',
    permission: 'documents.export',
  })
  if (!allowed) return

  const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 50
  const batches = await listIntegrationBatches(
    ctx.organisation.id,
    Number.isFinite(limitRaw) ? limitRaw : 50,
  )
  res.json({ batches })
})

integrationRouter.post('/import-batches', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : null
  const allowed = await requireIntegrationAccess(ctx, res, {
    capability: 'fileImportExport',
    permission: 'labs.import',
    caseId,
  })
  if (!allowed) return

  const adapterType = parseAdapterType(req.body?.adapterType)
  if (!adapterType) {
    res.status(400).json({ error: 'Invalid adapterType' })
    return
  }

  const filename = typeof req.body?.filename === 'string' ? req.body.filename : null
  const recordCount =
    typeof req.body?.recordCount === 'number' && Number.isFinite(req.body.recordCount)
      ? req.body.recordCount
      : 0
  const metadata =
    req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
      ? (req.body.metadata as Record<string, unknown>)
      : {}

  try {
    const batch = await createImportBatch({
      organisationId: ctx.organisation.id,
      userId: ctx.userId,
      adapterType,
      filename,
      recordCount,
      metadata,
    })

    await auditIntegration(req, ctx, 'import_batch_registered', caseId, {
      batchId: batch.id,
      filename,
      recordCount,
    }, adapterType)

    res.json({ batch })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to register import batch'
    res.status(500).json({ error: message })
  }
})

integrationRouter.post('/export-batches', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : null
  const capability: IntegrationCapabilityKey =
    req.body?.adapterType === 'fhir' ? 'fhir' : 'fileImportExport'

  const allowed = await requireIntegrationAccess(ctx, res, {
    capability,
    permission: 'documents.export',
    caseId,
  })
  if (!allowed) return

  const adapterType = parseAdapterType(req.body?.adapterType)
  if (!adapterType) {
    res.status(400).json({ error: 'Invalid adapterType' })
    return
  }

  const objectTypes = Array.isArray(req.body?.objectTypes)
    ? req.body.objectTypes.filter((v: unknown) => typeof v === 'string')
    : []
  const metadata =
    req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
      ? (req.body.metadata as Record<string, unknown>)
      : {}

  try {
    const batch = await createExportBatch({
      organisationId: ctx.organisation.id,
      userId: ctx.userId,
      adapterType,
      caseId,
      objectTypes,
      metadata,
    })

    await auditIntegration(req, ctx, 'export_batch_registered', caseId, {
      batchId: batch.id,
      objectTypes,
    }, adapterType)

    res.json({ batch })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to register export batch'
    res.status(500).json({ error: message })
  }
})

integrationRouter.post('/events', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const action = typeof req.body?.action === 'string' ? req.body.action.trim() : ''
  if (!action) {
    res.status(400).json({ error: 'action required' })
    return
  }

  const adapterType = parseAdapterType(req.body?.adapterType)
  const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : null
  const metadata =
    req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
      ? (req.body.metadata as Record<string, unknown>)
      : {}

  const capability: IntegrationCapabilityKey =
    adapterType === 'fhir' ? 'fhir' : 'fileImportExport'

  const permission =
    action.startsWith('import') ? ('labs.import' as const) : ('documents.export' as const)

  const allowed = await requireIntegrationAccess(ctx, res, {
    capability,
    permission,
    caseId,
  })
  if (!allowed) return

  await auditIntegration(req, ctx, action, caseId, metadata, adapterType)
  res.json({ ok: true })
})

integrationRouter.get('/external-refs', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const caseId = typeof req.query.caseId === 'string' ? req.query.caseId.trim() : null
  const allowed = await requireIntegrationAccess(ctx, res, {
    capability: 'fileImportExport',
    permission: 'documents.export',
    caseId,
  })
  if (!allowed) return

  const refs = await resolveExternalSystemReference({
    organisationId: ctx.organisation.id,
    caseId,
    localObjectType: typeof req.query.localObjectType === 'string' ? req.query.localObjectType : null,
    localObjectId: typeof req.query.localObjectId === 'string' ? req.query.localObjectId : null,
    externalSystem: typeof req.query.externalSystem === 'string' ? req.query.externalSystem : null,
    externalId: typeof req.query.externalId === 'string' ? req.query.externalId : null,
  })

  res.json({ refs })
})

integrationRouter.post('/external-refs', async (req, res) => {
  const ctx = await resolveOrgContext(req, res)
  if (!ctx) return

  const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : ''
  const allowed = await requireIntegrationAccess(ctx, res, {
    capability: 'fileImportExport',
    permission: 'documents.export',
    caseId,
  })
  if (!allowed) return

  const localObjectType = typeof req.body?.localObjectType === 'string' ? req.body.localObjectType.trim() : ''
  const localObjectId = typeof req.body?.localObjectId === 'string' ? req.body.localObjectId.trim() : ''
  const externalSystem = typeof req.body?.externalSystem === 'string' ? req.body.externalSystem.trim() : ''
  const externalId = typeof req.body?.externalId === 'string' ? req.body.externalId.trim() : ''

  if (!caseId || !localObjectType || !localObjectId || !externalSystem || !externalId) {
    res.status(400).json({ error: 'caseId, localObjectType, localObjectId, externalSystem, externalId required' })
    return
  }

  try {
    const ref = await upsertExternalSystemReference({
      organisationId: ctx.organisation.id,
      caseId,
      localObjectType,
      localObjectId,
      externalSystem,
      externalId,
      metadata:
        req.body?.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
          ? (req.body.metadata as Record<string, unknown>)
          : {},
    })

    await auditIntegration(req, ctx, 'external_ref_upserted', caseId, {
      refId: ref.id,
      externalSystem,
    })

    res.json({ ref })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upsert external reference'
    res.status(500).json({ error: message })
  }
})
