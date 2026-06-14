import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import {
  aggregateUsageBreakdown,
  buildMonthlySummary,
  fetchUsageLogsForPeriod,
} from '../ai/usage/aggregateUsage'
import { getCurrentUsageForQuota } from '../ai/usage/getCurrentUsageForQuota'
import { getKbSupabaseAdmin, isKbAdminConfigured } from '../services/kbSupabaseAdmin'
import { buildOrganisationContext, hasPermission, ORG_HEADER } from '../services/orgPermissions'
import { isOrgStoreConfigured } from '../services/orgStore'
import type { AiBudgetConfig, AiBudgetWarning, AiUsageLogEntry } from '../../src/types/aiUsage'

export const aiUsageRouter: Router = createRouter()
export const aiBudgetRouter: Router = createRouter()

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

async function resolveOrg(req: Request, userId: string) {
  return buildOrganisationContext(userId, req.headers[ORG_HEADER])
}

function isOrgAdmin(role: string | null | undefined): boolean {
  return role === 'org_owner' || role === 'org_admin' || role === 'single_owner'
}

function mapBudgetConfig(row: Record<string, unknown>): AiBudgetConfig {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    monthlyBudgetUsd: row.monthly_budget_usd != null ? Number(row.monthly_budget_usd) : null,
    monthlyBudgetEur: row.monthly_budget_eur != null ? Number(row.monthly_budget_eur) : null,
    warnAt50: row.warn_at_50 !== false,
    warnAt80: row.warn_at_80 !== false,
    warnAt100: row.warn_at_100 !== false,
    hardLimitEnabled: row.hard_limit_enabled === true,
    hardLimitUsd: row.hard_limit_usd != null ? Number(row.hard_limit_usd) : null,
    hardLimitEur: row.hard_limit_eur != null ? Number(row.hard_limit_eur) : null,
    notifyEmails: Array.isArray(row.notify_emails) ? (row.notify_emails as string[]) : null,
    updatedAt: String(row.updated_at),
    updatedBy: row.updated_by ? String(row.updated_by) : null,
  }
}

function mapWarning(row: Record<string, unknown>): AiBudgetWarning {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    createdAt: String(row.created_at),
    thresholdPercent: Number(row.threshold_percent) as 50 | 80 | 100,
    periodStart: String(row.period_start),
    budgetAmount: Number(row.budget_amount),
    currentUsage: Number(row.current_usage),
    currency: String(row.currency),
    acknowledged: row.acknowledged === true,
  }
}

function mapUsageLog(row: Record<string, unknown>): AiUsageLogEntry {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    userId: row.user_id ? String(row.user_id) : null,
    organisationId: row.organisation_id ? String(row.organisation_id) : null,
    caseId: row.case_id ? String(row.case_id) : null,
    featureKey: String(row.feature_key) as AiUsageLogEntry['featureKey'],
    provider: String(row.provider),
    model: String(row.model),
    requestKind: String(row.request_kind) as AiUsageLogEntry['requestKind'],
    inputTokens: Number(row.input_tokens ?? 0),
    cachedInputTokens: Number(row.cached_input_tokens ?? 0),
    cacheMissInputTokens: Number(row.cache_miss_input_tokens ?? 0),
    outputTokens: Number(row.output_tokens ?? 0),
    totalTokens: Number(row.total_tokens ?? 0),
    audioMinutes: row.audio_minutes != null ? Number(row.audio_minutes) : null,
    estimatedCostUsd: row.estimated_cost_usd != null ? Number(row.estimated_cost_usd) : null,
    estimatedCostEur: row.estimated_cost_eur != null ? Number(row.estimated_cost_eur) : null,
    usageSource: String(row.usage_source) as AiUsageLogEntry['usageSource'],
    success: row.success !== false,
    errorCode: row.error_code ? String(row.error_code) : null,
    requestId: row.request_id ? String(row.request_id) : null,
    latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
  }
}

