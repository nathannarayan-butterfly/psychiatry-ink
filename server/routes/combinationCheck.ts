import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import { assessCombinationWithAi } from '../services/combinationCheckAi'
import {
  lookupInternalCombinations,
  resolveSubstances,
  severitiesConflict,
} from '../services/combinationCheckKb'
import { canAccessCase, getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import {
  assertAiGenerationAllowed,
  recordAiGenerationUsed,
} from '../utils/caseAiAccessGuard'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import type {
  CombinationCheckAIRun,
  CombinationCheckMedicationInput,
  CombinationCheckRunRequest,
  CombinationCheckRunResponse,
  PatientCombinationCheckFinding,
} from '../../src/types/combinationCheck'
import { buildCombinationKey, buildCombinationKeyFromNames } from '../../src/utils/combinationCheck/combinationKey'

export const combinationCheckRouter: Router = createRouter()

const pendingRuns = new Map<string, CombinationCheckAIRun>()

async function assertMedicationView(
  req: Request,
  res: Response,
  caseId: string,
): Promise<boolean> {
  if (!requireRouteAuth(req, res)) return false
  const userId = resolveAccountId(req)
  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  const allowed = await canAccessCase(userId, caseId, 'medication.view', org?.id)
  if (!allowed) {
    res.status(403).json({ error: 'Keine Berechtigung für Medikationsdaten' })
    return false
  }
  return true
}

function activeMedications(meds: CombinationCheckMedicationInput[]): CombinationCheckMedicationInput[] {
  return meds.filter((m) => {
    const s = m.status.toLowerCase()
    return s === 'active' || s === 'reduced' || s === 'increased'
  })
}

function pairKeyForMeds(
  medA: CombinationCheckMedicationInput,
  medB: CombinationCheckMedicationInput,
  resolved: Awaited<ReturnType<typeof resolveSubstances>>,
): string {
  const findId = (substance: string) =>
    resolved.find((r) => r.inputName === substance)?.substanceId ??
    `name:${substance.trim().toLowerCase()}`
  return buildCombinationKey(findId(medA.substance), findId(medB.substance))
}

function kbFinding(
  caseId: string,
  kb: NonNullable<Awaited<ReturnType<typeof lookupInternalCombinations>>[number]>,
): PatientCombinationCheckFinding {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    caseId,
    combinationKey: kb.combinationKey,
    substanceAName: kb.substanceAName,
    substanceBName: kb.substanceBName,
    interactionType: kb.interactionType,
    severity: kb.severity,
    mainRisk: kb.mainRisk,
    mechanism: kb.mechanism,
    monitoring: kb.monitoring,
    clinicalManagement: kb.clinicalManagement,
    source: 'knowledge_base',
    status: 'verified_kb',
    kbResult: kb,
    createdAt: now,
    updatedAt: now,
  }
}

function aiProviderFromModel(model: { provider: string }): 'deepseek' | 'openai' | 'other' {
  if (model.provider === 'deepseek') return 'deepseek'
  if (model.provider === 'openai') return 'openai'
  return 'other'
}

function aiProvenanceLabel(provider: 'deepseek' | 'openai' | 'other', modelLabel: string): string {
  if (provider === 'openai') return modelLabel || 'OpenAI KI-Vorschlag'
  if (provider === 'deepseek') return modelLabel || 'DeepSeek KI-Vorschlag'
  return modelLabel || 'KI-Vorschlag'
}

function aiPendingFinding(
  caseId: string,
  run: CombinationCheckAIRun,
  hasConflict: boolean,
  kbResult?: PatientCombinationCheckFinding['kbResult'],
): PatientCombinationCheckFinding {
  const now = new Date().toISOString()
  const provenance =
    run.aiModelLabel && run.aiProvider
      ? aiProvenanceLabel(run.aiProvider, run.aiModelLabel)
      : undefined
  return {
    id: crypto.randomUUID(),
    caseId,
    combinationKey: run.combinationKey,
    substanceAName: run.result.substanceAName,
    substanceBName: run.result.substanceBName,
    interactionType: run.result.interactionType,
    severity: run.result.severity,
    mainRisk: run.result.mainRisk,
    mechanism: run.result.mechanism,
    monitoring: run.result.monitoring,
    clinicalManagement: run.result.clinicalManagement,
    source: 'ai_suggestion',
    status: 'pending_clinician_review',
    aiResult: run.result,
    kbResult,
    hasConflict,
    aiRunId: run.id,
    provenance,
    createdAt: now,
    updatedAt: now,
  }
}

