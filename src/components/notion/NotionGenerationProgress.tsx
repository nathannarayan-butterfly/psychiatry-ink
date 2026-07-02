import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AiJobPhase } from '../../../shared/aiJobs'
import { useTranslation } from '../../context/TranslationContext'

/** Minimal live-progress shape (satisfied by ActiveGenerationJob and AiJobProgress). */
export interface GenerationProgressInfo {
  phase: AiJobPhase
  progressCurrent: number
  progressTotal: number
  startedAt: string
}

/**
 * Live progress strip for a running summarize job: real pipeline step text
 * ("Dokument wird analysiert", …), chunk progress when known, an elapsed
 * timer, and non-blocking controls ("Im Hintergrund fortsetzen" / Abbrechen).
 * No fake percentages — only steps and real chunk counts.
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

interface NotionGenerationProgressProps {
  job: GenerationProgressInfo
  onContinueInBackground: () => void
  onCancel: () => void
}

export function NotionGenerationProgress({
  job,
  onContinueInBackground,
  onCancel,
}: NotionGenerationProgressProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [])

  const seconds = Math.max(0, Math.floor((now - new Date(job.startedAt).getTime()) / 1000))
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const phaseLabel = t(PHASE_KEY[job.phase] as Parameters<typeof t>[0])
  const progressSuffix =
    job.progressTotal > 0 ? ` (${job.progressCurrent}/${job.progressTotal})` : ''

  return (
    <div
      className="mx-auto mb-1.5 flex w-full max-w-3xl items-center gap-2.5 rounded-md border-2 border-border bg-surface px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-xs text-ink">
        {phaseLabel}
        {progressSuffix}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted">{elapsed}</span>
      <button
        type="button"
        className="shrink-0 rounded-sm border border-border px-2 py-1 text-[11px] text-ink transition-colors hover:bg-surface-hover"
        onClick={onContinueInBackground}
      >
        {t('aiJobContinueBackground')}
      </button>
      <button
        type="button"
        className="shrink-0 rounded-sm border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:bg-surface-hover"
        onClick={onCancel}
      >
        {t('aiJobCancel')}
      </button>
    </div>
  )
}
