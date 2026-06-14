import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import {
  assessLabCorrelationWithAi,
  assessLabCorrelationsBatchWithAi,
} from '../services/labMedicationCorrelationAi'
import {
  compareTemporalPlausibility,
  correlationStrengthsConflict,
  lookupMedicationLabCorrelation,
} from '../services/labMedicationCorrelationKb'
import { resolveSubstances } from '../services/combinationCheckKb'
import { recordUserAuditLog } from '../services/auditLog'
import { canAccessCase, getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import {
  assertAiGenerationAllowed,
  recordAiGenerationUsed,
} from '../utils/caseAiAccessGuard'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { requireClinicalLanguage } from '../utils/resolveClinicalLanguage'
import type {
  LabBefundSnapshotInput,
  LabCorrelationAIResult,
  LabCorrelationAIRun,
  LabCorrelationMedicationInput,
  LabMedicationCorrelationRunRequest,
  LabMedicationCorrelationRunResponse,
  LabObservationInput,
  PatientMedicationLabCorrelationFinding,
} from '../../src/types/labMedicationCorrelation'
import { buildCorrelationKey } from '../../src/utils/labMedicationCorrelation/correlationKey'
import { labParameterLabelDe } from '../../src/utils/labMedicationCorrelation/parameterNormalize'

export const labMedicationCorrelationRouter: Router = createRouter()

const pendingRuns = new Map<string, LabCorrelationAIRun>()
const pendingFindings = new Map<string, PatientMedicationLabCorrelationFinding>()

async function assertLabMedAccess(
  req: Request,
  res: Response,
  caseId: string,
  needsAi = false,
): Promise<boolean> {
  if (!requireRouteAuth(req, res)) return false
  const userId = resolveAccountId(req)
  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  const medOk = await canAccessCase(userId, caseId, 'medication.view', org?.id)
  const labOk = await canAccessCase(userId, caseId, 'labs.view', org?.id)
  if (!medOk || !labOk) {
    res.status(403).json({ error: 'Keine Berechtigung für Medikations- oder Labordaten' })
    return false
  }
  if (needsAi && !(await assertAiGenerationAllowed(req, res, caseId))) return false
  return true
}

function activeMedications(meds: LabCorrelationMedicationInput[]): LabCorrelationMedicationInput[] {
  return meds.filter((m) => {
    const s = m.status.toLowerCase()
    return s === 'active' || s === 'reduced' || s === 'increased'
  })
}

function abnormalObservations(labs: LabObservationInput[]): LabObservationInput[] {
  return labs.filter((l) => l.abnormality !== 'normal')
}

function latestParametersFromSnapshots(snapshots: LabBefundSnapshotInput[]): LabObservationInput[] {
  const latest = snapshots[0]
  if (!latest) return []
  return latest.parameters.map((param) => ({
    parameterName: param.parameterName,
    normalizedParameter: param.normalizedParameter,
    value: param.value,
    numericValue: param.numericValue,
    unit: param.unit,
    refMin: param.refMin,
    refMax: param.refMax,
    refText: param.refText,
    abnormality: param.abnormality,
    labDate: latest.labDate,
    befundId: latest.befundId,
  }))
}

function formatRefRange(lab: LabObservationInput): string | undefined {
  if (lab.refText?.trim()) return lab.refText.trim()
  if (lab.refMin != null && lab.refMax != null) return `${lab.refMin}–${lab.refMax}`
  if (lab.refMin != null) return `≥ ${lab.refMin}`
  if (lab.refMax != null) return `≤ ${lab.refMax}`
  return undefined
}

function kbFinding(
  caseId: string,
  med: LabCorrelationMedicationInput,
  lab: LabObservationInput,
  kb: NonNullable<ReturnType<typeof lookupMedicationLabCorrelation>>,
  substanceId: string,
): PatientMedicationLabCorrelationFinding {
  const now = new Date().toISOString()
  const correlationKey = buildCorrelationKey(substanceId, lab.normalizedParameter)
  return {
    id: crypto.randomUUID(),
    caseId,
    correlationKey,
    labParameter: lab.normalizedParameter,
    labParameterLabel: kb.labParameterLabelDe || labParameterLabelDe(lab.normalizedParameter),
    labValue: lab.value,
    labUnit: lab.unit,
    refRange: formatRefRange(lab),
    abnormality: lab.abnormality,
    labDate: lab.labDate,
    trend: lab.trend,
    substanceId,
    substanceName: med.substance,
    medicationId: med.id,
    medStartDate: med.startDate,
    lastDoseChangeDate: med.lastChangeAt,
    temporalPlausibility: compareTemporalPlausibility(med.startDate, med.lastChangeAt, lab.labDate),
    zusammenhang: kb.zusammenhang,
    mechanism: kb.mechanism,
    recommendation: kb.recommendation,
    monitoring: kb.monitoring,
    alternatives: kb.alternatives,
    correlationStrength: kb.correlationStrength,
    source: 'knowledge_base',
    status: 'verified_kb',
    kbResult: kb,
    provenance: 'Interne Wissensdatenbank',
    createdAt: now,
    updatedAt: now,
  }
}

function aiPendingFinding(
  caseId: string,
  med: LabCorrelationMedicationInput,
  lab: LabObservationInput,
  run: LabCorrelationAIRun,
  substanceId: string,
  hasConflict: boolean,
  kbResult?: PatientMedicationLabCorrelationFinding['kbResult'],
): PatientMedicationLabCorrelationFinding {
  const now = new Date().toISOString()
  const result = run.outputJson
  return {
    id: run.findingId,
    caseId,
    correlationKey: run.correlationKey,
    labParameter: lab.normalizedParameter,
    labParameterLabel: result.labParameterLabelDe || labParameterLabelDe(lab.normalizedParameter),
    labValue: lab.value,
    labUnit: lab.unit,
    refRange: formatRefRange(lab),
    abnormality: lab.abnormality,
    labDate: lab.labDate,
    trend: lab.trend,
    substanceId,
    substanceName: med.substance,
    medicationId: med.id,
    medStartDate: med.startDate,
    lastDoseChangeDate: med.lastChangeAt,
    temporalPlausibility: result.temporalPlausibility ?? compareTemporalPlausibility(med.startDate, med.lastChangeAt, lab.labDate),
    zusammenhang: result.zusammenhang,
    mechanism: result.mechanism,
    recommendation: result.recommendation,
    monitoring: result.monitoring,
    alternatives: result.alternatives,
    correlationStrength: result.correlationStrength,
    source: 'ai_suggestion',
    status: 'pending_clinician_review',
    aiResult: run.provider === 'deepseek' ? result : undefined,
    openaiResult: run.provider === 'openai' ? result : undefined,
    kbResult,
    hasConflict,
    provenance: result.provenance ?? (run.provider === 'openai' ? 'OpenAI-Zweitprüfung' : 'DeepSeek KI-Vorschlag'),
    aiRunId: run.provider === 'deepseek' ? run.id : undefined,
    openaiRunId: run.provider === 'openai' ? run.id : undefined,
    createdAt: now,
    updatedAt: now,
  }
}

labMedicationCorrelationRouter.post('/run', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as LabMedicationCorrelationRunRequest
    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : ''
    if (!caseId) {
      res.status(400).json({ error: 'Missing caseId' })
      return
    }

    const meds = Array.isArray(body.medications) ? body.medications : []
    const snapshots = Array.isArray(body.lastTwoLabSnapshots) ? body.lastTwoLabSnapshots : []
    const labs = Array.isArray(body.labObservations) ? body.labObservations : []
    const active = activeMedications(meds)
    const abnormal = abnormalObservations(labs)

    if (active.length === 0) {
      res.json({
        findings: [],
        aiRuns: [],
        aiWarning: 'Keine aktiven Medikamente für die Korrelationsprüfung.',
      } satisfies LabMedicationCorrelationRunResponse)
      return
    }

    if (snapshots.length === 0) {
      res.json({
        findings: [],
        aiRuns: [],
        aiWarning: 'Keine Laborwerte vorhanden — bitte zuerst Laborbefunde erfassen.',
      } satisfies LabMedicationCorrelationRunResponse)
      return
    }

    if (!(await assertLabMedAccess(req, res, caseId))) return

    const language = requireClinicalLanguage(req, res, body.language)
    if (!language) return

    const labsForPairs = abnormal.length > 0 ? abnormal : latestParametersFromSnapshots(snapshots)
    const infoNote =
      abnormal.length === 0
        ? 'Keine auffälligen Laborwerte — KI kann dennoch Zusammenhänge prüfen.'
        : undefined

    const substanceNames = active.map((m) => m.substance.trim()).filter(Boolean)
    const resolved = await resolveSubstances(substanceNames)
    const resolvedByName = new Map(resolved.map((r) => [r.inputName.toLowerCase(), r]))

    const findings: PatientMedicationLabCorrelationFinding[] = []
    const aiRuns: LabCorrelationAIRun[] = []
    const targetKey = typeof body.correlationKey === 'string' ? body.correlationKey.trim() : ''

    let needsAi = false
    let anyKbHit = false
    const pairs: {
      med: LabCorrelationMedicationInput
      lab: LabObservationInput
      substanceId: string
      correlationKey: string
      kbHit: ReturnType<typeof lookupMedicationLabCorrelation>
      kbIncomplete: boolean
    }[] = []

    for (const med of active) {
      const substance = resolvedByName.get(med.substance.trim().toLowerCase())
      const substanceId = substance?.substanceId ?? `name:${med.substance.trim().toLowerCase()}`
      for (const lab of labsForPairs) {
        const correlationKey = buildCorrelationKey(substanceId, lab.normalizedParameter)
        if (targetKey && correlationKey !== targetKey) continue

        const kbHit = substance
          ? lookupMedicationLabCorrelation(substance, lab.normalizedParameter)
          : null
        const kbIncomplete = !kbHit || kbHit.correlationStrength === 'none' || !kbHit.mechanism

        if (kbHit && kbHit.correlationStrength !== 'none') {
          anyKbHit = true
          findings.push(kbFinding(caseId, med, lab, kbHit, substanceId))
        }

        if (kbIncomplete) needsAi = true
        pairs.push({ med, lab, substanceId, correlationKey, kbHit, kbIncomplete })
      }
    }

    if (!anyKbHit && snapshots.length > 0) {
      needsAi = true
    }

    if (needsAi) {
      if (!(await assertLabMedAccess(req, res, caseId, true))) return
    }

    const focusPairs = pairs
      .filter((p) => p.kbIncomplete)
      .map((p) => ({
        substanceId: p.substanceId,
        substanceName: p.med.substance,
        labParameter: p.lab.normalizedParameter,
        labParameterLabel: labParameterLabelDe(p.lab.normalizedParameter),
        kbHint: p.kbHit ?? null,
      }))

    let aiParseFailed = false
    if (needsAi && focusPairs.length > 0) {
      const batch = await assessLabCorrelationsBatchWithAi({
        medications: active,
        lastTwoLabSnapshots: snapshots,
        abnormalParameters: abnormal,
        clinicalNotes: body.clinicalNotes,
        focusPairs,
        resolvedByName,
        language,
      })

      if (batch.parseFailed) {
        aiParseFailed = true
      }

      for (const aiResult of batch.results) {
        const pair = pairs.find(
          (p) =>
            p.correlationKey === aiResult.correlationKey ||
            (p.med.substance.toLowerCase() === aiResult.substanceName.toLowerCase() &&
              p.lab.normalizedParameter === aiResult.labParameter),
        )
        if (!pair) continue

        const hasConflict = pair.kbHit
          ? correlationStrengthsConflict(pair.kbHit.correlationStrength, aiResult.correlationStrength)
          : false
        const findingId = crypto.randomUUID()
        const run: LabCorrelationAIRun = {
          id: crypto.randomUUID(),
          caseId,
          findingId,
          correlationKey: pair.correlationKey,
          provider: 'deepseek',
          status: 'pending_clinician_review',
          inputSnapshot: {
            medications: active,
            lastTwoLabSnapshots: snapshots,
            abnormalParameters: abnormal,
            medication: pair.med,
            lab: pair.lab,
            clinicalNotes: body.clinicalNotes ?? null,
          },
          outputJson: aiResult,
          dbResult: pair.kbHit,
          hasConflict,
          createdAt: new Date().toISOString(),
        }
        pendingRuns.set(run.id, run)

        const finding = aiPendingFinding(
          caseId,
          pair.med,
          pair.lab,
          run,
          pair.substanceId,
          hasConflict,
          pair.kbHit ?? undefined,
        )
        pendingFindings.set(finding.id, finding)
        aiRuns.push(run)

        if (hasConflict && pair.kbHit) {
          findings.push(kbFinding(caseId, pair.med, pair.lab, pair.kbHit, pair.substanceId))
        }
        findings.push(finding)

        const userId = resolveAccountId(req)
        if (userId && userId !== 'default') {
          void recordAiGenerationUsed(req, userId, {
            caseId,
            metadata: {
              route: 'lab-med-correlation',
              correlationKey: pair.correlationKey,
              provider: 'deepseek',
              hasConflict,
            },
          })
        }
      }
    }

    let aiWarning: string | undefined
    if (needsAi && aiRuns.length === 0) {
      aiWarning = aiParseFailed
        ? 'KI-Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen.'
        : 'Keine KI-Vorschläge für die geprüften Labor-Medikament-Paare.'
    }

    res.json({
      findings,
      aiRuns,
      ...(infoNote ? { infoNote } : {}),
      ...(aiWarning ? { aiWarning } : {}),
    } satisfies LabMedicationCorrelationRunResponse)
  } catch (error) {
    console.error('[lab-med-correlation/run] failed:', error)
    res.status(500).json({ error: 'Korrelationsprüfung fehlgeschlagen' })
  }
})

