import { useEffect, useState } from 'react'
import {
  classifyViewport,
  isPhoneViewport,
  type DeviceClass,
} from '../utils/responsiveBreakpoints'

export interface ViewportState {
  width: number
  height: number
  deviceClass: DeviceClass
  isPhone: boolean
  isTablet: boolean
  isDesktop: boolean
}

function readViewport(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    // SSR / prerender fallback: assume desktop so nothing is gated server-side.
    return { width: 1280, height: 800 }
  }
  return { width: window.innerWidth, height: window.innerHeight }
}

function toState(width: number, height: number): ViewportState {
  const deviceClass = classifyViewport(width, height)
  return {
    width,
    height,
    deviceClass,
    isPhone: deviceClass === 'phone',
    isTablet: deviceClass === 'tablet',
    isDesktop: deviceClass === 'desktop',
  }
}

/**
 * Tracks the live viewport size and derived device class, reacting to window
 * resize AND orientation changes (a phone rotated portrait↔landscape changes
 * which edge is shortest, so the gate must re-evaluate). Updates are coalesced
 * with `requestAnimationFrame` so a burst of resize events triggers a single
 * state update.
 */
export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(() => {
    const { width, height } = readViewport()
    return toState(width, height)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { width, height } = readViewport()
        setState((prev) => {
          if (prev.width === width && prev.height === height) return prev
          return toState(width, height)
        })
      })
    }

    // Sync once on mount in case the initial (lazy) read happened before layout.
    update()

    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return state
}

/** Convenience hook: just whether the current viewport should see the phone gate. */
export function useIsPhoneViewport(): boolean {
  const { width, height } = useViewport()
  return isPhoneViewport(width, height)
}
