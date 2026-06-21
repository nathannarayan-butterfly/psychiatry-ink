import { ArrowLeft, CreditCard, RefreshCw, Sparkles, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  CREDIT_PACKS,
  formatCreditPackPerHundred,
  formatCreditPackPrice,
} from '../../data/creditPacks'
import { useCredits } from '../../hooks/useCredits'
import {
  fetchAiCreditHistory,
  fetchAiCreditLedger,
  fetchAiCreditSummary,
  fetchAiCreditUsage,
  startCreditCheckout,
  type AiCreditHistoryEntry,
  type AiCreditLedgerEntry,
  type AiCreditSummary,
  type AiCreditUsageSummary,
} from '../../services/aiCreditsApi'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import '../../styles/credits-dashboard.css'

interface CreditsDashboardPageProps {
  onBack: () => void
}

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ledgerTypeLabel(type: string): keyof typeof LEDGER_TYPE_KEYS {
  if (type in LEDGER_TYPE_KEYS) return type as keyof typeof LEDGER_TYPE_KEYS
  return 'debit'
}

const LEDGER_TYPE_KEYS = {
  debit: 'creditsLedgerDebit',
  purchase: 'creditsLedgerPurchase',
  monthly_grant: 'creditsLedgerMonthlyGrant',
  refund: 'creditsLedgerRefund',
  admin_adjustment: 'creditsLedgerAdmin',
} as const

