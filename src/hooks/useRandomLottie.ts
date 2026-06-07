import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimum wait between random Lottie appearances (3 minutes). */
export const RANDOM_LOTTIE_MIN_WAIT_MS = 180_000

/** Maximum wait between random Lottie appearances (10 minutes). */
export const RANDOM_LOTTIE_MAX_WAIT_MS = 600_000

/** How long a random Lottie stays visible before auto-hiding (1 minute). */
export const RANDOM_LOTTIE_DISPLAY_MS = 60_000

function randomWaitMs(): number {
  const span = RANDOM_LOTTIE_MAX_WAIT_MS - RANDOM_LOTTIE_MIN_WAIT_MS
  return RANDOM_LOTTIE_MIN_WAIT_MS + Math.floor(Math.random() * (span + 1))
}

interface UseRandomLottieOptions {
  /** Master toggle from appearance settings — random intervals only when true. */
  enabled: boolean
  /** When true (e.g. pomodoro break), random Lottie is suppressed. */
  paused?: boolean
}

export function useRandomLottie({ enabled, paused = false }: UseRandomLottieOptions) {
  const [visible, setVisible] = useState(false)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enabledRef = useRef(enabled)
  const pausedRef = useRef(paused)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const clearTimers = useCallback(() => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleNextAppearance = useCallback(() => {
    if (!enabledRef.current || pausedRef.current) return
    if (showTimerRef.current !== null) return

    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null
      if (!enabledRef.current || pausedRef.current) return

      setVisible(true)
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null
        setVisible(false)
        scheduleNextAppearance()
      }, RANDOM_LOTTIE_DISPLAY_MS)
    }, randomWaitMs())
  }, [])

  const dismiss = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setVisible(false)
    scheduleNextAppearance()
  }, [scheduleNextAppearance])

  useEffect(() => {
    if (!enabled || paused) {
      clearTimers()
      setVisible(false)
      return
    }

    scheduleNextAppearance()
    return clearTimers
  }, [enabled, paused, clearTimers, scheduleNextAppearance])

  return { visible, dismiss }
}