labMedicationCorrelationRouter.get('/:caseId', async (req: Request, res: Response) => {
  const caseId = String(req.params.caseId ?? '').trim()
  if (!caseId) {
    res.status(400).json({ error: 'Missing caseId' })
    return
  }
  if (!(await assertLabMedAccess(req, res, caseId))) return

  const runs = [...pendingRuns.values()].filter((r) => r.caseId === caseId)
  const findings = [...pendingFindings.values()].filter((f) => f.caseId === caseId)
  res.json({ findings, aiRuns: runs })
})

function updateRun(runId: string, patch: Partial<LabCorrelationAIRun>): LabCorrelationAIRun | null {
  const existing = pendingRuns.get(runId)
  if (!existing) return null
  const next = { ...existing, ...patch }
  pendingRuns.set(runId, next)
  return next
}

function acceptedFindingFromRun(
  run: LabCorrelationAIRun,
  acceptedResult: LabCorrelationAIResult,
  clinicianNote?: string,
): PatientMedicationLabCorrelationFinding | null {
  const base = pendingFindings.get(run.findingId)
  if (!base) return null
  const now = new Date().toISOString()
  return {
    ...base,
    zusammenhang: acceptedResult.zusammenhang,
    mechanism: acceptedResult.mechanism,
    recommendation: acceptedResult.recommendation,
    monitoring: acceptedResult.monitoring,
    alternatives: acceptedResult.alternatives,
    correlationStrength: acceptedResult.correlationStrength,
    temporalPlausibility: acceptedResult.temporalPlausibility ?? base.temporalPlausibility,
    source: 'clinician_accepted',
    status: 'accepted',
    aiResult: run.provider === 'deepseek' ? acceptedResult : base.aiResult,
    openaiResult: run.provider === 'openai' ? acceptedResult : base.openaiResult,
    clinicianNote,
    provenance: run.provider === 'openai' ? 'OpenAI-Zweitprüfung (akzeptiert)' : 'DeepSeek KI (akzeptiert)',
    updatedAt: now,
  }
}

