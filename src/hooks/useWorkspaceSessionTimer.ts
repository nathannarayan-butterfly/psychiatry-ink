import { useCallback, useEffect, useRef, useState } from 'react'
import { nowSiteTime } from '../utils/siteTimezone'

export const WORK_IDLE_MS = 10 * 60 * 1000
export const WORK_BREAK_MS = 30 * 60 * 1000
const TICK_MS = 1000

export type SessionTimerStatus = 'active' | 'idle'

export interface WorkspaceSessionTimerState {
  /** Wall clock HH:MM */
  clockTime: string
  /** Active work duration HH:MM:SS, or idle label key handled in UI */
  workTimeLabel: string
  status: SessionTimerStatus
  activeWorkMs: number
  isOverBreakThreshold: boolean
  /** Incremented each time a new 30-min work milestone triggers take-a-break */
  breakGeneration: number
}

function formatClock(date: Date): string {
  return nowSiteTime(date)
}

function formatWorkDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useWorkspaceSessionTimer() {
  const [clockTime, setClockTime] = useState(() => formatClock(new Date()))
  const [activeWorkMs, setActiveWorkMs] = useState(0)
  const [status, setStatus] = useState<SessionTimerStatus>('idle')
  const [breakGeneration, setBreakGeneration] = useState(0)

  const lastActivityAtRef = useRef(Date.now())
  const activeWorkMsRef = useRef(0)
  const lastBreakMilestoneRef = useRef(0)
  const sessionStartedRef = useRef(false)

  const bumpActivity = useCallback(() => {
    const now = Date.now()
    lastActivityAtRef.current = now
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true
    }
    setStatus('active')
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setClockTime(formatClock(new Date(now)))

      const sinceActivity = now - lastActivityAtRef.current
      const isIdle = !sessionStartedRef.current || sinceActivity >= WORK_IDLE_MS

      if (isIdle) {
        setStatus('idle')
        return
      }

      setStatus('active')
      activeWorkMsRef.current += TICK_MS
      const nextMs = activeWorkMsRef.current
      setActiveWorkMs(nextMs)

      const milestone = Math.floor(nextMs / WORK_BREAK_MS)
      if (milestone > lastBreakMilestoneRef.current) {
        lastBreakMilestoneRef.current = milestone
        setBreakGeneration((current) => current + 1)
      }
    }, TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  const isOverBreakThreshold = status === 'active' && activeWorkMs >= WORK_BREAK_MS

  return {
    bumpActivity,
    clockTime,
    workTimeLabel: formatWorkDuration(activeWorkMs),
    status,
    activeWorkMs,
    isOverBreakThreshold,
    breakGeneration,
  }
}
