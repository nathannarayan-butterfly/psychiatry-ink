import type { AiUsageContext } from '../../ai/types'
import { InsufficientCreditsError, CreditInfrastructureError } from '../../ai/runAiFeature'
import { SafeLlmEgressError } from '../safeLlmEgress'
import { upsertUserNote } from '../userNotesStore'
import type { AiJobRow } from './aiJobStore'
import {
  failStaleActiveJobs,
  isAiJobStoreConfigured,
  readAiJobStatus,
  updateAiJob,
} from './aiJobStore'
import {
  PipelineCancelledError,
  runSummarizePipeline,
} from './summarizePipeline'

/**
 * In-process executor for persisted AI jobs.
 *
 * The deployment is a single Cloud Run container, so a lightweight FIFO queue
 * with bounded concurrency is sufficient — no external broker. Job state lives
 * in Supabase (`ai_jobs`), so results survive navigation/refresh/logout; the
 * in-memory queue only carries "what this process should work on next".
 *
 * Crash semantics: if the process dies mid-job, boot recovery marks leftover
 * queued/running rows failed with `server_restart` so the client can offer a
 * one-click retry (the scrubbed input is persisted on the row).
 *
 * Cloud Run note: with default CPU throttling, background work only progresses
 * while requests are in flight. The client polls running jobs every ~2s, which
 * keeps the container supplied with CPU; for fully detached completion the
 * service should run with `--no-cpu-throttling`.
 */

const MAX_CONCURRENT_JOBS = Number(process.env.AI_JOBS_MAX_CONCURRENT ?? 2)

interface QueueEntry {
  job: AiJobRow
  usageContext: AiUsageContext
}

const queue: QueueEntry[] = []
const runningJobIds = new Set<string>()

export function enqueueAiJob(job: AiJobRow, usageContext: AiUsageContext): void {
  queue.push({ job, usageContext })
  setImmediate(pump)
}

function pump(): void {
  while (runningJobIds.size < MAX_CONCURRENT_JOBS && queue.length > 0) {
    const entry = queue.shift()
    if (!entry) break
    runningJobIds.add(entry.job.id)
    void executeJob(entry)
      .catch((error) => {
        // executeJob handles its own failures; this is a last-resort guard so
        // an unexpected throw can never wedge the queue slot.
        console.error(`[ai-jobs] unexpected executor error for job ${entry.job.id}:`, error)
      })
      .finally(() => {
        runningJobIds.delete(entry.job.id)
        setImmediate(pump)
      })
  }
}

const NOTE_TITLE_BY_LANGUAGE: Record<string, string> = {
  de: 'KI-Ergebnis',
  en: 'AI result',
  fr: 'Résultat IA',
  es: 'Resultado IA',
}

async function autoSaveResultNote(job: AiJobRow, resultText: string): Promise<string | null> {
  const language = job.params.language ?? 'de'
  const baseTitle = NOTE_TITLE_BY_LANGUAGE[language] ?? NOTE_TITLE_BY_LANGUAGE.de
  const label = job.params.sectionLabel?.trim() || job.params.componentId || ''
  const title = label ? `${baseTitle} – ${label}` : baseTitle
  // Category stays inside the client's DokumentCategory union so the note
  // renders in "Meine Notizen" without a client migration; the kind/pageType
  // mark it as an AI result.
  const note = await upsertUserNote(job.userId, {
    title,
    content: resultText,
    kind: 'ai-result',
    category: 'formulare',
    pageType: 'standalone:ai-result',
  })
  return note.id
}

