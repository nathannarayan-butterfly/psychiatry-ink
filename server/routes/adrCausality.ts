import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveAccountId } from '../middleware/auth'
import { assessAdrCausalityWithAi } from '../services/adrCausalityAi'
import { canAccessCase, getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import {
  assertAiGenerationAllowed,
  recordAiGenerationUsed,
} from '../utils/caseAiAccessGuard'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { InsufficientCreditsError } from '../ai/runAiFeature'
import type {
  AdrCausalityMedicationInput,
  AdrCausalityRequest,
  AdrCausalityResponse,
} from '../../src/types/adrCausality'

export const adrCausalityRouter: Router = createRouter()

const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']

async function assertAdrCausalityAccess(
  req: Request,
  res: Response,
  caseId: string,
): Promise<boolean> {
  if (!requireRouteAuth(req, res)) return false
  const userId = resolveAccountId(req)
  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  const medOk = await canAccessCase(userId, caseId, 'medication.view', org?.id)
  if (!medOk) {
    res.status(403).json({ error: 'Keine Berechtigung für Medikationsdaten' })
    return false
  }
  return assertAiGenerationAllowed(req, res, caseId)
}

function sanitizeMedications(raw: unknown): AdrCausalityMedicationInput[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): AdrCausalityMedicationInput | null => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const id = typeof r.id === 'string' ? r.id.trim().slice(0, 80) : ''
      const substance = typeof r.substance === 'string' ? r.substance.trim().slice(0, 160) : ''
      if (!id || !substance) return null
      const str = (key: string, max: number): string | undefined => {
        const v = r[key]
        return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined
      }
      return {
        id,
        substance,
        doseLineGerman: str('doseLineGerman', 200),
        strength: str('strength', 80),
        startDate: str('startDate', 40),
        indication: str('indication', 200),
        lastChangeAt: str('lastChangeAt', 40),
        status: str('status', 40) ?? 'active',
      }
    })
    .filter((entry): entry is AdrCausalityMedicationInput => entry != null)
    .slice(0, 40)
}

adrCausalityRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as AdrCausalityRequest & { tier?: AiModelTier }

    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    const symptom = typeof body.symptom === 'string' ? body.symptom.trim() : ''
    if (!caseId || !symptom) {
      res.status(400).json({ error: 'Missing caseId or symptom' })
      return
    }
    if (symptom.length > 400) {
      res.status(413).json({ error: 'Input too large' })
      return
    }

    if (!(await assertAdrCausalityAccess(req, res, caseId))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const tier: AiModelTier = VALID_TIERS.includes(body.tier as AiModelTier)
      ? (body.tier as AiModelTier)
      : 'standard'

    const medications = sanitizeMedications(body.medications)

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : undefined
    const onsetDate = typeof body.onsetDate === 'string' ? body.onsetDate.trim().slice(0, 40) : undefined
    const severity = typeof body.severity === 'string' ? body.severity.trim().slice(0, 120) : undefined
    const temporalRelation =
      typeof body.temporalRelation === 'string' ? body.temporalRelation.trim().slice(0, 200) : undefined

    const suspectedSubstance =
      typeof body.suspectedMedicationId === 'string'
        ? medications.find((m) => m.id === body.suspectedMedicationId)?.substance
        : undefined

    const userId = resolveAccountId(req)
    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId,
      featureKey: 'adr_causality_assessment',
      metadata: { route: 'medication/adr-causality', tier, medicationCount: medications.length },
    })

    const { assessment, model } = await assessAdrCausalityWithAi({
      symptom,
      onsetDate,
      severity,
      temporalRelation,
      note,
      suspectedSubstance,
      medications,
      tier,
      language,
      usageContext,
    })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId,
        metadata: {
          route: 'medication/adr-causality',
          tier,
          suspectedDrugCount: assessment.suspectedDrugs.length,
          managementStepCount: assessment.managementSteps.length,
        },
      })
    }

    const hasContent =
      assessment.suspectedDrugs.length > 0 || assessment.managementSteps.length > 0

    const responseBody: AdrCausalityResponse = {
      assessment,
      model,
      ...(hasContent
        ? {}
        : { aiWarning: 'KI lieferte keine verwertbare Kausalitätszuordnung — bitte erneut versuchen.' }),
    }
    res.json(responseBody)
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(402).json({ error: error.message })
      return
    }
    console.error('[adr-causality] failed:', error)
    res.status(500).json({ error: 'Kausalitätszuordnung fehlgeschlagen' })
  }
})