combinationCheckRouter.post('/run', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as CombinationCheckRunRequest
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    if (!caseId) {
      res.status(400).json({ error: 'Missing caseId' })
      return
    }
    if (!(await assertMedicationView(req, res, caseId))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return
    const meds = Array.isArray(body.medications) ? body.medications : []
    const active = activeMedications(meds)
    if (active.length < 2) {
      res.json({ findings: [], aiRuns: [] } satisfies CombinationCheckRunResponse)
      return
    }

    const substanceNames = active.map((m) => m.substance.trim()).filter(Boolean)
    const resolved = await resolveSubstances(substanceNames)
    const internal = await lookupInternalCombinations(substanceNames, language)
    const internalByKey = new Map(internal.map((k) => [k.combinationKey, k]))
    const internalByNames = new Map(
      internal.map((k) => [buildCombinationKeyFromNames(k.substanceAName, k.substanceBName), k]),
    )

    const findings: PatientCombinationCheckFinding[] = []
    const aiRuns: CombinationCheckAIRun[] = []
    let aiParseFailures = 0
    const targetKey = typeof body.combinationKey === 'string' ? body.combinationKey.trim() : ''

    const pairs: [CombinationCheckMedicationInput, CombinationCheckMedicationInput][] = []
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const medA = active[i]!
        const medB = active[j]!
        const key = pairKeyForMeds(medA, medB, resolved)
        const nameKey = buildCombinationKeyFromNames(medA.substance, medB.substance)
        if (targetKey && key !== targetKey && nameKey !== targetKey) continue
        pairs.push([medA, medB])
      }
    }

    let needsAi = false
    for (const [medA, medB] of pairs) {
      const key = pairKeyForMeds(medA, medB, resolved)
      const kbHit =
        internalByKey.get(key) ??
        internalByNames.get(buildCombinationKeyFromNames(medA.substance, medB.substance))

      const kbIncomplete =
        !kbHit ||
        kbHit.severity === 'none' ||
        !kbHit.mechanism ||
        !kbHit.clinicalManagement

      if (kbHit && kbHit.severity !== 'none' && !kbIncomplete && !body.thorough) {
        findings.push(kbFinding(caseId, kbHit))
      }

      if (kbIncomplete || body.thorough) {
        needsAi = true
      }
    }

    if (needsAi) {
      if (!(await assertAiGenerationAllowed(req, res, caseId))) return
    }

    const usageContext = needsAi
      ? await resolveUsageContextFromRequest(req, resolveAccountId(req), {
          caseId,
          featureKey: 'medication_combination_check',
          metadata: { route: 'combination-check' },
        })
      : undefined

    for (const [medA, medB] of pairs) {
      const key = pairKeyForMeds(medA, medB, resolved)
      const kbHit =
        internalByKey.get(key) ??
        internalByNames.get(buildCombinationKeyFromNames(medA.substance, medB.substance))

      const kbIncomplete =
        !kbHit ||
        kbHit.severity === 'none' ||
        !kbHit.mechanism ||
        !kbHit.clinicalManagement

      const shouldRunAi =
        body.thorough && (targetKey === key || targetKey === buildCombinationKeyFromNames(medA.substance, medB.substance))
          ? true
          : kbIncomplete &&
            (!targetKey ||
              targetKey === key ||
              targetKey === buildCombinationKeyFromNames(medA.substance, medB.substance))

      if (!shouldRunAi) continue

      const aiAssessment = await assessCombinationWithAi({
        medA,
        medB,
        risk: body.patientRiskFactors,
        labNotes: body.labNotes,
        thorough: Boolean(body.thorough),
        kbHint: kbHit ?? null,
        language,
        usageContext,
      })

      if (!aiAssessment || !aiAssessment.result) {
        aiParseFailures += 1
        console.warn('[combination-check/run] AI parse returned null for pair', {
          caseId,
          medA: medA.substance,
          medB: medB.substance,
        })
        continue
      }

      const aiResult = aiAssessment.result
      const { model } = aiAssessment
      const aiProvider = aiProviderFromModel(model)
      const hasConflict = kbHit ? severitiesConflict(kbHit.severity, aiResult.severity) : false
      const run: CombinationCheckAIRun = {
        id: crypto.randomUUID(),
        caseId,
        combinationKey: key,
        status: 'pending_clinician_review',
        thorough: Boolean(body.thorough),
        result: aiResult,
        dbResult: kbHit ?? null,
        hasConflict,
        aiProvider,
        aiModelLabel: model.label,
        createdAt: new Date().toISOString(),
      }
      pendingRuns.set(run.id, run)
      aiRuns.push(run)
      findings.push(aiPendingFinding(caseId, run, hasConflict, kbHit ?? undefined))

      const userId = resolveAccountId(req)
      if (userId && userId !== 'default') {
        void recordAiGenerationUsed(req, userId, {
          caseId,
          metadata: {
            route: 'combination-check',
            combinationKey: key,
            thorough: Boolean(body.thorough),
            hasConflict,
          },
        })
      }
    }

    let aiWarning: string | undefined
    if (needsAi && aiRuns.length === 0) {
      aiWarning =
        aiParseFailures > 0
          ? 'KI-Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen.'
          : 'Keine KI-Vorschläge für die geprüften Kombinationen.'
    }

    res.json({ findings, aiRuns, ...(aiWarning ? { aiWarning } : {}) } satisfies CombinationCheckRunResponse)
  } catch (error) {
    console.error('[combination-check/run] failed:', error)
    res.status(500).json({ error: 'Kombinationscheck fehlgeschlagen' })
  }
})

