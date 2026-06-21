/**
 * `/settings/ai-credits` — authenticated AI credit purchase + balance page.
 *
 * Mounted at the path the Stripe Checkout `success_url` / `cancel_url`
 * redirect back to. Responsibilities:
 *
 * 1. Render the balance summary (monthly + purchased + total).
 * 2. Render the bundle picker (delegates to {@link AiCreditsBundlePanel}).
 * 3. Render the success/cancel banner derived from `?purchase=` query.
 * 4. Refetch the credit balance after a successful return so the new
 *    purchased credits show up as soon as the webhook flips the row.
 *
 * The success banner explicitly says credits arrive when Stripe confirms
 * (the webhook does the actual ledger write); a small refresh button lets
 * the user re-query the API while waiting. This avoids the anti-pattern
 * of synchronously confirming the purchase from the success_url query,
 * which can race the webhook and double-credit.
 */

import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { AiCreditsBundlePanel } from './AiCreditsBundlePanel'

interface AiCreditsSettingsPageProps {
  onBack: () => void
}

interface CreditSummary {
  monthlyCredits: number
  purchasedCredits: number
  totalAvailable: number
  monthlyResetAt: string
}

type PurchaseQueryState = 'success' | 'cancelled' | null

function readPurchaseQuery(): PurchaseQueryState {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('purchase')
  if (raw === 'success') return 'success'
  if (raw === 'cancelled') return 'cancelled'
  return null
}

async function fetchCreditSummary(): Promise<CreditSummary | null> {
  try {
    const res = await fetch('/api/ai-credits', { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as CreditSummary
  } catch {
    return null
  }
}

function clearPurchaseQuery(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('purchase')
  url.searchParams.delete('session_id')
  window.history.replaceState({}, '', `${url.pathname}${url.search ? `?${url.searchParams}` : ''}`)
}

export function AiCreditsSettingsPage({ onBack }: AiCreditsSettingsPageProps) {
  const { t } = useTranslation()
  const [credits, setCredits] = useState<CreditSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [purchaseState, setPurchaseState] = useState<PurchaseQueryState>(() =>
    readPurchaseQuery(),
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const summary = await fetchCreditSummary()
      setCredits(summary)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Auto-poll after a successful return for ~30s so the webhook-applied
  // credits show up without requiring a manual refresh. Stop polling after
  // the first balance change OR after 6 attempts (30s total).
  useEffect(() => {
    if (purchaseState !== 'success') return
    let attempts = 0
    let lastTotal = credits?.totalAvailable ?? -1
    const timer = window.setInterval(() => {
      attempts += 1
      void fetchCreditSummary().then((summary) => {
        if (!summary) return
        setCredits(summary)
        if (summary.totalAvailable !== lastTotal && lastTotal !== -1) {
          window.clearInterval(timer)
        }
        lastTotal = summary.totalAvailable
      })
      if (attempts >= 6) window.clearInterval(timer)
    }, 5000)
    return () => window.clearInterval(timer)
    // Only re-arm when the purchase state itself changes (a fresh success
    // navigation) — refetching `credits` here would re-arm on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseState])

  const monthlyResetLabel = useMemo(() => {
    if (!credits?.monthlyResetAt) return null
    const date = new Date(credits.monthlyResetAt)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }, [credits?.monthlyResetAt])

  const dismissBanner = useCallback(() => {
    setPurchaseState(null)
    clearPurchaseQuery()
  }, [])

  return (
    <div className="ai-credits-settings-page text-ink">
      <div className="ai-credits-settings-page__inner">
        <header className="ai-credits-settings-page__header">
          <button type="button" className="clinical-back-link" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t('settingsBack')}
          </button>
          <div>
            <h1 className="ai-credits-settings-page__title">
              {t('aiCreditsSettingsPageTitle')}
            </h1>
            <p className="ai-credits-settings-page__subtitle">
              {t('aiCreditsSettingsPageSubtitle')}
            </p>
          </div>
        </header>

        {purchaseState === 'success' ? (
          <div
            className="ai-credits-settings-page__banner ai-credits-settings-page__banner--ok"
            role="status"
          >
            <p>{t('aiCreditsPurchaseSuccessBanner')}</p>
            <button type="button" onClick={dismissBanner} className="ai-credits-settings-page__banner-close" aria-label="dismiss">
              ×
            </button>
          </div>
        ) : null}

        {purchaseState === 'cancelled' ? (
          <div
            className="ai-credits-settings-page__banner ai-credits-settings-page__banner--neutral"
            role="status"
          >
            <p>{t('aiCreditsPurchaseCancelledBanner')}</p>
            <button type="button" onClick={dismissBanner} className="ai-credits-settings-page__banner-close" aria-label="dismiss">
              ×
            </button>
          </div>
        ) : null}

        <section className="ai-credits-settings-page__balance" aria-labelledby="ai-credits-balance">
          <div className="ai-credits-settings-page__balance-header">
            <h2 id="ai-credits-balance" className="ai-credits-settings-page__section-title">
              {t('aiCreditsSection')}
            </h2>
            <button
              type="button"
              className="ai-credits-settings-page__refresh"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              {t('aiCreditsRefreshBalance')}
            </button>
          </div>
          {credits ? (
            <dl className="ai-credits-settings-page__balance-grid">
              <div>
                <dt>{t('aiCreditsBalanceMonthly')}</dt>
                <dd>{credits.monthlyCredits.toLocaleString()}</dd>
              </div>
              <div>
                <dt>{t('aiCreditsBalancePurchased')}</dt>
                <dd>{credits.purchasedCredits.toLocaleString()}</dd>
              </div>
              <div className="ai-credits-settings-page__balance-total">
                <dt>{t('aiCreditsBalanceTotal')}</dt>
                <dd>{credits.totalAvailable.toLocaleString()}</dd>
              </div>
              {monthlyResetLabel ? (
                <div>
                  <dt>{t('aiUsageTrackerColTime')}</dt>
                  <dd>{monthlyResetLabel}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="ai-credits-settings-page__balance-loading">
              {loading ? t('aiUsageTrackerLoading') : '—'}
            </p>
          )}
        </section>

        <AiCreditsBundlePanel
          monthlyCreditsExhausted={credits != null && credits.monthlyCredits <= 0}
        />
      </div>
    </div>
  )
}
