import { Check, ChevronDown, Copy, Download, Loader2, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { AiJobDto, AiJobPhase } from '../../../shared/aiJobs'
import { isTerminalAiJobStatus } from '../../../shared/aiJobs'
import { useTranslation } from '../../context/TranslationContext'
import { useAiJobsOptional } from '../../contexts/AiJobsContext'
import { resolveAiJobResultText } from '../../services/aiJobsApi'
import { showNotionToast } from './NotionToast'

/**
 * Floating status pill for persisted AI jobs (bottom-right). Visible while a
 * job runs or an unseen finished job waits — the user can navigate anywhere
 * and still see progress (elapsed time + real pipeline step) and retrieve
 * results. No fake progress percentages: chunk counts are shown only when the
 * pipeline reports real totals.
 */

const PHASE_KEY: Record<AiJobPhase, string> = {
  queued: 'aiJobPhaseQueued',
  analyzing: 'aiJobPhaseAnalyzing',
  summarizing: 'aiJobPhaseSummarizing',
  synthesizing: 'aiJobPhaseSynthesizing',
  compressing: 'aiJobPhaseCompressing',
  saving: 'aiJobPhaseSaving',
  done: 'aiJobPhaseSaving',
}

function formatElapsed(startIso: string | null, nowMs: number): string {
  if (!startIso) return '0:00'
  const seconds = Math.max(0, Math.floor((nowMs - new Date(startIso).getTime()) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function jobTitle(job: AiJobDto, fallback: string): string {
  return job.params.sectionLabel?.trim() || job.params.componentId || fallback
}

export function AiJobsIndicator() {
  const aiJobs = useAiJobsOptional()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const activeJobs = aiJobs?.activeJobs ?? []
  const unseenJobs = aiJobs?.unseenJobs ?? []
  const visible = activeJobs.length > 0 || unseenJobs.length > 0

  // Tick the elapsed timer while anything is running and the pill is visible.
  useEffect(() => {
    if (!visible || activeJobs.length === 0) return
    const interval = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [visible, activeJobs.length])

  // Acknowledge finished jobs once the user opens the panel.
  useEffect(() => {
    if (!expanded || !aiJobs || unseenJobs.length === 0) return
    void aiJobs.markSeen(unseenJobs.map((job) => job.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const listed = useMemo(() => {
    if (!aiJobs) return []
    // Active first, then most recent terminal jobs (cap the panel at 6 rows).
    const terminal = aiJobs.jobs.filter((job) => isTerminalAiJobStatus(job.status))
    return [...activeJobs, ...terminal].slice(0, 6)
  }, [aiJobs, activeJobs])

  if (!aiJobs || !visible) return null

  const headJob = activeJobs[0]

  const copyResult = async (job: AiJobDto) => {
    const text = resolveAiJobResultText(job)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showNotionToast(t('aiJobResultCopied'))
    } catch {
      showNotionToast(t('aiJobCopyFailed'))
    }
  }

  const exportResult = (job: AiJobDto) => {
    const text = resolveAiJobResultText(job)
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${jobTitle(job, t('aiJobDefaultTitle')).replace(/[^\wäöüÄÖÜß-]+/g, '_')}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 print:hidden">
      {expanded ? (
        <div className="w-80 rounded-md border-2 border-border bg-surface p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-ink">{t('aiJobsIndicatorTitle')}</span>
            <button
              type="button"
              className="rounded-sm p-1 text-muted hover:bg-surface-hover"
              onClick={() => setExpanded(false)}
              aria-label={t('aiJobsClose')}
            >
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {listed.map((job) => {
              const active = !isTerminalAiJobStatus(job.status)
              return (
                <li
                  key={job.id}
                  className="rounded-sm border border-border bg-surface px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    {active ? (
                      <Loader2
                        className="h-3.5 w-3.5 shrink-0 animate-spin text-accent"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : job.status === 'succeeded' ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                      {jobTitle(job, t('aiJobDefaultTitle'))}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted">
                      {active
                        ? formatElapsed(job.startedAt ?? job.createdAt, now)
                        : job.status === 'succeeded'
                          ? t('aiJobStatusSucceeded')
                          : job.status === 'cancelled'
                            ? t('aiJobStatusCancelled')
                            : t('aiJobStatusFailed')}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 pl-5">
                    <span className="min-w-0 truncate text-[11px] text-muted">
                      {active
                        ? `${t(PHASE_KEY[job.phase] as Parameters<typeof t>[0])}${
                            job.progressTotal > 0
                              ? ` (${job.progressCurrent}/${job.progressTotal})`
                              : ''
                          }`
                        : job.status === 'failed'
                          ? job.errorMessage ?? t('aiJobStatusFailed')
                          : job.resultMeta?.model
                            ? `${job.resultMeta.model}${
                                job.resultMeta.words ? ` · ${job.resultMeta.words} ${t('aiJobWords')}` : ''
                              }`
                            : ''}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {active ? (
                        <button
                          type="button"
                          className="rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-muted hover:bg-surface-hover"
                          onClick={() => void aiJobs.cancelJob(job.id)}
                        >
                          {t('aiJobCancel')}
                        </button>
                      ) : (
                        <>
                          {job.status === 'succeeded' && job.resultText ? (
                            <>
                              <button
                                type="button"
                                className="rounded-sm border border-border p-1 text-muted hover:bg-surface-hover"
                                title={t('aiJobCopyResult')}
                                aria-label={t('aiJobCopyResult')}
                                onClick={() => void copyResult(job)}
                              >
                                <Copy className="h-3 w-3" strokeWidth={2} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="rounded-sm border border-border p-1 text-muted hover:bg-surface-hover"
                                title={t('aiJobExportResult')}
                                aria-label={t('aiJobExportResult')}
                                onClick={() => exportResult(job)}
                              >
                                <Download className="h-3 w-3" strokeWidth={2} aria-hidden />
                              </button>
                            </>
                          ) : null}
                          {job.status === 'failed' || job.status === 'cancelled' ? (
                            <button
                              type="button"
                              className="rounded-sm border border-border p-1 text-muted hover:bg-surface-hover"
                              title={t('aiJobRetry')}
                              aria-label={t('aiJobRetry')}
                              onClick={() => void aiJobs.retryJob(job.id)}
                            >
                              <RefreshCw className="h-3 w-3" strokeWidth={2} aria-hidden />
                            </button>
                          ) : null}
                        </>
                      )}
                    </span>
                  </div>
                  {job.status === 'succeeded' && job.savedNoteId ? (
                    <p className="mt-0.5 pl-5 text-[11px] text-muted">{t('aiJobSavedToNotes')}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border-2 border-border bg-surface px-3 py-1.5 text-xs text-ink shadow-md hover:bg-surface-hover"
          onClick={() => setExpanded(true)}
          aria-haspopup="dialog"
          aria-expanded={expanded}
        >
          {headJob ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" strokeWidth={2} aria-hidden />
              <span>
                {t(PHASE_KEY[headJob.phase] as Parameters<typeof t>[0])}
                {headJob.progressTotal > 0
                  ? ` (${headJob.progressCurrent}/${headJob.progressTotal})`
                  : ''}
              </span>
              <span className="tabular-nums text-muted">
                {formatElapsed(headJob.startedAt ?? headJob.createdAt, now)}
              </span>
              {activeJobs.length > 1 ? (
                <span className="text-muted">+{activeJobs.length - 1}</span>
              ) : null}
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2} aria-hidden />
              <span>{t('aiJobFinishedToast')}</span>
            </>
          )}
          {unseenJobs.length > 0 ? (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
              {unseenJobs.length}
            </span>
          ) : null}
        </button>
      )}
    </div>
  )
}
