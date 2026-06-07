import { Bell, Clock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useWorkspaceSession } from '../../context/WorkspaceSessionContext'
import { usePomodoroTimer } from '../../hooks/usePomodoroTimer'
import { addNotification } from '../../hooks/useNotifications'

interface PomodoroWidgetProps {
  onBreakStart: () => void
  variant?: 'topbar' | 'sidebar'
}

function playBeep(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 800
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.28)
    osc.onended = () => void ctx.close()
  } catch {
    // Web Audio API unavailable
  }
}

export function PomodoroWidget({ onBreakStart, variant = 'topbar' }: PomodoroWidgetProps) {
  const { t } = useTranslation()
  const { todayTotalLabel } = useWorkspaceSession()
  const [hasNotification, setHasNotification] = useState(false)
  const [ringKey, setRingKey] = useState(0)

  const handleFinish = useCallback(() => {
    playBeep()
    setHasNotification(true)
    setRingKey((k) => k + 1)
    addNotification('pomodoro-done', t('notificationPomodoroFinished'))
    onBreakStart()
  }, [onBreakStart, t])

  const { isFinished, isRunning, countdownLabel, restart } = usePomodoroTimer({ onFinish: handleFinish })

  const handleBellClick = useCallback(() => {
    setHasNotification(false)
  }, [])

  const handleTimerClick = useCallback(() => {
    restart()
    setHasNotification(false)
  }, [restart])

  // Trigger bell animation on new notification
  useEffect(() => {
    if (ringKey === 0) return
    const id = setTimeout(() => setRingKey(0), 900)
    return () => clearTimeout(id)
  }, [ringKey])

  if (variant === 'sidebar') {
    const hourglassState = isFinished ? 'finished' : isRunning ? 'running' : 'idle'

    return (
      <div className="pomodoro-sidebar-lines" aria-label={t('pomodoroTimer')}>
        <svg
          className={`pomodoro-sidebar-lines__hourglass pomodoro-sidebar-lines__hourglass--${hourglassState}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 3h14" />
          <path d="M5 21h14" />
          <path d="M7 3v2.5a6 6 0 0 0 5 5.5 6 6 0 0 0-5 5.5V21" />
          <path d="M17 3v2.5a6 6 0 0 1-5 5.5 6 6 0 0 1 5 5.5V21" />
        </svg>
        <button
          type="button"
          className="pomodoro-sidebar-lines__countdown"
          onClick={handleTimerClick}
          title={t('pomodoroClickToRestart')}
          aria-label={`${t('pomodoroTimer')}: ${countdownLabel}`}
        >
          {countdownLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="pomodoro-widget" aria-label={t('pomodoroTimer')}>
      <button
        type="button"
        className={`pomodoro-widget__timer${isFinished ? ' pomodoro-widget__timer--finished' : ''}`}
        onClick={handleTimerClick}
        title={t('pomodoroClickToRestart')}
        aria-label={`${t('pomodoroTimer')}: ${countdownLabel}`}
      >
        <span className="pomodoro-widget__tomato" aria-hidden>🍅</span>
        <span className="pomodoro-widget__countdown">{countdownLabel}</span>
      </button>

      <div className="pomodoro-widget__total" aria-label={t('dailyTotal')}>
        <Clock className="pomodoro-widget__clock-icon" strokeWidth={1.75} aria-hidden />
        <span className="pomodoro-widget__total-label">{todayTotalLabel}</span>
      </div>

      <button
        type="button"
        key={ringKey}
        className={`pomodoro-widget__bell${ringKey > 0 ? ' pomodoro-widget__bell--ringing' : ''}${hasNotification ? ' pomodoro-widget__bell--active' : ''}`}
        onClick={handleBellClick}
        aria-label={t(hasNotification ? 'clearNotifications' : 'notificationBell')}
        title={t(hasNotification ? 'clearNotifications' : 'notificationBell')}
      >
        <Bell
          className="pomodoro-widget__bell-icon"
          strokeWidth={hasNotification ? 2 : 1.5}
          aria-hidden
        />
        {hasNotification ? <span className="pomodoro-widget__bell-dot" aria-hidden /> : null}
      </button>
    </div>
  )
}