// GET /api/ai-usage/summary
aiUsageRouter.get('/summary', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!isOrgStoreConfigured() || !isKbAdminConfigured()) {
    res.json({ summary: null, quotaUsage: null })
    return
  }

  try {
    const ctx = await resolveOrg(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const yearMonth = typeof req.query.month === 'string' ? req.query.month : undefined
    const adminView = isOrgAdmin(ctx.role)
    const filterUserId = adminView ? undefined : userId

    const admin = getKbSupabaseAdmin()
    const { data: configRow } = await admin
      .from('ai_budget_configs')
      .select('*')
      .eq('organisation_id', ctx.organisation.id)
      .maybeSingle()

    const budgetEur = configRow?.monthly_budget_eur != null ? Number(configRow.monthly_budget_eur) : null
    const budgetUsd = configRow?.monthly_budget_usd != null ? Number(configRow.monthly_budget_usd) : null

    const summary = await buildMonthlySummary({
      organisationId: ctx.organisation.id,
      yearMonth,
      userId: filterUserId,
      budgetAmount: budgetEur ?? budgetUsd,
      budgetCurrency: budgetEur != null ? 'EUR' : budgetUsd != null ? 'USD' : null,
    })

    const quotaUsage = await getCurrentUsageForQuota({
      organisationId: ctx.organisation.id,
      userId: filterUserId,
    })

    res.json({ summary, quotaUsage, organisationId: ctx.organisation.id })
  } catch (err) {
    console.error('[ai-usage] summary failed:', err)
    res.status(500).json({ error: 'Failed to load usage summary' })
  }
})

// GET /api/ai-usage/breakdown?dimension=provider|model|feature|user
aiUsageRouter.get('/breakdown', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!isOrgStoreConfigured() || !isKbAdminConfigured()) {
    res.json({ rows: [] })
    return
  }

  const dimension = typeof req.query.dimension === 'string' ? req.query.dimension : 'feature'
  if (!['provider', 'model', 'feature', 'user'].includes(dimension)) {
    res.status(400).json({ error: 'Invalid dimension' })
    return
  }

  try {
    const ctx = await resolveOrg(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const adminView = isOrgAdmin(ctx.role)
    const rows = await aggregateUsageBreakdown({
      organisationId: ctx.organisation.id,
      yearMonth: typeof req.query.month === 'string' ? req.query.month : undefined,
      dimension: dimension as 'provider' | 'model' | 'feature' | 'user',
      userId: adminView ? undefined : userId,
    })

    res.json({ rows })
  } catch (err) {
    console.error('[ai-usage] breakdown failed:', err)
    res.status(500).json({ error: 'Failed to load breakdown' })
  }
})

// GET /api/ai-usage/recent
aiUsageRouter.get('/recent', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!isKbAdminConfigured()) {
    res.json({ logs: [] })
    return
  }

  try {
    const ctx = await resolveOrg(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const admin = getKbSupabaseAdmin()
    const adminView = isOrgAdmin(ctx.role)
    let query = admin
      .from('ai_usage_logs')
      .select(
        'id, created_at, user_id, organisation_id, case_id, feature_key, provider, model, request_kind, input_tokens, cached_input_tokens, cache_miss_input_tokens, output_tokens, total_tokens, audio_minutes, estimated_cost_usd, estimated_cost_eur, usage_source, success, error_code, request_id, latency_ms',
      )
      .eq('organisation_id', ctx.organisation.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!adminView) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    res.json({ logs: (data ?? []).map((row) => mapUsageLog(row as Record<string, unknown>)) })
  } catch (err) {
    console.error('[ai-usage] recent failed:', err)
    res.status(500).json({ error: 'Failed to load recent usage' })
  }
})

