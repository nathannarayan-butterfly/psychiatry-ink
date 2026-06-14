import type { Request, Response } from 'express'
import { resolveAccountId } from '../middleware/auth'
import { isBudgetHardLimitExceeded } from '../ai/usage/recordAiUsageLog'
import {
  AI_QUOTA_EXCEEDED_MESSAGE,
  checkAiQuotaForUser,
  incrementAiQuotaUsage,
} from '../services/aiQuota'
import { recordUserAuditLog } from '../services/auditLog'
import { canAccessCase, getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import { isOrgStoreConfigured } from '../services/orgStore'
import { allowLegacyDevAccount } from './requireRouteAuth'
import { requireAuthenticatedUserOrDevBypass } from './requireAuthenticatedUserOrDevBypass'

export const AI_BUDGET_EXCEEDED_MESSAGE =
  'Das monatliche KI-Budget der Organisation ist erreicht. Bitte wenden Sie sich an die Praxisleitung.'

/**
 * When a request includes caseId, enforce org_case_access for ai.use (Small Praxis).
 * Personal single-use orgs with no grants still pass through resolveCasePermission.
 */
export async function assertCaseAiAccess(
  req: Request,
  res: Response,
  caseId: string | undefined | null,
): Promise<boolean> {
  const trimmed = caseId?.trim()
  if (!trimmed) return true

  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    if (allowLegacyDevAccount()) return true
    res.status(401).json({ error: 'Anmeldung erforderlich' })
    return false
  }

  if (!isOrgStoreConfigured()) return true

  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  const allowed = await canAccessCase(userId, trimmed, 'ai.use', org?.id)
  if (!allowed) {
    res.status(403).json({ error: 'Keine Berechtigung für KI in diesem Fall' })
    return false
  }

  return true
}

/** Enforce per-member monthly AI quota (Small Praxis). */
export async function assertAiQuota(req: Request, res: Response): Promise<boolean> {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    if (allowLegacyDevAccount()) return true
    res.status(401).json({ error: 'Anmeldung erforderlich' })
    return false
  }

  if (!isOrgStoreConfigured()) return true

  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  if (!org) return true

  const { allowed } = await checkAiQuotaForUser(userId, org.id)
  if (!allowed) {
    res.status(429).json({ error: AI_QUOTA_EXCEEDED_MESSAGE })
    return false
  }

  return true
}

async function assertOrgBudgetHardLimit(req: Request, res: Response): Promise<boolean> {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') return true
  if (!isOrgStoreConfigured()) return true

  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  if (!org) return true

  if (await isBudgetHardLimitExceeded(org.id)) {
    res.status(429).json({ error: AI_BUDGET_EXCEEDED_MESSAGE })
    return false
  }

  return true
}

/**
 * Authenticated user (or explicit dev bypass) + case ACL + member AI quota.
 * Call before any LLM route. The authentication guard runs FIRST so the legacy
 * `default` account can never reach a paid AI/LLM call outside true local dev.
 */
export async function assertAiGenerationAllowed(
  req: Request,
  res: Response,
  caseId?: string | null,
): Promise<boolean> {
  if (!requireAuthenticatedUserOrDevBypass(req, res)) return false
  if (!(await assertCaseAiAccess(req, res, caseId))) return false
  if (!(await assertAiQuota(req, res))) return false
  if (!(await assertOrgBudgetHardLimit(req, res))) return false
  return true
}

export async function recordAiGenerationUsed(
  req: Request,
  userId: string,
  options: {
    caseId?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  void recordUserAuditLog(userId, {
    action: 'ai_generation_used',
    caseId: options.caseId ?? null,
    metadata: options.metadata,
    req,
  })

  if (!isOrgStoreConfigured()) return
  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  if (!org) return
  void incrementAiQuotaUsage(userId, org.id)
}