combinationCheckRouter.get('/:caseId', async (req: Request, res: Response) => {
  const caseId = String(req.params.caseId ?? '').trim()
  if (!caseId) {
    res.status(400).json({ error: 'Missing caseId' })
    return
  }
  if (!(await assertMedicationView(req, res, caseId))) return

  const runs = [...pendingRuns.values()].filter((r) => r.caseId === caseId)
  res.json({ aiRuns: runs })
})

function updateRun(
  runId: string,
  patch: Partial<CombinationCheckAIRun>,
): CombinationCheckAIRun | null {
  const existing = pendingRuns.get(runId)
  if (!existing) return null
  const next = { ...existing, ...patch }
  pendingRuns.set(runId, next)
  return next
}

combinationCheckRouter.post('/ai/:runId/accept', async (req: Request, res: Response) => {
  const userId = requireRouteAuth(req, res)
  if (!userId) return

  const runId = String(req.params.runId ?? '').trim()
  const run = pendingRuns.get(runId)
  if (!run) {
    res.status(404).json({ error: 'AI run not found' })
    return
  }
  if (!(await assertMedicationView(req, res, run.caseId))) return

  const edited = req.body?.editedResult
  const clinicianNote = typeof req.body?.clinicianNote === 'string' ? req.body.clinicianNote.trim() : undefined
  const acceptedResult = edited && typeof edited === 'object' ? edited : run.result

  const updated = updateRun(runId, {
    status: 'accepted',
    reviewedAt: new Date().toISOString(),
    reviewedBy: userId,
    clinicianNote,
    editedResult: edited && typeof edited === 'object' ? acceptedResult : undefined,
  })

  const finding: PatientCombinationCheckFinding = {
    id: crypto.randomUUID(),
    caseId: run.caseId,
    combinationKey: run.combinationKey,
    substanceAName: acceptedResult.substanceAName,
    substanceBName: acceptedResult.substanceBName,
    interactionType: acceptedResult.interactionType,
    severity: acceptedResult.severity,
    mainRisk: acceptedResult.mainRisk,
    mechanism: acceptedResult.mechanism,
    monitoring: acceptedResult.monitoring,
    clinicalManagement: acceptedResult.clinicalManagement,
    source: 'clinician_accepted',
    status: 'accepted',
    aiResult: acceptedResult,
    kbResult: run.dbResult ?? undefined,
    hasConflict: run.hasConflict,
    clinicianNote,
    aiRunId: run.id,
    createdAt: run.createdAt,
    updatedAt: new Date().toISOString(),
  }

  res.json({ run: updated, finding })
})

combinationCheckRouter.post('/ai/:runId/reject', async (req: Request, res: Response) => {
  const userId = requireRouteAuth(req, res)
  if (!userId) return

  const runId = String(req.params.runId ?? '').trim()
  const run = pendingRuns.get(runId)
  if (!run) {
    res.status(404).json({ error: 'AI run not found' })
    return
  }
  if (!(await assertMedicationView(req, res, run.caseId))) return

  const clinicianNote = typeof req.body?.clinicianNote === 'string' ? req.body.clinicianNote.trim() : undefined
  const updated = updateRun(runId, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy: userId,
    clinicianNote,
  })

  res.json({ run: updated })
})

// Deferred (not MVP): triple combinations, lab-linked auto-triggers, receptor burden, country-specific rules.