async function auditDecision(
  req: Request,
  userId: string,
  caseId: string,
  findingId: string,
  action: 'accept' | 'reject' | 'openai_second_opinion',
  metadata?: Record<string, unknown>,
): Promise<void> {
  void recordUserAuditLog(userId, {
    action: 'ai_generation_used',
    caseId,
    metadata: {
      route: 'lab-med-correlation',
      decision: action,
      findingId,
      ...metadata,
    },
    req,
    organisationIdHeader: req.headers[ORG_HEADER],
  })
}

labMedicationCorrelationRouter.post('/:findingId/accept', async (req: Request, res: Response) => {
  const userId = requireRouteAuth(req, res)
  if (!userId) return

  const findingId = String(req.params.findingId ?? '').trim()
  const finding = pendingFindings.get(findingId)
  if (!finding) {
    res.status(404).json({ error: 'Finding not found' })
    return
  }
  if (!(await assertLabMedAccess(req, res, finding.caseId))) return

  const runId = finding.openaiRunId ?? finding.aiRunId
  if (!runId) {
    res.status(400).json({ error: 'No pending AI run for finding' })
    return
  }
  const run = pendingRuns.get(runId)
  if (!run) {
    res.status(404).json({ error: 'AI run not found' })
    return
  }

  const edited = req.body?.editedResult
  const clinicianNote = typeof req.body?.clinicianNote === 'string' ? req.body.clinicianNote.trim() : undefined
  const acceptedResult =
    edited && typeof edited === 'object' ? (edited as LabCorrelationAIResult) : run.outputJson

  const updated = updateRun(runId, {
    status: 'accepted',
    reviewedAt: new Date().toISOString(),
    reviewedBy: userId,
    clinicianNote,
    editedResult: edited && typeof edited === 'object' ? acceptedResult : undefined,
  })

  const accepted = acceptedFindingFromRun(run, acceptedResult, clinicianNote)
  if (accepted) {
    pendingFindings.set(findingId, accepted)
  }

  await auditDecision(req, userId, finding.caseId, findingId, 'accept', {
    provider: run.provider,
    correlationKey: run.correlationKey,
  })

  res.json({ run: updated, finding: accepted })
})

