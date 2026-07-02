import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiJobPhase } from '../../shared/aiJobs'
import { isTerminalAiJobStatus } from '../../shared/aiJobs'
import { useAiJobsOptional } from '../contexts/AiJobsContext'
import {
  cancelAiJob,
  createAiJob,
  getAiJob,
  resolveAiJobResultText,
  type CreateAiJobInput,
} from '../services/aiJobsApi'

/**
 * Runs one persisted AI job and exposes live progress for inline widgets
 * (paste → summarize tools). `start()` resolves with the result text when the
 * job succeeds, `null` when the user cancels or sends it to the background
 * (the job keeps running server-side; the global AiJobsIndicator takes over),
 * and rejects on failure.
 */

export interface AiJobProgress {
  jobId: string
  phase: AiJobPhase
  progressCurrent: number
  progressTotal: number
  startedAt: string
}

const POLL_INTERVAL_MS = 1_500

export function useAiJobRunner() {
  const aiJobsCtx = useAiJobsOptional()
  const [progress, setProgress] = useState<AiJobProgress | null>(null)
  const activeRef = useRef<{
    jobId: string
    interval: ReturnType<typeof setInterval>
    settle: (result: string | null) => void
    fail: (error: Error) => void
  } | null>(null)

  const teardown = useCallback(() => {
    if (activeRef.current) clearInterval(activeRef.current.interval)
    activeRef.current = null
    setProgress(null)
  }, [])

  // Unmount = implicit background: the job continues; the indicator shows it.
  useEffect(() => {
    return () => {
      if (activeRef.current) clearInterval(activeRef.current.interval)
      activeRef.current = null
    }
  }, [])

  const start = useCallback(
    async (input: CreateAiJobInput): Promise<string | null> => {
      if (activeRef.current) return null
      const job = await createAiJob(input)
      void aiJobsCtx?.refresh()
      setProgress({
        jobId: job.id,
        phase: job.phase,
        progressCurrent: job.progressCurrent,
        progressTotal: job.progressTotal,
        startedAt: job.createdAt,
      })

      return await new Promise<string | null>((resolve, reject) => {
        const interval = setInterval(async () => {
          let current
          try {
            current = await getAiJob(job.id)
          } catch {
            return // transient network error — keep polling
          }
          const active = activeRef.current
          if (!active || active.jobId !== job.id) return

          if (!isTerminalAiJobStatus(current.status)) {
            setProgress({
              jobId: current.id,
              phase: current.phase,
              progressCurrent: current.progressCurrent,
              progressTotal: current.progressTotal,
              startedAt: current.startedAt ?? job.createdAt,
            })
            return
          }

          teardown()
          void aiJobsCtx?.refresh()
          if (current.status === 'succeeded') {
            void aiJobsCtx?.markSeen([current.id])
            resolve(resolveAiJobResultText(current))
          } else if (current.status === 'cancelled') {
            resolve(null)
          } else {
            reject(new Error(current.errorMessage || 'AI generation failed'))
          }
        }, POLL_INTERVAL_MS)

        activeRef.current = { jobId: job.id, interval, settle: resolve, fail: reject }
      })
    },
    [aiJobsCtx, teardown],
  )

  /** Stop waiting locally; the job continues and lands in the indicator. */
  const continueInBackground = useCallback(() => {
    const active = activeRef.current
    if (!active) return
    active.settle(null)
    teardown()
    void aiJobsCtx?.refresh()
  }, [aiJobsCtx, teardown])

  const cancel = useCallback(() => {
    const active = activeRef.current
    if (!active) return
    const jobId = active.jobId
    active.settle(null)
    teardown()
    void cancelAiJob(jobId)
      .catch(() => undefined)
      .finally(() => void aiJobsCtx?.refresh())
  }, [aiJobsCtx, teardown])

  return { progress, start, continueInBackground, cancel }
}
