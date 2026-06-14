import type { Request } from 'express'
import type { AuditAction, AuditLogEntry, AuditLogFilters } from '../../src/types/auditLog'
import { AUDIT_ACTIONS } from '../../src/types/auditLog'
import { getCurrentOrganisation } from './orgPermissions'
import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'
import { isOrgStoreConfigured } from './orgStore'

export interface RecordAuditLogParams {
  organisationId: string
  userId: string
  action: AuditAction
  caseId?: string | null
  documentId?: string | null
  metadata?: Record<string, unknown>
  req?: Request
}

function mapRow(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    userId: row.user_id ? String(row.user_id) : null,
    caseId: row.case_id ? String(row.case_id) : null,
    documentId: row.document_id ? String(row.document_id) : null,
    action: row.action as AuditAction,
    createdAt: String(row.created_at),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    ip: row.ip ? String(row.ip) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
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

function extractUserAgent(req?: Request): string | null {
  if (!req) return null
  const ua = req.headers['user-agent']
  return typeof ua === 'string' && ua.trim() ? ua.trim().slice(0, 512) : null
}

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value)
}

/**
 * Resolve org for user and record audit log (non-blocking).
 */
export async function recordUserAuditLog(
  userId: string,
  params: {
    action: AuditAction
    caseId?: string | null
    documentId?: string | null
    metadata?: Record<string, unknown>
    req?: Request
    organisationIdHeader?: string | string[] | undefined
  },
): Promise<void> {
  try {
    const org = await getCurrentOrganisation(userId, params.organisationIdHeader)
    if (!org) return
    void recordAuditLog({
      organisationId: org.id,
      userId,
      action: params.action,
      caseId: params.caseId,
      documentId: params.documentId,
      metadata: params.metadata,
      req: params.req,
    })
  } catch (err) {
    console.error('[audit] recordUserAuditLog error:', err instanceof Error ? err.message : err)
  }
}

export type KbAuditSource = 'manual' | 'admin' | 'ai-import'

export interface RecordKbAdminAuditParams {
  actorUserId: string
  /** Concrete KB operation, e.g. 'substance.update', 'contribution.publish'. */
  action: string
  entityType: string
  entityId?: string | null
  beforeSummary?: Record<string, unknown> | null
  afterSummary?: Record<string, unknown> | null
  source?: KbAuditSource
  req?: Request
}

/**
 * Audit a KB admin mutation. The org_audit_logs table is organisation-scoped,
 * so we resolve the actor's organisation when the org store is configured and
 * record a `kb_admin_mutation` entry; otherwise we emit a structured server
 * log so the mutation is never silent.
 *
 * Only non-PHI scalar summaries (ids, generic drug names, status flags) should
 * be passed in before/after — never patient data or secrets.
 */
export async function recordKbAdminAudit(params: RecordKbAdminAuditParams): Promise<void> {
  const metadata: Record<string, unknown> = {
    kbAction: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    source: params.source ?? 'admin',
    before: params.beforeSummary ?? null,
    after: params.afterSummary ?? null,
    ts: new Date().toISOString(),
  }

  try {
    if (isOrgStoreConfigured()) {
      const org = await getCurrentOrganisation(
        params.actorUserId,
        params.req?.headers['x-organisation-id'],
      )
      if (org) {
        await recordAuditLog({
          organisationId: org.id,
          userId: params.actorUserId,
          action: 'kb_admin_mutation',
          metadata,
          req: params.req,
        })
        return
      }
    }
    console.info(
      '[audit] kb_admin_mutation',
      JSON.stringify({ actorUserId: params.actorUserId, ...metadata }),
    )
  } catch (err) {
    console.error('[audit] recordKbAdminAudit error:', err instanceof Error ? err.message : err)
  }
}

export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  if (!isKbAdminConfigured()) return

  try {
    const admin = getKbSupabaseAdmin()
    const { error } = await admin.from('org_audit_logs').insert({
      organisation_id: params.organisationId,
      user_id: params.userId,
      action: params.action,
      case_id: params.caseId ?? null,
      document_id: params.documentId ?? null,
      metadata: params.metadata ?? {},
      ip: extractClientIp(params.req),
      user_agent: extractUserAgent(params.req),
    })

    if (error) {
      console.error('[audit] insert failed:', error.message)
    }
  } catch (err) {
    console.error('[audit] insert error:', err instanceof Error ? err.message : err)
  }
}

export async function listAuditLogs(
  organisationId: string,
  filters: AuditLogFilters = {},
): Promise<AuditLogEntry[]> {
  if (!isKbAdminConfigured()) return []

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  const offset = Math.max(filters.offset ?? 0, 0)

  let query = getKbSupabaseAdmin()
    .from('org_audit_logs')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.action) {
    query = query.eq('action', filters.action)
  }
  if (filters.caseId?.trim()) {
    query = query.eq('case_id', filters.caseId.trim())
  }
  if (filters.userId?.trim()) {
    query = query.eq('user_id', filters.userId.trim())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}
