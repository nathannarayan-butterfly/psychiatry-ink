import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import { canAccessCase, getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import {
  assertAiGenerationAllowed,
  recordAiGenerationUsed,
} from '../utils/caseAiAccessGuard'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { deidentifyPriorTherapySources } from '../services/priorTherapiesDeidentify'
import { extractPriorTherapies, isLlmMockMode } from '../services/priorTherapiesAi'
import { extractFailureAnalyses } from '../services/priorTherapyFailureAnalysisAi'
import type {
  PriorTherapiesRunRequest,
  PriorTherapiesRunResponse,
  PriorTherapyFailureAnalysisRequest,
  PriorTherapyFailureAnalysisResponse,
  PriorTherapyFailureDrugInput,
} from '../../src/types/priorTherapies'

export const medicationPriorTherapiesRouter: Router = createRouter()

const MAX_TEXT_CHARS = 20_000

async function assertPriorTherapyAccess(
  req: Request,
  res: Response,
  caseId: string,
  needsAi: boolean,
): Promise<boolean> {
  if (!requireRouteAuth(req, res)) return false
  const userId = resolveAccountId(req)
  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  const allowed = await canAccessCase(userId, caseId, 'medication.view', org?.id)
  if (!allowed) {
    res.status(403).json({ error: 'Keine Berechtigung für Medikationsdaten' })
    return false
  }
  if (needsAi && !(await assertAiGenerationAllowed(req, res, caseId))) return false
  return true
}

// POST /api/medication/prior-therapies/run
medicationPriorTherapiesRouter.post('/run', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PriorTherapiesRunRequest

    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    if (!caseId) {
      res.status(400).json({ error: 'Missing caseId' })
      return
    }

    const aufnahmeText =
      typeof body.aufnahmeText === 'string' ? body.aufnahmeText.slice(0, MAX_TEXT_CHARS) : ''
    const verlaufText =
      typeof body.verlaufText === 'string' ? body.verlaufText.slice(0, MAX_TEXT_CHARS) : ''
    const patientName = typeof body.patientName === 'string' ? body.patientName : undefined

    // No free text → nothing for the LLM to do (deterministic plan layer covers
    // the structured agents on the client). Return cleanly without spending AI.
    if (!aufnahmeText.trim() && !verlaufText.trim()) {
      if (!(await assertPriorTherapyAccess(req, res, caseId, false))) return
      res.json({
        items: [],
        mock: isLlmMockMode(),
        deidentified: true,
      } satisfies PriorTherapiesRunResponse)
      return
    }

    if (!(await assertPriorTherapyAccess(req, res, caseId, true))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    // De-identify BEFORE the LLM ever sees the text (reuses the shared redactor).
    const deidentified = deidentifyPriorTherapySources({
      caseId,
      aufnahmeText,
      verlaufText,
      patientName,
    })

    const result = await extractPriorTherapies({
      aufnahmeText: deidentified.aufnahmeText,
      verlaufText: deidentified.verlaufText,
      language,
      caseId,
    })

    const userId = resolveAccountId(req)
    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId,
        metadata: {
          route: 'medication/prior-therapies',
          itemCount: result.items.length,
          mock: result.mock,
        },
      })
    }

    res.json({
      items: result.items,
      mock: result.mock,
      deidentified: true,
    } satisfies PriorTherapiesRunResponse)
  } catch (error) {
    console.error('[medication/prior-therapies] failed:', error)
    res.status(500).json({ error: 'Vortherapien-Analyse fehlgeschlagen' })
  }
})

const MAX_FAILURE_DRUGS = 12

/** Validate + clamp the deterministic-signal payload for one failed drug. */
function sanitizeFailureDrug(raw: unknown): PriorTherapyFailureDrugInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const substance = typeof r.substance === 'string' ? r.substance.trim().slice(0, 120) : ''
  if (!substance) return null
  const signals = (r.signals ?? {}) as Record<string, unknown>
  return {
    substance,
    event: (typeof r.event === 'string' ? r.event : 'no_response') as PriorTherapyFailureDrugInput['event'],
    reason: typeof r.reason === 'string' ? r.reason.slice(0, 300) : null,
    signals: {
      substance,
      subtherapeuticLevel:
        signals.subtherapeuticLevel && typeof signals.subtherapeuticLevel === 'object'
          ? (signals.subtherapeuticLevel as PriorTherapyFailureDrugInput['signals']['subtherapeuticLevel'])
          : null,
      levelMeasured: Boolean(signals.levelMeasured),
      cyp1a2Smoking: Boolean(signals.cyp1a2Smoking),
      smoking: typeof signals.smoking === 'boolean' ? signals.smoking : null,
      poorAdherence:
        signals.poorAdherence && typeof signals.poorAdherence === 'object'
          ? { note: String((signals.poorAdherence as Record<string, unknown>).note ?? '').slice(0, 300) }
          : null,
      inadequateDoseDuration:
        signals.inadequateDoseDuration && typeof signals.inadequateDoseDuration === 'object'
          ? {
              detail: String(
                (signals.inadequateDoseDuration as Record<string, unknown>).detail ?? '',
              ).slice(0, 300),
            }
          : null,
      receptorProfileSummary:
        typeof signals.receptorProfileSummary === 'string'
          ? signals.receptorProfileSummary.slice(0, 200)
          : null,
    },
  }
}

// POST /api/medication/prior-therapies/failure-analysis
medicationPriorTherapiesRouter.post('/failure-analysis', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PriorTherapyFailureAnalysisRequest

    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    if (!caseId) {
      res.status(400).json({ error: 'Missing caseId' })
      return
    }

    const drugs = Array.isArray(body.drugs)
      ? body.drugs
          .map(sanitizeFailureDrug)
          .filter((d): d is PriorTherapyFailureDrugInput => d !== null)
          .slice(0, MAX_FAILURE_DRUGS)
      : []

    if (drugs.length === 0) {
      if (!(await assertPriorTherapyAccess(req, res, caseId, false))) return
      res.json({
        analyses: [],
        mock: isLlmMockMode(),
        deidentified: true,
      } satisfies PriorTherapyFailureAnalysisResponse)
      return
    }

    if (!(await assertPriorTherapyAccess(req, res, caseId, true))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const aufnahmeText =
      typeof body.aufnahmeText === 'string' ? body.aufnahmeText.slice(0, MAX_TEXT_CHARS) : ''
    const verlaufText =
      typeof body.verlaufText === 'string' ? body.verlaufText.slice(0, MAX_TEXT_CHARS) : ''
    const patientName = typeof body.patientName === 'string' ? body.patientName : undefined

    // De-identify the narrative context BEFORE the LLM sees it. The structured
    // signals carry no identifiers (values + booleans only).
    const deidentified = deidentifyPriorTherapySources({
      caseId,
      aufnahmeText,
      verlaufText,
      patientName,
    })

    const result = await extractFailureAnalyses({
      drugs,
      aufnahmeText: deidentified.aufnahmeText,
      verlaufText: deidentified.verlaufText,
      language,
      caseId,
    })

    const userId = resolveAccountId(req)
    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId,
        metadata: {
          route: 'medication/prior-therapies/failure-analysis',
          drugCount: drugs.length,
          mock: result.mock,
        },
      })
    }

    res.json({
      analyses: result.analyses,
      mock: result.mock,
      deidentified: true,
    } satisfies PriorTherapyFailureAnalysisResponse)
  } catch (error) {
    console.error('[medication/prior-therapies/failure-analysis] failed:', error)
    res.status(500).json({ error: 'Ursachenanalyse fehlgeschlagen' })
  }
})
