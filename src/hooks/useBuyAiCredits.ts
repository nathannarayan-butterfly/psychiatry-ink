/**
 * Single source of truth for the "buy AI credits" flow.
 *
 * Every CTA in the app — settings panel, "out of credits" banner, homepage
 * pricing tier, AI Credits Hinweise page, etc. — funnels through this hook
 * so the wire format and the redirect behaviour stay aligned.
 *
 * Behaviour:
 *   - POST `/api/ai-credits/purchase` with the requested bundle SKU.
 *   - On success, perform a HARD redirect to the Stripe-hosted Checkout URL
 *     (`window.location.href = checkout.url`). We deliberately do NOT open
 *     a new tab — Stripe's docs recommend a same-tab redirect so the
 *     `success_url` / `cancel_url` brings the user back to the same browser
 *     context.
 *   - When `checkout.url` is missing (server returned null OR a 503 because
 *     Stripe is not configured), the hook resolves to `{ ok: false }` with
 *     a translated error message so the caller can surface a toast.
 *
 * The hook itself does NOT show its own toast UI — that's the caller's
 * responsibility so each call site can render the right surface (inline
 * banner, modal, snackbar, etc.).
 */

import { useCallback, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'

interface PurchaseResponse {
  purchase: {
    id: string
    sku: string
    credits: number
    priceGbp: number
    status: string
    createdAt: string
  }
  checkout: {
    url: string | null
    sessionId?: string | null
  }
}

export interface BuyAiCreditsResult {
  ok: boolean
  /** Error message to surface to the user; only set when `ok === false`. */
  errorMessage?: string
  /** Stripe-hosted checkout URL the user was redirected to (when `ok === true`). */
  checkoutUrl?: string
  /** Bundle SKU that the request was made against. */
  sku: string
}

export interface UseBuyAiCreditsOptions {
  /**
   * Override the API base URL. Defaults to the same-origin `/api/ai-credits/purchase`.
   * Provided for testability — production paths always use the relative URL.
   */
  apiPath?: string
  /**
   * If true, skip the hard redirect and return the URL to the caller instead.
   * Used by tests and by call sites that want to confirm the URL before
   * navigating away (e.g. a modal that shows "Redirecting to Stripe…").
   */
  manualRedirect?: boolean
}

export function useBuyAiCredits(options: UseBuyAiCreditsOptions = {}) {
  const { apiPath = '/api/ai-credits/purchase', manualRedirect = false } = options
  const { t } = useTranslation()
  const [pendingSku, setPendingSku] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const purchase = useCallback(
    async (sku: string): Promise<BuyAiCreditsResult> => {
      setPendingSku(sku)
      setLastError(null)
      try {
        const res = await fetch(apiPath, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ bundleId: sku }),
        })

        if (res.status === 401) {
          const message = t('aiCreditsPurchaseRequiresLogin')
          setLastError(message)
          return { ok: false, sku, errorMessage: message }
        }

        if (!res.ok) {
          const message = t('aiCreditsBundlePurchaseError')
          setLastError(message)
          return { ok: false, sku, errorMessage: message }
        }

        const body = (await res.json()) as PurchaseResponse
        const url = body?.checkout?.url ?? null
        if (!url) {
          const message = t('aiCreditsRedirectError')
          setLastError(message)
          return { ok: false, sku, errorMessage: message }
        }

        if (!manualRedirect && typeof window !== 'undefined') {
          // Hard redirect — same tab. Stripe's success/cancel URLs bring
          // the user back to the same browser context with a query string.
          window.location.href = url
        }
        return { ok: true, sku, checkoutUrl: url }
      } catch {
        const message = t('aiCreditsBundlePurchaseError')
        setLastError(message)
        return { ok: false, sku, errorMessage: message }
      } finally {
        setPendingSku(null)
      }
    },
    [apiPath, manualRedirect, t],
  )

  return { purchase, pendingSku, lastError, isBusy: pendingSku !== null }
}