// GET /api/ai-usage/export?format=csv|json
aiUsageRouter.get('/export', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return

  const canManage = async () => {
    const ctx = await resolveOrg(req, userId)
    if (!ctx.organisation) return { ok: false as const }
    const allowed =
      isOrgAdmin(ctx.role) || (await hasPermission(userId, ctx.organisation.id, 'billing.manage'))
    return allowed ? { ok: true as const, orgId: ctx.organisation.id } : { ok: false as const }
  }

  const access = await canManage()
  if (!access.ok) {
    res.status(403).json({ error: 'Export requires org admin or billing.manage' })
    return
  }

  const format = req.query.format === 'csv' ? 'csv' : 'json'
  const rows = await fetchUsageLogsForPeriod({
    organisationId: access.orgId,
    yearMonth: typeof req.query.month === 'string' ? req.query.month : undefined,
  })

  if (format === 'csv') {
    const header = [
      'feature_key',
      'provider',
      'model',
      'total_tokens',
      'estimated_cost_eur',
      'usage_source',
      'success',
    ].join(',')
    const lines = rows.map((r) =>
      [
        r.feature_key,
        r.provider,
        r.model,
        r.total_tokens,
        r.estimated_cost_eur ?? '',
        r.usage_source,
        r.success,
      ].join(','),
    )
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="ai-usage-export.csv"')
    res.send([header, ...lines].join('\n'))
    return
  }

  res.json({ rows })
})

// GET /api/ai-budget/config
aiBudgetRouter.get('/config', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!isKbAdminConfigured()) {
    res.json({ config: null })
    return
  }

  try {
    const ctx = await resolveOrg(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const admin = getKbSupabaseAdmin()
    const { data } = await admin
      .from('ai_budget_configs')
      .select('*')
      .eq('organisation_id', ctx.organisation.id)
      .maybeSingle()

    res.json({ config: data ? mapBudgetConfig(data as Record<string, unknown>) : null })
  } catch (err) {
    console.error('[ai-budget] get config failed:', err)
    res.status(500).json({ error: 'Failed to load budget config' })
  }
})

// POST /api/ai-budget/config — create or update
async function saveBudgetConfig(req: Request, res: Response): Promise<void> {
  const userId = requireAuth(req, res)
  if (!userId) return

  try {
    const ctx = await resolveOrg(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const canManage =
      isOrgAdmin(ctx.role) || (await hasPermission(userId, ctx.organisation.id, 'billing.manage'))
    if (!canManage) {
      res.status(403).json({ error: 'Budget config requires org admin or billing.manage' })
      return
    }

    if (!isKbAdminConfigured()) {
      res.status(503).json({ error: 'Supabase not configured' })
      return
    }

    const body = req.body ?? {}
    const row = {
      organisation_id: ctx.organisation.id,
      monthly_budget_usd: body.monthlyBudgetUsd ?? null,
      monthly_budget_eur: body.monthlyBudgetEur ?? null,
      warn_at_50: body.warnAt50 !== false,
      warn_at_80: body.warnAt80 !== false,
      warn_at_100: body.warnAt100 !== false,
      hard_limit_enabled: body.hardLimitEnabled === true,
      hard_limit_usd: body.hardLimitUsd ?? null,
      hard_limit_eur: body.hardLimitEur ?? null,
      notify_emails: Array.isArray(body.notifyEmails) ? body.notifyEmails : null,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }

    const admin = getKbSupabaseAdmin()
    const { data, error } = await admin
      .from('ai_budget_configs')
      .upsert(row, { onConflict: 'organisation_id' })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    res.json({ config: mapBudgetConfig(data as Record<string, unknown>) })
  } catch (err) {
    console.error('[ai-budget] save config failed:', err)
    res.status(500).json({ error: 'Failed to save budget config' })
  }
}

aiBudgetRouter.post('/config', (req, res) => void saveBudgetConfig(req, res))
aiBudgetRouter.put('/config', (req, res) => void saveBudgetConfig(req, res))

// GET /api/ai-budget/warnings
aiBudgetRouter.get('/warnings', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!isKbAdminConfigured()) {
    res.json({ warnings: [] })
    return
  }

  try {
    const ctx = await resolveOrg(req, userId)
    if (!ctx.organisation) {
      res.status(404).json({ error: 'Organisation context unavailable' })
      return
    }

    const admin = getKbSupabaseAdmin()
    const { data, error } = await admin
      .from('ai_budget_warnings')
      .select('*')
      .eq('organisation_id', ctx.organisation.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)
    res.json({
      warnings: (data ?? []).map((row) => mapWarning(row as Record<string, unknown>)),
    })
  } catch (err) {
    console.error('[ai-budget] warnings failed:', err)
    res.status(500).json({ error: 'Failed to load warnings' })
  }
})
