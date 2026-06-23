import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveAccountId } from '../middleware/auth'
import { assessPreparationAvailabilityWithAi } from '../services/prepAiCheckAi'
import { canAccessCase, getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import {
  assertAiGenerationAllowed,
  recordAiGenerationUsed,
} from '../utils/caseAiAccessGuard'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import type { PrepAiCheckRequest, PrepAiCheckResponse } from '../../src/types/prepAiCheck'
import {
  PRESCRIBING_COUNTRY_CODES,
  type PrescribingCountryCode,
} from '../../src/types/knowledgeBase'

export const prepAiCheckRouter: Router = createRouter()

const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']
const VALID_COUNTRIES: readonly PrescribingCountryCode[] = PRESCRIBING_COUNTRY_CODES

async function assertPrepAiAccess(
  req: Request,
  res: Response,
  caseId: string,
  needsAi: boolean,
): Promise<boolean> {
  if (!requireRouteAuth(req, res)) return false
  const userId = resolveAccountId(req)
  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  const medOk = await canAccessCase(userId, caseId, 'medication.view', org?.id)
  if (!medOk) {
    res.status(403).json({ error: 'Keine Berechtigung für Medikationsdaten' })
    return false
  }
  if (needsAi && !(await assertAiGenerationAllowed(req, res, caseId))) return false
  return true
}

function sanitizeKbPreparations(raw: unknown): Array<{ tradeName: string; strength: string; form: string }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const tradeName = typeof r.tradeName === 'string' ? r.tradeName.trim().slice(0, 160) : ''
      const strength = typeof r.strength === 'string' ? r.strength.trim().slice(0, 80) : ''
      const form = typeof r.form === 'string' ? r.form.trim().slice(0, 120) : ''
      if (!tradeName && !strength && !form) return null
      return { tradeName, strength, form }
    })
    .filter((entry): entry is { tradeName: string; strength: string; form: string } => entry != null)
    .slice(0, 30)
}

prepAiCheckRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PrepAiCheckRequest & { tier?: AiModelTier }

    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const substance = typeof body.substance === 'string' ? body.substance.trim() : ''
    if (!caseId || !substance) {
      res.status(400).json({ error: 'Missing caseId or substance' })
      return
    }
    if (substance.length > 200) {
      res.status(413).json({ error: 'Input too large' })
      return
    }

    if (!(await assertPrepAiAccess(req, res, caseId, true))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return
    const country: PrescribingCountryCode = VALID_COUNTRIES.includes(body.country as PrescribingCountryCode)
      ? (body.country as PrescribingCountryCode)
      : 'DE'

    const tier: AiModelTier = VALID_TIERS.includes(body.tier as AiModelTier)
      ? (body.tier as AiModelTier)
      : 'standard'

    const genericName =
      typeof body.genericName === 'string' ? body.genericName.trim().slice(0, 200) : undefined

    const selectedDrug =
      body.selectedDrug && typeof body.selectedDrug === 'object'
        ? {
            substance:
              typeof body.selectedDrug.substance === 'string'
                ? body.selectedDrug.substance.trim().slice(0, 200)
                : substance,
            strength:
              typeof body.selectedDrug.strength === 'string'
                ? body.selectedDrug.strength.trim().slice(0, 80)
                : undefined,
            formulation:
              typeof body.selectedDrug.formulation === 'string'
                ? body.selectedDrug.formulation.trim().slice(0, 80)
                : undefined,
          }
        : undefined

    const userId = resolveAccountId(req)
    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId,
      featureKey: 'prep_ai_check',
      metadata: { route: 'medication/prep-ai-check', tier, country },
    })

    const result = await assessPreparationAvailabilityWithAi({
      substance,
      genericName,
      country,
      selectedDrug,
      kbPreparations: sanitizeKbPreparations(body.kbPreparations),
      tier,
      language,
      usageContext,
    })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId,
        metadata: {
          route: 'medication/prep-ai-check',
          tier,
          substance,
          country,
          preparationCount: result.preparations.length,
        },
      })
    }

    const source =
      result.model.provider === 'openai'
        ? 'openai'
        : result.model.provider === 'deepseek'
          ? 'deepseek'
          : 'other'

    const responseBody: PrepAiCheckResponse = {
      preparations: result.preparations,
      disclaimer: result.disclaimer,
      country: result.country,
      model: result.model,
      source,
      sourceLabel: result.model.label,
      ...(result.preparations.length === 0
        ? { aiWarning: 'KI lieferte keine verwertbaren Präparate — bitte erneut versuchen.' }
        : {}),
    }
    res.json(responseBody)
  } catch (error) {
    console.error('[prep-ai-check] failed:', error)
    res.status(500).json({ error: 'Verfügbarkeitsprüfung fehlgeschlagen' })
  }
})