export function CreditsDashboardPage({ onBack }: CreditsDashboardPageProps) {
  const { t, language } = useTranslation()
  const locale = language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
  const { balance, details, refreshBalance } = useCredits()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AiCreditSummary | null>(null)
  const [usage, setUsage] = useState<AiCreditUsageSummary | null>(null)
  const [ledger, setLedger] = useState<AiCreditLedgerEntry[]>([])
  const [history, setHistory] = useState<AiCreditHistoryEntry[]>([])
  const [checkoutPackId, setCheckoutPackId] = useState<string | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  const checkoutStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('checkout')
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryData, usageData, ledgerData, historyData] = await Promise.all([
        fetchAiCreditSummary(),
        fetchAiCreditUsage(),
        fetchAiCreditLedger(40),
        fetchAiCreditHistory(40),
      ])
      setSummary(summaryData)
      setUsage(usageData)
      setLedger(ledgerData.entries)
      setHistory(historyData.logs)
      await refreshBalance()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('creditsDashboardLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [refreshBalance, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (checkoutStatus === 'success') {
      setCheckoutMessage(t('creditsCheckoutSuccess'))
      void load()
      window.history.replaceState({}, '', '/dashboard/credits')
    } else if (checkoutStatus === 'cancelled') {
      setCheckoutMessage(t('creditsCheckoutCancelled'))
      window.history.replaceState({}, '', '/dashboard/credits')
    }
  }, [checkoutStatus, load, t])

  const handlePurchase = async (packId: string) => {
    setCheckoutPackId(packId)
    setCheckoutMessage(null)
    try {
      const { url } = await startCreditCheckout(packId)
      if (url) {
        window.location.href = url
        return
      }
      setCheckoutMessage(t('creditsCheckoutUnavailable'))
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : t('creditsCheckoutFailed'))
    } finally {
      setCheckoutPackId(null)
    }
  }

  const stripeReady = summary?.stripeConfigured === true
  const monthlyCredits = summary?.monthlyCredits ?? details?.monthlyCredits ?? 0
  const purchasedCredits = summary?.purchasedCredits ?? details?.purchasedCredits ?? 0
  const monthlySpent = usage?.totalCredits ?? 0
  const monthlyResetLabel = (details?.monthlyResetAt ?? summary?.monthlyResetAt)
    ? formatDateTime(details?.monthlyResetAt ?? summary!.monthlyResetAt, locale).split(',')[0]
    : '—'
  const monthlyUsagePct =
    monthlyCredits > 0 ? Math.min(100, Math.round((monthlySpent / monthlyCredits) * 100)) : 0

  if (loading && !summary) {
    return (
      <div className="credits-page">
        <ClinicalLoading label={t('creditsDashboardLoading')} />
      </div>
    )
  }

  return (
    <div className="credits-page text-ink">
      <div className="credits-page__inner">
        <header className="credits-page__header">
          <button type="button" className="credits-page__back" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {t('creditsDashboardBack')}
          </button>
          <div className="credits-page__title-row">
            <div>
              <h1 className="credits-page__title">{t('creditsDashboardTitle')}</h1>
              <p className="credits-page__sub">{t('creditsDashboardSubtitle')}</p>
            </div>
            <button
              type="button"
              className="credits-page__refresh"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              {t('creditsDashboardRefresh')}
            </button>
          </div>
        </header>

        {error ? <p className="team-settings-error">{error}</p> : null}
        {checkoutMessage ? (
          <p className={`credits-page__notice${checkoutStatus === 'success' ? ' credits-page__notice--success' : ''}`}>
            {checkoutMessage}
          </p>
        ) : null}

        <section className="credits-panel credits-panel--hero" aria-labelledby="credits-balance-heading">
          <div className="credits-panel__header">
            <h2 id="credits-balance-heading" className="credits-panel__heading">
              {t('creditsDashboardBalanceHeading')}
            </h2>
            <Sparkles className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
          </div>

          <div className="credits-hero">
            <div className="credits-hero__primary">
              <span className="credits-hero__label">{t('creditsDashboardTotal')}</span>
              <span className="credits-hero__value">{balance.toLocaleString(locale)}</span>
              <span className="credits-hero__unit">{t('creditsDashboardCreditsUnit')}</span>
            </div>

            {monthlyCredits > 0 ? (
              <div className="credits-hero__meter">
                <div className="credits-hero__meter-head">
                  <span>{t('creditsDashboardMonthlyUsage')}</span>
                  <span className="credits-hero__meter-stat">
                    {monthlySpent.toLocaleString(locale)} / {monthlyCredits.toLocaleString(locale)}
                  </span>
                </div>
                <div
                  className="credits-hero__meter-track"
                  role="progressbar"
                  aria-valuenow={monthlyUsagePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('creditsDashboardMonthlyUsage')}
                >
                  <div className="credits-hero__meter-fill" style={{ width: `${monthlyUsagePct}%` }} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="credits-stats">
            <article className="credits-stat">
              <span className="credits-stat__label">{t('creditsDashboardMonthly')}</span>
              <span className="credits-stat__value">{monthlyCredits.toLocaleString(locale)}</span>
            </article>
            <article className="credits-stat">
              <span className="credits-stat__label">{t('creditsDashboardPurchased')}</span>
              <span className="credits-stat__value">{purchasedCredits.toLocaleString(locale)}</span>
            </article>
            <article className="credits-stat">
              <span className="credits-stat__label">{t('creditsDashboardReset')}</span>
              <span className="credits-stat__value credits-stat__value--sm">{monthlyResetLabel}</span>
            </article>
            {usage ? (
              <article className="credits-stat">
                <span className="credits-stat__label">{t('creditsDashboardSpentMonth')}</span>
                <span className="credits-stat__value credits-stat__value--sm">
                  {usage.totalCredits.toLocaleString(locale)} ({usage.callCount})
                </span>
              </article>
            ) : null}
          </div>
        </section>

        <section className="credits-panel" aria-labelledby="credits-purchase-heading">
          <div className="credits-panel__header">
            <h2 id="credits-purchase-heading" className="credits-panel__heading">
              {t('creditsPurchaseTitle')}
            </h2>
            <Wallet className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="credits-panel__sub">{t('creditsDashboardPurchaseSub')}</p>

          {stripeReady ? (
            <div className="credits-packs">
              {CREDIT_PACKS.map((pack) => {
                const label = language === 'de' ? pack.labelDe : pack.labelEn
                const price = formatCreditPackPrice(pack, locale)
                const perHundred = t('creditsPackPerHundred').replace(
                  '{price}',
                  formatCreditPackPerHundred(pack, locale),
                )
                const isBusy = checkoutPackId === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`credits-pack${pack.popular ? ' credits-pack--popular' : ''}`}
                    disabled={isBusy}
                    onClick={() => void handlePurchase(pack.id)}
                  >
                    {pack.popular ? (
                      <span className="credits-pack__badge">{t('creditsPackPopular')}</span>
                    ) : null}
                    <span className="credits-pack__credits">{label}</span>
                    <span className="credits-pack__price">{price}</span>
                    <span className="credits-pack__rate">{perHundred}</span>
                    <span className="credits-pack__cta">
                      <CreditCard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      {isBusy ? t('creditsCheckoutRedirect') : t('creditsPurchaseAdd')}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="credits-panel__sub credits-panel__sub--muted">{t('creditsStripeNotConfigured')}</p>
          )}
        </section>

        <div className="credits-dual">
          <section className="credits-panel credits-panel--table" aria-labelledby="credits-history-heading">
            <h2 id="credits-history-heading" className="credits-panel__heading">
              {t('creditsDashboardHistoryHeading')}
            </h2>
            <p className="credits-panel__sub">{t('creditsDashboardHistorySub')}</p>
            <div className="credits-table-wrap">
              <table className="credits-table">
                <thead>
                  <tr>
                    <th>{t('aiUsageTrackerColTime')}</th>
                    <th>{t('aiUsageTrackerColFeature')}</th>
                    <th>{t('creditsDashboardColMode')}</th>
                    <th>{t('creditsDashboardColCredits')}</th>
                    <th>{t('aiUsageTrackerColStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td className="credits-table__mono">{formatDateTime(row.createdAt, locale)}</td>
                      <td>{row.featureKey}</td>
                      <td>{row.mode}</td>
                      <td className="credits-table__mono">{row.creditsCharged}</td>
                      <td>
                        {row.success
                          ? t('aiUsageTrackerStatusOk')
                          : row.errorCode ?? t('aiUsageTrackerStatusError')}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="credits-table__empty">
                        {t('aiUsageTrackerEmpty')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="credits-panel credits-panel--table" aria-labelledby="credits-ledger-heading">
            <h2 id="credits-ledger-heading" className="credits-panel__heading">
              {t('creditsDashboardLedgerHeading')}
            </h2>
            <p className="credits-panel__sub">{t('creditsDashboardLedgerSub')}</p>
            <div className="credits-table-wrap">
              <table className="credits-table">
                <thead>
                  <tr>
                    <th>{t('aiUsageTrackerColTime')}</th>
                    <th>{t('creditsDashboardColType')}</th>
                    <th>{t('creditsDashboardColCredits')}</th>
                    <th>{t('creditsDashboardColNote')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id}>
                      <td className="credits-table__mono">{formatDateTime(row.createdAt, locale)}</td>
                      <td>{t(LEDGER_TYPE_KEYS[ledgerTypeLabel(row.type)])}</td>
                      <td className={`credits-table__mono${row.credits < 0 ? ' credits-table__mono--debit' : ''}`}>
                        {row.credits > 0 ? `+${row.credits}` : row.credits}
                      </td>
                      <td className="credits-table__note">{row.note ?? '—'}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="credits-table__empty">
                        {t('creditsDashboardLedgerEmpty')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
