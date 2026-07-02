import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AiJobDto } from '../../shared/aiJobs'
import { isTerminalAiJobStatus } from '../../shared/aiJobs'
import {
  cancelAiJob,
  createAiJob,
  listAiJobs,
  markAiJobsSeen,
  retryAiJob,
  type CreateAiJobInput,
} from '../services/aiJobsApi'
import { showNotionToast } from '../components/notion/NotionToast'
import { translateUi } from '../data/uiTranslations'
import type { UiLanguage } from '../types/settings'

/**
 * Global registry of persisted AI jobs.
 *
 * Polls `/api/ai-jobs` while any job is queued/running (the poll doubles as
 * the Cloud Run CPU heartbeat for the in-process runner), fires a toast when a
 * job reaches a terminal state, and feeds the AiJobsIndicator badge. Jobs are
 * server-persisted; this context is a live view, not the source of truth.
 */

const POLL_INTERVAL_MS = 2_000
/** One slow refresh after mount so results finished while away are surfaced. */
const RECENT_LIMIT = 20

interface AiJobsContextValue {
  jobs: AiJobDto[]
  /** Jobs currently queued or running. */
  activeJobs: AiJobDto[]
  /** Terminal jobs the user has not acknowledged yet (badge). */
  unseenJobs: AiJobDto[]
  startJob: (input: CreateAiJobInput) => Promise<AiJobDto>
  cancelJob: (jobId: string) => Promise<void>
  retryJob: (jobId: string) => Promise<void>
  markSeen: (jobIds: string[]) => Promise<void>
  refresh: () => Promise<void>
}

const AiJobsContext = createContext<AiJobsContextValue | null>(null)

export function AiJobsProvider({
  children,
  language,
}: {
  children: ReactNode
  language: UiLanguage
}) {
  const [jobs, setJobs] = useState<AiJobDto[]>([])
  const jobsRef = useRef<AiJobDto[]>([])
  const languageRef = useRef(language)
  languageRef.current = language

  const applyJobs = useCallback((next: AiJobDto[]) => {
    const previous = jobsRef.current
    for (const job of next) {
      const before = previous.find((item) => item.id === job.id)
      if (before && !isTerminalAiJobStatus(before.status) && isTerminalAiJobStatus(job.status)) {
        const lang = languageRef.current
        if (job.status === 'succeeded') {
          showNotionToast(translateUi(lang, 'aiJobFinishedToast'))
        } else if (job.status === 'failed') {
          showNotionToast(translateUi(lang, 'aiJobFailedToast'))
        }
      }
    }
    jobsRef.current = next
    setJobs(next)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const next = await listAiJobs({ limit: RECENT_LIMIT })
      applyJobs(next)
    } catch {
      // Unauthenticated or offline — the view simply stays empty/stale.
    }
  }, [applyJobs])

  // Initial load (also surfaces jobs that finished while the user was away).
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Poll while anything is active.
  const hasActive = jobs.some((job) => !isTerminalAiJobStatus(job.status))
  useEffect(() => {
    if (!hasActive) return
    const interval = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [hasActive, refresh])

  const startJob = useCallback(
    async (input: CreateAiJobInput) => {
      const job = await createAiJob(input)
      jobsRef.current = [job, ...jobsRef.current.filter((item) => item.id !== job.id)]
      setJobs(jobsRef.current)
      return job
    },
    [],
  )

  const cancelJob = useCallback(async (jobId: string) => {
    const job = await cancelAiJob(jobId)
    jobsRef.current = jobsRef.current.map((item) => (item.id === job.id ? job : item))
    setJobs(jobsRef.current)
  }, [])

  const retryJob = useCallback(async (jobId: string) => {
    const job = await retryAiJob(jobId)
    jobsRef.current = jobsRef.current.map((item) => (item.id === job.id ? job : item))
    setJobs(jobsRef.current)
  }, [])

  const markSeen = useCallback(async (jobIds: string[]) => {
    if (!jobIds.length) return
    jobsRef.current = jobsRef.current.map((item) =>
      jobIds.includes(item.id) ? { ...item, seen: true } : item,
    )
    setJobs(jobsRef.current)
    await markAiJobsSeen(jobIds).catch(() => undefined)
  }, [])

  const value = useMemo<AiJobsContextValue>(() => {
    const activeJobs = jobs.filter((job) => !isTerminalAiJobStatus(job.status))
    const unseenJobs = jobs.filter((job) => isTerminalAiJobStatus(job.status) && !job.seen)
    return { jobs, activeJobs, unseenJobs, startJob, cancelJob, retryJob, markSeen, refresh }
  }, [jobs, startJob, cancelJob, retryJob, markSeen, refresh])

  return <AiJobsContext.Provider value={value}>{children}</AiJobsContext.Provider>
}

export function useAiJobs(): AiJobsContextValue {
  const value = useContext(AiJobsContext)
  if (!value) throw new Error('useAiJobs must be used within AiJobsProvider')
  return value
}

/** Optional variant for components that may render outside the provider. */
export function useAiJobsOptional(): AiJobsContextValue | null {
  return useContext(AiJobsContext)
}
