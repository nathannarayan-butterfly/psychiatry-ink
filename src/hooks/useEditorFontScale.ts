import { useCallback, useEffect, useState } from 'react'

/**
 * Persisted text size for the Notion-style document editors (Item 5).
 *
 * Drives the `--notion-editor-font-size` CSS variable used by
 * `.notion-editor__textarea`. The value is a rem size; the A−/A+ control steps
 * it within a sensible clinical-readability range and persists the choice.
 */
const STORAGE_KEY = 'psychiatry-ink:notion-editor-font-scale'
const MIN_REM = 0.8
const MAX_REM = 1.25
const STEP_REM = 0.05
export const DEFAULT_EDITOR_FONT_REM = 0.92

function clampRem(value: number): number {
  const rounded = Math.round(value * 100) / 100
  return Math.min(MAX_REM, Math.max(MIN_REM, rounded))
}

function readStored(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_EDITOR_FONT_REM
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? clampRem(parsed) : DEFAULT_EDITOR_FONT_REM
  } catch {
    return DEFAULT_EDITOR_FONT_REM
  }
}

export interface EditorFontScale {
  /** Current size in rem. */
  rem: number
  /** CSS value for `--notion-editor-font-size`. */
  cssValue: string
  increase: () => void
  decrease: () => void
  reset: () => void
  canIncrease: boolean
  canDecrease: boolean
  isDefault: boolean
}

export function useEditorFontScale(): EditorFontScale {
  const [rem, setRem] = useState<number>(() => readStored())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(rem))
    } catch {
      // ignore storage quota / privacy-mode errors
    }
  }, [rem])

  const increase = useCallback(() => setRem((current) => clampRem(current + STEP_REM)), [])
  const decrease = useCallback(() => setRem((current) => clampRem(current - STEP_REM)), [])
  const reset = useCallback(() => setRem(DEFAULT_EDITOR_FONT_REM), [])

  return {
    rem,
    cssValue: `${rem}rem`,
    increase,
    decrease,
    reset,
    canIncrease: rem < MAX_REM,
    canDecrease: rem > MIN_REM,
    isDefault: Math.abs(rem - DEFAULT_EDITOR_FONT_REM) < 0.001,
  }
}
