/**
 * Shared, robust "print this HTML" helper.
 *
 * Historically several export/print utilities called
 * `window.open('', '_blank', 'noopener,noreferrer')` and bailed out when the
 * return value was falsy. Per the HTML spec, `window.open` returns `null`
 * whenever `noopener` is requested — so those windows could never be written
 * to and the print/PDF action silently did nothing. Popup blockers add a
 * second failure mode even without `noopener`.
 *
 * This helper opens a real (same-origin, fully clinician-controlled) blank
 * window so we keep a usable handle, and falls back to a hidden iframe when the
 * popup is blocked. Use it for every "Drucken" / "Als PDF" surface.
 *
 * Security note: the `html` passed here is always assembled by the feature's
 * own `build*PrintHtml` helpers, which HTML-escape every piece of user/AI text
 * (see `escapeHtml`). `document.write` into a blank same-origin document is the
 * standard print pattern used throughout this app; no untrusted markup reaches
 * it, and the surface never navigates to an external URL (so `noopener` is not
 * required to prevent reverse-tabnabbing).
 */

export interface PrintDocumentOptions {
  /** Trigger the browser print dialog once the document has laid out. Default: true. */
  autoPrint?: boolean
  /** Delay before invoking print(), giving fonts/layout a moment to settle. */
  printDelayMs?: number
  /** How long the hidden iframe lingers after printing before removal. */
  iframeCleanupMs?: number
}

const DEFAULT_PRINT_DELAY_MS = 250
const DEFAULT_IFRAME_CLEANUP_MS = 1000

function writeViaIframe(html: string, autoPrint: boolean, cleanupMs: number): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  if (!autoPrint) {
    // Without auto-print there is nothing visible to keep; remove after a beat.
    window.setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, cleanupMs)
    return
  }
  window.setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      /* printing not available — leave the document in place */
    }
    window.setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, cleanupMs)
  }, DEFAULT_PRINT_DELAY_MS)
}

/**
 * Writes the given full HTML document into a print surface and (by default)
 * opens the browser print dialog so the clinician can print or "Save as PDF".
 */
export function printHtmlDocument(html: string, options: PrintDocumentOptions = {}): void {
  if (typeof window === 'undefined') return
  const autoPrint = options.autoPrint ?? true
  const printDelay = options.printDelayMs ?? DEFAULT_PRINT_DELAY_MS
  const cleanupMs = options.iframeCleanupMs ?? DEFAULT_IFRAME_CLEANUP_MS

  let win: Window | null = null
  try {
    // No `noopener`: we need the handle to write into the new same-origin window.
    win = window.open('', '_blank', 'width=900,height=1000')
  } catch {
    win = null
  }

  if (win) {
    try {
      win.document.open()
      win.document.write(html)
      win.document.close()
      win.focus()
      if (autoPrint) {
        win.setTimeout(() => {
          try {
            win?.print()
          } catch {
            /* user can still print manually */
          }
        }, printDelay)
      }
      return
    } catch {
      try {
        win.close()
      } catch {
        /* ignore */
      }
    }
  }

  // Popup blocked or write failed → fall back to a hidden iframe.
  writeViaIframe(html, autoPrint, cleanupMs)
}

/**
 * Opens a scrollable preview window (no auto-print). Returns false when the
 * popup could not be opened (blocked), so callers can surface a hint.
 */
export function openHtmlPreviewWindow(html: string): boolean {
  if (typeof window === 'undefined') return false
  let win: Window | null = null
  try {
    win = window.open('', '_blank', 'width=900,height=1000')
  } catch {
    win = null
  }
  if (!win) return false
  try {
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    return true
  } catch {
    try {
      win.close()
    } catch {
      /* ignore */
    }
    return false
  }
}