labMedicationCorrelationRouter.post('/:findingId/reject', async (req: Request, res: Response) => {
  const userId = requireRouteAuth(req, res)
  if (!userId) return

  const findingId = String(req.params.findingId ?? '').trim()
  const finding = pendingFindings.get(findingId)
  if (!finding) {
    res.status(404).json({ error: 'Finding not found' })
    return
  }
  if (!(await assertLabMedAccess(req, res, finding.caseId))) return

  const runId = finding.aiRunId
  if (!runId) {
    res.status(400).json({ error: 'No DeepSeek run to reject' })
    return
  }
  const run = pendingRuns.get(runId)
  if (!run) {
    res.status(404).json({ error: 'AI run not found' })
    return
  }

  const clinicianNote = typeof req.body?.clinicianNote === 'string' ? req.body.clinicianNote.trim() : undefined
  const updated = updateRun(runId, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy: userId,
    clinicianNote,
  })

  const rejected: PatientMedicationLabCorrelationFinding = {
    ...finding,
    status: 'rejected',
    deepseekRejected: true,
    clinicianNote,
    updatedAt: new Date().toISOString(),
  }
  pendingFindings.set(findingId, rejected)

  await auditDecision(req, userId, finding.caseId, findingId, 'reject', {
    provider: 'deepseek',
    correlationKey: run.correlationKey,
  })

  res.json({ run: updated, finding: rejected })
})

