import { useCallback, useEffect, useRef, useState } from 'react'

const DURATION_KEY = 'psychiatry-ink:pomodoro-duration'
const DEFAULT_DURATION = 25

export function readPomodoroDuration(): number {
  try {
    const raw = localStorage.getItem(DURATION_KEY)
    if (raw) {
      const n = parseInt(raw, 10)
      if (n > 0 && n <= 120) return n
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_DURATION
}

export function savePomodoroDuration(minutes: number): void {
  try {
    localStorage.setItem(DURATION_KEY, String(Math.max(1, Math.min(120, minutes))))
  } catch {
    // localStorage unavailable
  }
}

interface UsePomodoroTimerOptions {
  onFinish?: () => void
}

export function usePomodoroTimer({ onFinish }: UsePomodoroTimerOptions = {}) {
  const [durationMinutes, setDurationMinutes] = useState(readPomodoroDuration)
  const [remainingMs, setRemainingMs] = useState(() => readPomodoroDuration() * 60_000)
  const [isRunning, setIsRunning] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    if (!isRunning || isFinished) return

    const id = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000
        if (next <= 0) {
          const durationMinutes = readPomodoroDuration()
          setTimeout(() => onFinishRef.current?.(), 0)
          setDurationMinutes(durationMinutes)
          return durationMinutes * 60_000
        }
        return next
      })
    }, 1000)

    return () => clearInterval(id)
  }, [isRunning, isFinished])

  const restart = useCallback(() => {
    const duration = readPomodoroDuration()
    setDurationMinutes(duration)
    setRemainingMs(duration * 60_000)
    setIsRunning(true)
    setIsFinished(false)
  }, [])

  const mm = String(Math.floor(remainingMs / 60_000)).padStart(2, '0')
  const ss = String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, '0')

  return {
    durationMinutes,
    remainingMs,
    isRunning,
    isFinished,
    countdownLabel: `${mm}:${ss}`,
    restart,
  }
}
