import { useTranslation } from '../../context/TranslationContext'
import { useWorkspaceSession } from '../../context/WorkspaceSessionContext'
import { WORK_BREAK_MS } from '../../hooks/useWorkspaceSessionTimer'

export function NotionDocumentationTimers() {
  const { t } = useTranslation()
  const { workTimeLabel, status, activeWorkMs, todayTotalLabel } = useWorkspaceSession()
  const isIdle = status === 'idle'
  const isOverThreshold = !isIdle && activeWorkMs >= WORK_BREAK_MS

  return (
    <div className="notion-diary-sidebar__timers" aria-label={t('documentationTimers')}>
      <span
        className={`notion-doc-timer__value ${
          isIdle
            ? 'notion-doc-timer__value--idle'
            : isOverThreshold
              ? 'notion-doc-timer__value--over'
              : 'notion-doc-timer__value--ok'
        }`}
        aria-live="polite"
        aria-label={`${t('documentationTimerSession')}: ${
          isIdle ? t('sessionTimerIdle') : workTimeLabel
        }`}
      >
        {workTimeLabel}
      </span>
      <span
        className="notion-doc-timer__value notion-doc-timer__value--today"
        aria-live="polite"
        aria-label={`${t('documentationTimerTodayTotal')}: ${todayTotalLabel}`}
      >
        {todayTotalLabel}
      </span>
    </div>
  )
}