async function executeJob(entry: QueueEntry): Promise<void> {
  const { job, usageContext } = entry

  // The user may have cancelled while the job sat in the queue.
  const current = await readAiJobStatus(job.userId, job.id).catch(() => null)
  if (current !== 'queued') return

  await updateAiJob(job.userId, job.id, {
    status: 'running',
    startedAt: new Date().toISOString(),
    attempts: job.attempts + 1,
  })

  try {
    const output = await runSummarizePipeline(
      {
        inputText: job.inputText,
        params: job.params,
        featureKey: job.featureKey,
        usageContext,
        caseRef: job.caseId,
      },
      {
        onPhase: async (phase, progressCurrent, progressTotal) => {
          await updateAiJob(job.userId, job.id, {
            phase,
            ...(progressCurrent !== undefined ? { progressCurrent } : {}),
            ...(progressTotal !== undefined ? { progressTotal } : {}),
          }).catch((error) => {
            console.warn(`[ai-jobs] phase update failed for ${job.id} (non-fatal):`, error)
          })
        },
        isCancelled: async () => {
          const status = await readAiJobStatus(job.userId, job.id).catch(() => null)
          return status === 'cancelled'
        },
      },
    )

    await updateAiJob(job.userId, job.id, { phase: 'saving' })

    // Patient-less jobs: durably save to "Meine Notizen" so nothing generated
    // outside a patient case can silently disappear. Failure is non-fatal —
    // the result also lives on the job row itself.
    let savedNoteId: string | null = null
    if (job.params.autoSaveNote && !job.caseId) {
      savedNoteId = await autoSaveResultNote(job, output.text).catch((error) => {
        console.warn(`[ai-jobs] auto-save note failed for ${job.id} (non-fatal):`, error)
        return null
      })
    }

    await updateAiJob(job.userId, job.id, {
      status: 'succeeded',
      phase: 'done',
      resultText: output.text,
      resultMeta: output.meta,
      savedNoteId,
      finishedAt: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof PipelineCancelledError) {
      await updateAiJob(job.userId, job.id, {
        status: 'cancelled',
        phase: 'done',
        finishedAt: new Date().toISOString(),
      }).catch(() => undefined)
      return
    }

    const { code, message } = classifyJobError(error)
    console.error(`[ai-jobs] job ${job.id} failed (${code}):`, error)
    await updateAiJob(job.userId, job.id, {
      status: 'failed',
      phase: 'done',
      errorCode: code,
      errorMessage: message,
      finishedAt: new Date().toISOString(),
    }).catch(() => undefined)
  }
}

function classifyJobError(error: unknown): { code: string; message: string } {
  if (error instanceof InsufficientCreditsError) {
    return { code: 'insufficient_credits', message: error.message }
  }
  if (error instanceof CreditInfrastructureError) {
    return { code: 'credit_infrastructure', message: error.message }
  }
  if (error instanceof SafeLlmEgressError) {
    // Never echo PHI-guard match previews into a persisted row.
    return {
      code: 'phi_blocked',
      message: 'Der PHI-Schutz hat die Weitergabe an den KI-Anbieter blockiert.',
    }
  }
  const raw = error instanceof Error ? error.message : String(error)
  return { code: 'llm_error', message: raw.slice(0, 500) }
}

const RECOVERY_MAX_ATTEMPTS = Number(process.env.AI_JOBS_RECOVERY_ATTEMPTS ?? 3)
const RECOVERY_BASE_DELAY_MS = Number(process.env.AI_JOBS_RECOVERY_DELAY_MS ?? 5_000)

/**
 * Boot-time recovery — call once at server start. Leftover queued/running rows
 * belong to a previous process and cannot resume mid-call.
 *
 * Retries with backoff: on Cloud Run cold start the first Supabase call can
 * race VPC egress warm-up ("fetch failed"), which must not skip recovery —
 * otherwise crash-orphaned jobs would sit in `running` until the TTL purge
 * instead of surfacing as retryable failures.
 */
export async function recoverStaleAiJobs(): Promise<void> {
  if (!isAiJobStoreConfigured()) return
  for (let attempt = 1; attempt <= RECOVERY_MAX_ATTEMPTS; attempt++) {
    try {
      const count = await failStaleActiveJobs()
      if (count > 0) console.warn(`[ai-jobs] marked ${count} stale job(s) failed after restart`)
      return
    } catch (error) {
      if (attempt === RECOVERY_MAX_ATTEMPTS) {
        console.warn(
          `[ai-jobs] stale-job recovery failed after ${RECOVERY_MAX_ATTEMPTS} attempts (non-fatal):`,
          error,
        )
        return
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * RECOVERY_BASE_DELAY_MS))
    }
  }
}
