import { useCallback, useEffect, useRef, useState } from 'react'
import { copyTextToClipboard } from '../utils/notionDocumentActions'

interface UseCopyWithFeedbackOptions {
  /** How long the transient "copied" state stays active, in ms. */
  resetAfterMs?: number
}

interface UseCopyWithFeedback {
  /** True for `resetAfterMs` after a successful copy. */
  copied: boolean
  /** Copy `value` to the clipboard; resolves to whether it succeeded. */
  copy: (value: string) => Promise<boolean>
}

/**
 * Shared copy-to-clipboard hook with transient success feedback. Centralises
 * the "copy text → flash a confirmation → reset" pattern so every copy
 * affordance in the app behaves and feels identical (see {@link CopyButton}).
 *
 * The success flag auto-clears after `resetAfterMs` and any pending timer is
 * cancelled on unmount so we never call `setState` on an unmounted component.
 * Clipboard access falls back to a hidden `<textarea>` + `execCommand` via
 * `copyTextToClipboard`, so it also works in non-secure contexts.
 */
export function useCopyWithFeedback({
  resetAfterMs = 1800,
}: UseCopyWithFeedbackOptions = {}): UseCopyWithFeedback {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const copy = useCallback(
    async (value: string) => {
      const ok = await copyTextToClipboard(value)
      if (!ok) return false
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), resetAfterMs)
      return true
    },
    [resetAfterMs],
  )

  return { copied, copy }
}