labMedicationCorrelationRouter.post('/:findingId/openai-second-opinion', async (req: Request, res: Response) => {
  const userId = requireRouteAuth(req, res)
  if (!userId) return

  const findingId = String(req.params.findingId ?? '').trim()
  const finding = pendingFindings.get(findingId)
  if (!finding) {
    res.status(404).json({ error: 'Finding not found' })
    return
  }
  if (!(await assertLabMedAccess(req, res, finding.caseId, true))) return

  if (!finding.deepseekRejected && finding.status !== 'rejected') {
    res.status(400).json({ error: 'OpenAI-Zweitprüfung nur nach Verwerfen des DeepSeek-Vorschlags' })
    return
  }
  if (finding.openaiRunId) {
    res.status(400).json({ error: 'OpenAI-Zweitprüfung bereits gestartet' })
    return
  }

  const snapshot = finding.aiRunId ? pendingRuns.get(finding.aiRunId)?.inputSnapshot : null
  const med = snapshot?.medication as LabCorrelationMedicationInput | undefined
  const lab = snapshot?.lab as LabObservationInput | undefined
  if (!med || !lab) {
    res.status(400).json({ error: 'Ungültiger Eingabe-Snapshot' })
    return
  }

  const priorAi = finding.aiResult ?? null
  const language = requireClinicalLanguage(req, res, req.body?.language)
  if (!language) return
  const aiResult = await assessLabCorrelationWithAi({
    med,
    lab,
    kbHint: finding.kbResult ?? null,
    provider: 'openai',
    priorAiResult: priorAi,
    substanceId: finding.substanceId,
    clinicalNotes: typeof snapshot?.clinicalNotes === 'string' ? snapshot.clinicalNotes : undefined,
    language,
  })

  if (!aiResult) {
    res.status(502).json({ error: 'OpenAI-Zweitprüfung fehlgeschlagen' })
    return
  }

  const hasConflict = finding.kbResult
    ? correlationStrengthsConflict(finding.kbResult.correlationStrength, aiResult.correlationStrength)
    : false

  const run: LabCorrelationAIRun = {
    id: crypto.randomUUID(),
    caseId: finding.caseId,
    findingId,
    correlationKey: finding.correlationKey,
    provider: 'openai',
    status: 'pending_clinician_review',
    inputSnapshot: snapshot ?? {},
    outputJson: aiResult,
    dbResult: finding.kbResult ?? null,
    hasConflict,
    createdAt: new Date().toISOString(),
  }
  pendingRuns.set(run.id, run)

  const updatedFinding: PatientMedicationLabCorrelationFinding = {
    ...finding,
    status: 'pending_clinician_review',
    openaiResult: aiResult,
    openaiRunId: run.id,
    hasConflict: hasConflict || finding.hasConflict,
    provenance: 'OpenAI-Zweitprüfung (ausstehend)',
    updatedAt: new Date().toISOString(),
  }
  pendingFindings.set(findingId, updatedFinding)

  void recordAiGenerationUsed(req, userId, {
    caseId: finding.caseId,
    metadata: {
      route: 'lab-med-correlation',
      correlationKey: finding.correlationKey,
      provider: 'openai',
      secondOpinion: true,
    },
  })
  await auditDecision(req, userId, finding.caseId, findingId, 'openai_second_opinion', {
    provider: 'openai',
    correlationKey: finding.correlationKey,
  })

  res.json({ run, finding: updatedFinding })
})

// Deferred (not MVP): longitudinal trend clusters, cumulative burden, auto-run on lab import / med change.
