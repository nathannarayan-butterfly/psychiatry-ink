import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiFeatureKey } from '../../src/types/aiUsage'
import type { AiJobParams, AiOutputLengthSpec } from '../../shared/aiJobs'
import {
  CUSTOM_TARGET_WORDS_MAX,
  CUSTOM_TARGET_WORDS_MIN,
  isTerminalAiJobStatus,
} from '../../shared/aiJobs'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { estimateCredits, estimateTokensFromText } from '../ai/creditCalculator'
import { checkBalance, InsufficientCreditsError } from '../ai/creditGuard'
import { assertAccess } from '../services/subscriptionAccess'
import { parseMode } from '../ai/aiRouter'
import { applyServerPhiGuard } from './generate'
import {
  createAiJob,
  getAiJob,
  isAiJobStoreConfigured,
  listAiJobs,
  toDto,
  updateAiJob,
} from '../services/aiJobs/aiJobStore'
import { enqueueAiJob } from '../services/aiJobs/aiJobRunner'

/**
 * Persisted AI jobs — see `server/services/aiJobs/`.
 *
 * POST   /api/ai-jobs            create + start a job (202)
 * GET    /api/ai-jobs            list own jobs (?active=1, ?caseId=, ?limit=)
 * GET    /api/ai-jobs/:id        poll status/result
 * POST   /api/ai-jobs/:id/cancel cooperative cancel
 * POST   /api/ai-jobs/:id/retry  re-run a failed/cancelled job (persisted input)
 * POST   /api/ai-jobs/seen       mark terminal jobs as seen (badge)
 */

export const aiJobsRouter: Router = createRouter()

/** Long pasted documents are the point of this API — well above /api/generate. */
const MAX_INPUT_CHARS = 600_000
const MAX_DIRECTIONS_CHARS = 2_000

/**
 * Feature keys a client may bill a summarize job under. Restricting the set
 * prevents picking an arbitrary cheap rule; all listed keys allow all modes.
 */
const ALLOWED_FEATURE_KEYS: ReadonlySet<string> = new Set([
  'document_generation',
  'short_verlauf',
  'verlauf_generation',
  'full_case_summary',
  'anamnesis_structuring',
])

function parseLengthSpec(raw: unknown): AiOutputLengthSpec | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const spec = raw as { mode?: unknown; customTargetWords?: unknown }
  if (
    spec.mode !== 'kurz' &&
    spec.mode !== 'mittel' &&
    spec.mode !== 'gruendlich' &&
    spec.mode !== 'custom'
  ) {
    return undefined
  }
  if (spec.mode === 'custom') {
    const words = Number(spec.customTargetWords)
    if (
      !Number.isFinite(words) ||
      words < CUSTOM_TARGET_WORDS_MIN ||
      words > CUSTOM_TARGET_WORDS_MAX
    ) {
      return undefined
    }
    return { mode: 'custom', customTargetWords: Math.round(words) }
  }
  return { mode: spec.mode }
}

interface CreateJobBody {
  kind?: string
  caseId?: string
  featureKey?: string
  sourceText?: string
  tier?: string
  mode?: string
  maximum?: boolean
  language?: string
  componentId?: string
  tool?: string
  sectionLabel?: string
  length?: unknown
  directions?: string
  structured?: boolean
  autoSaveNote?: boolean
  patientHints?: { patientName?: string; patientDob?: string }
}

aiJobsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    if (!isAiJobStoreConfigured()) {
      res.status(503).json({ error: 'AI-Jobs sind nicht konfiguriert (Supabase fehlt).' })
      return
    }

    const body = req.body as CreateJobBody

    if (body.kind !== undefined && body.kind !== 'summarize') {
      res.status(400).json({ error: 'Unsupported job kind' })
      return
    }
    const sourceText = typeof body.sourceText === 'string' ? body.sourceText : ''
    if (!sourceText.trim()) {
      res.status(400).json({ error: 'sourceText required' })
      return
    }
    if (sourceText.length > MAX_INPUT_CHARS) {
      res.status(413).json({ error: 'Document too large' })
      return
    }
    const directions =
      typeof body.directions === 'string' ? body.directions.slice(0, MAX_DIRECTIONS_CHARS) : ''

    const caseId = typeof body.caseId === 'string' ? body.caseId.trim() || null : null
    if (!(await assertAiGenerationAllowed(req, res, caseId ?? undefined))) return

    const featureKey: AiFeatureKey | string = ALLOWED_FEATURE_KEYS.has(body.featureKey ?? '')
      ? (body.featureKey as string)
      : 'document_generation'

    const tier =
      body.tier === 'fast' || body.tier === 'standard' || body.tier === 'thorough'
        ? body.tier
        : 'thorough'
    const maximum = body.maximum === true
    const mode = maximum ? 'gruendlich' : parseMode(body.mode ?? null, 'gruendlich')
    const language =
      body.language === 'de' || body.language === 'en' || body.language === 'fr' || body.language === 'es'
        ? body.language
        : 'de'

    // PHI floor before persisting: the job row may never store more than the
    // LLM provider would be allowed to see.
    let scrubbed: { systemPrompt: string; userPrompt: string }
    try {
      scrubbed = applyServerPhiGuard({
        systemPrompt: directions,
        userPrompt: sourceText,
        patientHints: body.patientHints,
      })
    } catch (guardError) {
      console.error('[ai-jobs] PHI guard failed, refusing job:', guardError)
      res.status(422).json({ error: 'PHI-Schutz konnte die Eingabe nicht bereinigen.' })
      return
    }

    // Fast-fail on obviously insufficient credits before creating the job.
    // The per-call guard inside the pipeline stays authoritative (fail-closed
    // in production); infrastructure hiccups here must not block job creation.
    try {
      await assertAccess(userId)
      await checkBalance(
        userId,
        estimateCredits(featureKey, mode, estimateTokensFromText(scrubbed.userPrompt)),
      )
    } catch (creditError) {
      if (creditError instanceof InsufficientCreditsError) {
        res.status(402).json({ error: creditError.message })
        return
      }
    }

    const params: AiJobParams = {
      tier: maximum ? 'thorough' : tier,
      mode,
      maximum,
      language,
      componentId: typeof body.componentId === 'string' ? body.componentId.slice(0, 80) : undefined,
      tool: typeof body.tool === 'string' ? body.tool.slice(0, 40) : undefined,
      sectionLabel:
        typeof body.sectionLabel === 'string' ? body.sectionLabel.slice(0, 120) : undefined,
      length: parseLengthSpec(body.length),
      directions: scrubbed.systemPrompt.trim() || undefined,
      structured: body.structured === true,
      // Patient-less results are durably auto-saved unless explicitly disabled.
      autoSaveNote: body.autoSaveNote !== false && !caseId,
    }

    const job = await createAiJob({
      userId,
      caseId,
      kind: 'summarize',
      featureKey,
      params,
      inputText: scrubbed.userPrompt,
    })

    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId,
      featureKey: featureKey as AiFeatureKey,
      metadata: { route: 'ai-jobs', jobId: job.id, tier: params.tier },
    })

    enqueueAiJob(job, usageContext)
    void recordAiGenerationUsed(req, userId, {
      caseId,
      metadata: { route: 'ai-jobs', jobId: job.id },
    })

    res.status(202).json({ job: toDto(job) })
  } catch (error) {
    console.error('[ai-jobs] create failed:', error)
    res.status(500).json({ error: 'AI-Job konnte nicht erstellt werden.' })
  }
})

aiJobsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    if (!isAiJobStoreConfigured()) {
      res.json({ jobs: [] })
      return
    }

    const active = req.query.active === '1' || req.query.active === 'true'
    const caseId = typeof req.query.caseId === 'string' ? req.query.caseId.trim() : undefined
    const limit = Math.min(Number(req.query.limit) || 20, 50)

    const jobs = await listAiJobs(userId, {
      statuses: active ? ['queued', 'running'] : undefined,
      caseId: caseId || undefined,
      limit,
    })
    res.json({ jobs: jobs.map(toDto) })
  } catch (error) {
    console.error('[ai-jobs] list failed:', error)
    res.status(500).json({ error: 'AI-Jobs konnten nicht geladen werden.' })
  }
})

// Batch seen-marking must be registered before `/:id`.
aiJobsRouter.post('/seen', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const ids = Array.isArray((req.body as { ids?: unknown }).ids)
      ? ((req.body as { ids: unknown[] }).ids.filter((id) => typeof id === 'string') as string[])
      : []
    for (const id of ids.slice(0, 50)) {
      await updateAiJob(userId, id, { seen: true }).catch(() => undefined)
    }
    res.json({ ok: true })
  } catch (error) {
    console.error('[ai-jobs] seen failed:', error)
    res.status(500).json({ error: 'Aktualisierung fehlgeschlagen.' })
  }
})

aiJobsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const job = await getAiJob(userId, String(req.params.id))
    if (!job) {
      res.status(404).json({ error: 'Job nicht gefunden' })
      return
    }
    res.json({ job: toDto(job) })
  } catch (error) {
    console.error('[ai-jobs] get failed:', error)
    res.status(500).json({ error: 'AI-Job konnte nicht geladen werden.' })
  }
})

aiJobsRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const job = await getAiJob(userId, String(req.params.id))
    if (!job) {
      res.status(404).json({ error: 'Job nicht gefunden' })
      return
    }
    if (isTerminalAiJobStatus(job.status)) {
      res.json({ job: toDto(job) })
      return
    }
    // Cooperative: the pipeline checks status between stages. A queued job
    // is skipped by the executor's re-read before it starts.
    const updated = await updateAiJob(userId, job.id, {
      status: 'cancelled',
      finishedAt: new Date().toISOString(),
    })
    res.json({ job: updated ? toDto(updated) : toDto(job) })
  } catch (error) {
    console.error('[ai-jobs] cancel failed:', error)
    res.status(500).json({ error: 'Abbruch fehlgeschlagen.' })
  }
})

aiJobsRouter.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const job = await getAiJob(userId, String(req.params.id))
    if (!job) {
      res.status(404).json({ error: 'Job nicht gefunden' })
      return
    }
    if (job.status !== 'failed' && job.status !== 'cancelled') {
      res.status(409).json({ error: 'Nur fehlgeschlagene oder abgebrochene Jobs können erneut gestartet werden.' })
      return
    }
    if (!(await assertAiGenerationAllowed(req, res, job.caseId ?? undefined))) return

    const reset = await updateAiJob(userId, job.id, {
      status: 'queued',
      phase: 'queued',
      progressCurrent: 0,
      progressTotal: 0,
      resultText: null,
      resultMeta: null,
      errorCode: null,
      errorMessage: null,
      seen: false,
      startedAt: null,
      finishedAt: null,
    })
    if (!reset) {
      res.status(404).json({ error: 'Job nicht gefunden' })
      return
    }

    const usageContext = await resolveUsageContextFromRequest(req, userId, {
      caseId: reset.caseId,
      featureKey: reset.featureKey as AiFeatureKey,
      metadata: { route: 'ai-jobs', jobId: reset.id, retry: true },
    })
    enqueueAiJob(reset, usageContext)
    res.status(202).json({ job: toDto(reset) })
  } catch (error) {
    console.error('[ai-jobs] retry failed:', error)
    res.status(500).json({ error: 'Erneuter Start fehlgeschlagen.' })
  }
})
