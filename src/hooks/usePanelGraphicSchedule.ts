import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimum wait between random panel graphic appearances (3 minutes). */
export const RANDOM_GRAPHIC_MIN_WAIT_MS = 180_000

/** Maximum wait between random panel graphic appearances (10 minutes). */
export const RANDOM_GRAPHIC_MAX_WAIT_MS = 600_000

/** How long a random panel graphic stays visible before auto-hiding (1 minute). */
export const RANDOM_GRAPHIC_DISPLAY_MS = 60_000

function randomWaitMs(): number {
  const span = RANDOM_GRAPHIC_MAX_WAIT_MS - RANDOM_GRAPHIC_MIN_WAIT_MS
  return RANDOM_GRAPHIC_MIN_WAIT_MS + Math.floor(Math.random() * (span + 1))
}

interface UsePanelGraphicScheduleOptions {
  /** Master toggle from appearance settings — random intervals only when true. */
  enabled: boolean
}

export function usePanelGraphicSchedule({ enabled }: UsePanelGraphicScheduleOptions) {
  const [visible, setVisible] = useState(false)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enabledRef = useRef(enabled)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

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
    if (!enabledRef.current) return
    if (showTimerRef.current !== null) return

    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null
      if (!enabledRef.current) return

      setVisible(true)
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null
        setVisible(false)
        scheduleNextAppearance()
      }, RANDOM_GRAPHIC_DISPLAY_MS)
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
    if (!enabled) {
      clearTimers()
      setVisible(false)
      return
    }

    scheduleNextAppearance()
    return clearTimers
  }, [enabled, clearTimers, scheduleNextAppearance])

  return { visible, dismiss }
}
