import { ArrowLeft, Check, Copy, CreditCard, Gift, RefreshCw, RotateCw, ShieldCheck, Sparkles, Ticket, Users, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  CREDIT_PACKS,
  formatCreditPackPerHundred,
  formatCreditPackPrice,
} from '../../data/creditPacks'
import {
  GIFT_VOUCHER_PACKS,
  formatGiftVoucherPrice,
  giftVoucherTotalCredits,
} from '../../data/giftVoucherPacks'
import { useCredits } from '../../hooks/useCredits'
import {
  createAdminVoucher,
  fetchAdminStatus,
  fetchAdminVouchers,
  fetchAiCreditHistory,
  fetchAiCreditLedger,
  fetchAiCreditSummary,
  fetchAiCreditUsage,
  fetchGiftVoucherResult,
  fetchReferralInfo,
  redeemVoucher,
  startCreditCheckout,
  startGiftVoucherCheckout,
  startSaveCardCheckout,
  startSubscriptionCheckout,
  updateAutoRecharge,
  type AdminVoucherListItem,
  type AiCreditHistoryEntry,
  type AiCreditLedgerEntry,
  type AiCreditSummary,
  type AiCreditUsageSummary,
  type AutoRechargeState,
  type GiftVoucherResult,
  type ReferralInfo,
  type SubscriptionInterval,
} from '../../services/aiCreditsApi'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { SubscriptionBanner } from './SubscriptionBanner'
import '../../styles/credits-dashboard.css'

const VOUCHER_ERROR_KEYS: Record<string, string> = {
  not_found: 'voucherErrorNotFound',
  invalid_code: 'voucherErrorNotFound',
  inactive: 'voucherErrorInactive',
  expired: 'voucherErrorExpired',
  already_redeemed: 'voucherErrorAlreadyRedeemed',
  exhausted: 'voucherErrorExhausted',
}

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

const ADMIN_VOUCHER_STATUS_KEYS = {
  active: 'voucherAdminStatusActive',
  disabled: 'voucherAdminStatusDisabled',
  exhausted: 'voucherAdminStatusExhausted',
  expired: 'voucherAdminStatusExpired',
} as const

function adminVoucherStatusKey(status: string): keyof typeof ADMIN_VOUCHER_STATUS_KEYS {
  if (status in ADMIN_VOUCHER_STATUS_KEYS) return status as keyof typeof ADMIN_VOUCHER_STATUS_KEYS
  return 'active'
}

function formatDateOnly(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface AutoRechargeSectionProps {
  state: AutoRechargeState | undefined
  stripeReady: boolean
  locale: string
  onChanged: () => void
}

function AutoRechargeSection({ state, stripeReady, locale, onChanged }: AutoRechargeSectionProps) {
  const { t, language } = useTranslation()
  const [local, setLocal] = useState<AutoRechargeState | undefined>(state)
  const [thresholdInput, setThresholdInput] = useState(String(state?.threshold ?? 100))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state) {
      setLocal(state)
      setThresholdInput(String(state.threshold))
    }
  }, [state])

  const enabled = local?.enabled ?? false
  const hasCard = local?.hasPaymentMethod ?? false
  const needsAttention = local?.status === 'needs_attention'
  const selectedPackId = local?.packId ?? 'pack_1000'

  const persist = useCallback(
    async (settings: { enabled?: boolean; threshold?: number; packId?: string }) => {
      setBusy(true)
      setError(null)
      setMessage(null)
      try {
        const updated = await updateAutoRecharge(settings)
        setLocal(updated)
        setThresholdInput(String(updated.threshold))
        setMessage(t('autoRechargeSaved'))
        onChanged()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('autoRechargeSaveError'))
      } finally {
        setBusy(false)
      }
    },
    [onChanged, t],
  )

  const handleToggle = (next: boolean) => {
    if (next && !hasCard) {
      setError(t('autoRechargeNeedCardFirst'))
      return
    }
    void persist({ enabled: next })
  }

  const commitThreshold = () => {
    const parsed = Number(thresholdInput)
    if (!Number.isFinite(parsed) || parsed < 1) {
      setThresholdInput(String(local?.threshold ?? 100))
      return
    }
    const rounded = Math.floor(parsed)
    if (rounded === local?.threshold) return
    void persist({ threshold: rounded })
  }

  const handleSaveCard = async () => {
    setBusy(true)
    setError(null)
    try {
      const { url } = await startSaveCardCheckout()
      if (url) {
        window.location.href = url
        return
      }
      setError(t('creditsCheckoutUnavailable'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('autoRechargeSaveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="credits-panel" aria-labelledby="credits-autorecharge-heading">
      <div className="credits-panel__header">
        <h2 id="credits-autorecharge-heading" className="credits-panel__heading">
          {t('autoRechargeTitle')}
        </h2>
        <RotateCw className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="credits-panel__sub">{t('autoRechargeSubtitle')}</p>

      {!stripeReady ? (
        <p className="credits-panel__sub credits-panel__sub--muted">{t('creditsStripeNotConfigured')}</p>
      ) : (
        <div className="credits-autorecharge">
          {needsAttention ? (
            <p className="credits-autorecharge__alert" role="alert">
              {t('autoRechargeNeedsAttentionMsg')}
            </p>
          ) : null}

          <div className="credits-autorecharge__row">
            <label className="credits-autorecharge__toggle">
              <input
                type="checkbox"
                checked={enabled}
                disabled={busy}
                onChange={(e) => handleToggle(e.target.checked)}
              />
              <span>
                <span className="credits-autorecharge__toggle-title">{t('autoRechargeToggleLabel')}</span>
                <span className="credits-autorecharge__toggle-hint">{t('autoRechargeToggleHint')}</span>
              </span>
            </label>
            <span
              className={`credits-autorecharge__status${
                enabled && !needsAttention ? ' credits-autorecharge__status--active' : ''
              }${needsAttention ? ' credits-autorecharge__status--warn' : ''}`}
            >
              {needsAttention
                ? t('autoRechargeStatusNeedsAttention')
                : enabled
                  ? t('autoRechargeStatusActive')
                  : t('autoRechargeOff') /* fallback handled below */}
            </span>
          </div>

          <div className="credits-autorecharge__grid">
            <div className="credits-autorecharge__field">
              <label htmlFor="autorecharge-threshold">{t('autoRechargeThresholdLabel')}</label>
              <input
                id="autorecharge-threshold"
                type="number"
                min={1}
                max={100000}
                value={thresholdInput}
                disabled={busy}
                onChange={(e) => setThresholdInput(e.target.value)}
                onBlur={commitThreshold}
              />
              <span className="credits-autorecharge__field-hint">{t('autoRechargeThresholdHint')}</span>
            </div>

            <div className="credits-autorecharge__field">
              <label htmlFor="autorecharge-pack">{t('autoRechargePackLabel')}</label>
              <select
                id="autorecharge-pack"
                value={selectedPackId}
                disabled={busy}
                onChange={(e) => void persist({ packId: e.target.value })}
              >
                {CREDIT_PACKS.map((pack) => {
                  const label = language === 'de' ? pack.labelDe : pack.labelEn
                  return (
                    <option key={pack.id} value={pack.id}>
                      {label} — {formatCreditPackPrice(pack, locale)}
                    </option>
                  )
                })}
              </select>
              <span className="credits-autorecharge__field-hint">{t('autoRechargePackHint')}</span>
            </div>
          </div>

          <div className="credits-autorecharge__card">
            <div className="credits-autorecharge__card-info">
              <CreditCard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              <span>{hasCard ? t('autoRechargeCardSaved') : t('autoRechargeNoCard')}</span>
            </div>
            <button
              type="button"
              className="credits-autorecharge__card-btn"
              disabled={busy}
              onClick={() => void handleSaveCard()}
            >
              {hasCard ? t('autoRechargeUpdateCard') : t('autoRechargeSaveCard')}
            </button>
          </div>
          <p className="credits-autorecharge__card-hint">{t('autoRechargeSaveCardHint')}</p>

          {local?.lastRechargeAt ? (
            <p className="credits-autorecharge__last">
              {t('autoRechargeLastRecharge')}: {formatDateOnly(local.lastRechargeAt, locale)}
            </p>
          ) : null}

          {message ? <p className="credits-page__notice credits-page__notice--success">{message}</p> : null}
          {error ? <p className="team-settings-error">{error}</p> : null}
        </div>
      )}
    </section>
  )
}

interface SubscribeCtaSectionProps {
  stripeReady: boolean
}

/**
 * Always-visible subscribe CTA. An active subscription unlocks all AI features
 * and — since the billing revamp — is required to SPEND banked credits, so this
 * leads the "Get credits" group.
 */
function SubscribeCtaSection({ stripeReady }: SubscribeCtaSectionProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<SubscriptionInterval | null>(null)

  const handleSubscribe = async (interval: SubscriptionInterval) => {
    setBusy(interval)
    try {
      const { url } = await startSubscriptionCheckout(interval)
      if (url) {
        window.location.href = url
        return
      }
    } catch {
      // Checkout errors surface via the page-level notice; just reset busy.
    }
    setBusy(null)
  }

  return (
    <section className="credits-panel credits-panel--accent" aria-labelledby="credits-subscribe-heading">
      <div className="credits-panel__header">
        <h2 id="credits-subscribe-heading" className="credits-panel__heading">
          {t('creditsSubscribeTitle')}
        </h2>
        <Sparkles className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="credits-panel__sub">{t('creditsSubscribeBody')}</p>

      {stripeReady ? (
        <div className="credits-subscribe__actions">
          <button
            type="button"
            className="credits-subscribe__btn credits-subscribe__btn--primary"
            disabled={busy !== null}
            onClick={() => void handleSubscribe('month')}
          >
            <CreditCard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {busy === 'month' ? t('creditsCheckoutRedirect') : t('creditsSubscribeMonthly')}
          </button>
          <button
            type="button"
            className="credits-subscribe__btn"
            disabled={busy !== null}
            onClick={() => void handleSubscribe('year')}
          >
            {busy === 'year' ? t('creditsCheckoutRedirect') : t('creditsSubscribeYearly')}
          </button>
        </div>
      ) : (
        <p className="credits-panel__sub credits-panel__sub--muted">{t('creditsStripeNotConfigured')}</p>
      )}
    </section>
  )
}

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

  // Voucher redemption.
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherBusy, setVoucherBusy] = useState(false)
  const [voucherFeedback, setVoucherFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // Gift voucher purchase.
  const [giftBusyId, setGiftBusyId] = useState<string | null>(null)
  const [giftResult, setGiftResult] = useState<GiftVoucherResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Referral.
  const [referral, setReferral] = useState<ReferralInfo | null>(null)

  // Owner/operator promo-voucher admin surface.
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminVouchers, setAdminVouchers] = useState<AdminVoucherListItem[]>([])
  const [adminForm, setAdminForm] = useState({
    code: '',
    creditsPerPeriod: '500',
    periodMonths: '1',
    totalPeriods: '6',
    maxRedemptions: '1',
    validMonths: '12',
    validUntil: '',
  })
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminFeedback, setAdminFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [adminCreatedCode, setAdminCreatedCode] = useState<string | null>(null)

  const checkoutStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('checkout') ?? params.get('subscription')
  }, [])

  const giftStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      status: params.get('gift'),
      sessionId: params.get('session_id'),
    }
  }, [])

  const saveCardStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('savecard')
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

  useEffect(() => {
    if (saveCardStatus === 'success') {
      setCheckoutMessage(t('autoRechargeCardSavedNotice'))
      void load()
      window.history.replaceState({}, '', '/dashboard/credits')
    } else if (saveCardStatus === 'cancelled') {
      setCheckoutMessage(t('creditsCheckoutCancelled'))
      window.history.replaceState({}, '', '/dashboard/credits')
    }
  }, [saveCardStatus, load, t])

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

  const handleRedeemVoucher = async () => {
    const code = voucherCode.trim()
    if (!code || voucherBusy) return
    setVoucherBusy(true)
    setVoucherFeedback(null)
    try {
      const result = await redeemVoucher(code)
      if (!result.ok) {
        const key = VOUCHER_ERROR_KEYS[(result as { error?: string }).error ?? ''] ?? 'voucherErrorGeneric'
        setVoucherFeedback({ tone: 'error', text: t(key as Parameters<typeof t>[0]) })
        return
      }
      const main = t('voucherRedeemSuccess').replace('{credits}', String(result.creditsGranted))
      const schedule =
        result.creditsPerPeriod && result.totalPeriods
          ? ' ' +
            t('voucherRedeemSuccessSchedule')
              .replace('{creditsPerPeriod}', String(result.creditsPerPeriod))
              .replace('{totalPeriods}', String(result.totalPeriods))
          : ''
      setVoucherFeedback({ tone: 'success', text: main + schedule })
      setVoucherCode('')
      await load()
    } catch (err) {
      setVoucherFeedback({ tone: 'error', text: err instanceof Error ? err.message : t('voucherErrorGeneric') })
    } finally {
      setVoucherBusy(false)
    }
  }

  const handleGiftPurchase = async (giftPackId: string) => {
    setGiftBusyId(giftPackId)
    setCheckoutMessage(null)
    try {
      const { url } = await startGiftVoucherCheckout(giftPackId)
      if (url) {
        window.location.href = url
        return
      }
      setCheckoutMessage(t('creditsCheckoutUnavailable'))
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : t('creditsCheckoutFailed'))
    } finally {
      setGiftBusyId(null)
    }
  }

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000)
    } catch {
      // Clipboard unavailable — no-op.
    }
  }

  // Load the referral card (best-effort).
  useEffect(() => {
    let active = true
    fetchReferralInfo()
      .then((info) => {
        if (active) setReferral(info)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const loadAdminVouchers = useCallback(async () => {
    try {
      const { vouchers } = await fetchAdminVouchers()
      setAdminVouchers(vouchers)
    } catch {
      // Best-effort: the table simply stays empty if the list read fails.
    }
  }, [])

  // Resolve the admin-status signal; load the admin voucher list when operator.
  useEffect(() => {
    let active = true
    fetchAdminStatus()
      .then((status) => {
        if (!active) return
        setIsAdmin(status.isAdmin)
        if (status.isAdmin) void loadAdminVouchers()
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [loadAdminVouchers])

  const handleCreateAdminVoucher = async () => {
    if (adminBusy) return
    const creditsPerPeriod = Number(adminForm.creditsPerPeriod)
    const periodMonths = Number(adminForm.periodMonths)
    const totalPeriods = Number(adminForm.totalPeriods)
    const maxRedemptions = Number(adminForm.maxRedemptions)
    const validMonths = Number(adminForm.validMonths)
    setAdminBusy(true)
    setAdminFeedback(null)
    try {
      const result = await createAdminVoucher({
        code: adminForm.code.trim() ? adminForm.code.trim().toUpperCase() : undefined,
        creditsPerPeriod,
        periodMonths,
        totalPeriods,
        maxRedemptions,
        validUntil: adminForm.validUntil.trim() ? new Date(adminForm.validUntil).toISOString() : undefined,
        validMonths: adminForm.validUntil.trim() ? undefined : validMonths,
      })
      if (!result.ok || !result.code) {
        const key = result.error === 'code_exists' ? 'voucherAdminErrorCodeExists' : 'voucherAdminCreateError'
        setAdminFeedback({ tone: 'error', text: t(key) })
        return
      }
      setAdminCreatedCode(result.code)
      setAdminFeedback({ tone: 'success', text: t('voucherAdminCreateSuccess') })
      setAdminForm((prev) => ({ ...prev, code: '' }))
      await loadAdminVouchers()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('voucherAdminCreateError')
      setAdminFeedback({ tone: 'error', text: message })
    } finally {
      setAdminBusy(false)
    }
  }

  // Resolve the buy-a-gift result after returning from Stripe (poll briefly
  // while the webhook mints the voucher).
  useEffect(() => {
    if (giftStatus.status === 'cancelled') {
      setCheckoutMessage(t('voucherGiftCancelled'))
      window.history.replaceState({}, '', '/dashboard/credits')
      return
    }
    if (giftStatus.status !== 'success' || !giftStatus.sessionId) return

    let attempts = 0
    let timer: number | undefined
    const sessionId = giftStatus.sessionId

    const poll = () => {
      attempts += 1
      void fetchGiftVoucherResult(sessionId)
        .then((result) => {
          if (result.ok && result.code) {
            setGiftResult(result)
            window.history.replaceState({}, '', '/dashboard/credits')
            return
          }
          if (attempts < 6) timer = window.setTimeout(poll, 1500)
          else setGiftResult({ ok: false, pending: true })
        })
        .catch(() => {
          if (attempts < 6) timer = window.setTimeout(poll, 1500)
        })
    }
    poll()
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [giftStatus.status, giftStatus.sessionId, t])

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

        <SubscriptionBanner
          onRechargeClick={() =>
            document
              .getElementById('credits-purchase-heading')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        />

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

        <div className="credits-group">
          <h2 className="credits-group__title">{t('creditsGroupGet')}</h2>

          <SubscribeCtaSection stripeReady={stripeReady} />

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

        <AutoRechargeSection
          state={summary?.autoRecharge}
          stripeReady={stripeReady}
          locale={locale}
          onChanged={() => void load()}
        />

        <section className="credits-panel" aria-labelledby="voucher-redeem-heading">
          <div className="credits-panel__header">
            <h2 id="voucher-redeem-heading" className="credits-panel__heading">
              {t('voucherRedeemHeading')}
            </h2>
            <Ticket className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="credits-panel__sub">{t('voucherRedeemSub')}</p>

          <form
            className="voucher-redeem"
            onSubmit={(event) => {
              event.preventDefault()
              void handleRedeemVoucher()
            }}
          >
            <input
              type="text"
              className="voucher-redeem__input"
              placeholder={t('voucherRedeemPlaceholder')}
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              disabled={voucherBusy}
            />
            <button type="submit" className="voucher-redeem__submit" disabled={voucherBusy || !voucherCode.trim()}>
              {voucherBusy ? t('voucherRedeemBusy') : t('voucherRedeemButton')}
            </button>
          </form>

          {voucherFeedback ? (
            <p
              className={`credits-page__notice${voucherFeedback.tone === 'success' ? ' credits-page__notice--success' : ''}`}
            >
              {voucherFeedback.text}
            </p>
          ) : null}
        </section>

        </div>

        <div className="credits-group">
          <h2 className="credits-group__title">{t('creditsGroupGifting')}</h2>
          <div className="credits-gift-row">

        <section className="credits-panel" aria-labelledby="voucher-gift-heading">
          <div className="credits-panel__header">
            <h2 id="voucher-gift-heading" className="credits-panel__heading">
              {t('voucherGiftHeading')}
            </h2>
            <Gift className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="credits-panel__sub">{t('voucherGiftSub')}</p>

          {giftResult?.ok && giftResult.code ? (
            <div className="voucher-gift-result">
              <span className="voucher-gift-result__label">{t('voucherGiftResultHeading')}</span>
              <div className="voucher-gift-result__code-row">
                <code className="voucher-gift-result__code">{giftResult.code}</code>
                <button
                  type="button"
                  className="voucher-gift-result__copy"
                  onClick={() => void handleCopy(giftResult.code!, 'gift')}
                >
                  {copied === 'gift' ? (
                    <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  )}
                  {copied === 'gift' ? t('voucherCopied') : t('voucherCopy')}
                </button>
              </div>
              <p className="credits-panel__sub credits-panel__sub--muted">{t('voucherGiftResultSub')}</p>
            </div>
          ) : null}
          {giftResult && !giftResult.ok && giftResult.pending ? (
            <p className="credits-page__notice">{t('voucherGiftPending')}</p>
          ) : null}

          {stripeReady ? (
            <div className="credits-packs">
              {GIFT_VOUCHER_PACKS.map((pack) => {
                const label = language === 'de' ? pack.labelDe : pack.labelEn
                const price = formatGiftVoucherPrice(pack, locale)
                const total = t('voucherGiftTotalCredits').replace(
                  '{credits}',
                  giftVoucherTotalCredits(pack).toLocaleString(locale),
                )
                const isBusy = giftBusyId === pack.id
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`credits-pack${pack.popular ? ' credits-pack--popular' : ''}`}
                    disabled={isBusy}
                    onClick={() => void handleGiftPurchase(pack.id)}
                  >
                    {pack.popular ? <span className="credits-pack__badge">{t('creditsPackPopular')}</span> : null}
                    <span className="credits-pack__credits">{label}</span>
                    <span className="credits-pack__price">{price}</span>
                    <span className="credits-pack__rate">{total}</span>
                    <span className="credits-pack__cta">
                      <Gift className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      {isBusy ? t('creditsCheckoutRedirect') : t('voucherGiftBuy')}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="credits-panel__sub credits-panel__sub--muted">{t('creditsStripeNotConfigured')}</p>
          )}
        </section>

        {referral ? (
          <section className="credits-panel" aria-labelledby="referral-heading">
            <div className="credits-panel__header">
              <h2 id="referral-heading" className="credits-panel__heading">
                {t('referralHeading')}
              </h2>
              <Users className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="credits-panel__sub">{t('referralSub')}</p>

            <div className="referral-link">
              <span className="referral-link__label">{t('referralLinkLabel')}</span>
              <div className="referral-link__row">
                <code className="referral-link__value">{referral.inviteUrl}</code>
                <button
                  type="button"
                  className="voucher-gift-result__copy"
                  onClick={() => void handleCopy(referral.inviteUrl, 'referral')}
                >
                  {copied === 'referral' ? (
                    <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  )}
                  {copied === 'referral' ? t('voucherCopied') : t('voucherCopy')}
                </button>
              </div>
            </div>

            <div className="credits-stats">
              <article className="credits-stat">
                <span className="credits-stat__label">{t('referralStatInvited')}</span>
                <span className="credits-stat__value">{referral.stats.invited.toLocaleString(locale)}</span>
              </article>
              <article className="credits-stat">
                <span className="credits-stat__label">{t('referralStatConverted')}</span>
                <span className="credits-stat__value">{referral.stats.converted.toLocaleString(locale)}</span>
              </article>
              <article className="credits-stat">
                <span className="credits-stat__label">{t('referralStatEarned')}</span>
                <span className="credits-stat__value">{referral.stats.creditsEarned.toLocaleString(locale)}</span>
              </article>
            </div>
          </section>
        ) : null}
          </div>
        </div>

        <div className="credits-group">
          <h2 className="credits-group__title">{t('creditsGroupRecords')}</h2>

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

        {isAdmin ? (
          <div className="credits-group">
            <h2 className="credits-group__title">{t('creditsGroupAdmin')}</h2>
          <section className="credits-panel" aria-labelledby="voucher-admin-heading">
            <div className="credits-panel__header">
              <h2 id="voucher-admin-heading" className="credits-panel__heading">
                {t('voucherAdminHeading')}
              </h2>
              <ShieldCheck className="credits-panel__heading-icon" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="credits-panel__sub">{t('voucherAdminSub')}</p>

            <form
              className="voucher-admin-form"
              onSubmit={(event) => {
                event.preventDefault()
                void handleCreateAdminVoucher()
              }}
            >
              <h3 className="voucher-admin-form__heading">{t('voucherAdminCreateHeading')}</h3>
              <div className="voucher-admin-grid">
                <label className="voucher-admin-field voucher-admin-field--wide">
                  <span className="voucher-admin-field__label">{t('voucherAdminFieldCode')}</span>
                  <input
                    type="text"
                    className="voucher-redeem__input"
                    placeholder={t('voucherAdminFieldCodePlaceholder')}
                    value={adminForm.code}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                    }
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={adminBusy}
                  />
                </label>
                <label className="voucher-admin-field">
                  <span className="voucher-admin-field__label">{t('voucherAdminFieldCreditsPerPeriod')}</span>
                  <input
                    type="number"
                    min={1}
                    className="voucher-redeem__input"
                    value={adminForm.creditsPerPeriod}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, creditsPerPeriod: event.target.value }))
                    }
                    disabled={adminBusy}
                  />
                </label>
                <label className="voucher-admin-field">
                  <span className="voucher-admin-field__label">{t('voucherAdminFieldPeriodMonths')}</span>
                  <input
                    type="number"
                    min={1}
                    className="voucher-redeem__input"
                    value={adminForm.periodMonths}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, periodMonths: event.target.value }))
                    }
                    disabled={adminBusy}
                  />
                </label>
                <label className="voucher-admin-field">
                  <span className="voucher-admin-field__label">{t('voucherAdminFieldTotalPeriods')}</span>
                  <input
                    type="number"
                    min={1}
                    className="voucher-redeem__input"
                    value={adminForm.totalPeriods}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, totalPeriods: event.target.value }))
                    }
                    disabled={adminBusy}
                  />
                </label>
                <label className="voucher-admin-field">
                  <span className="voucher-admin-field__label">{t('voucherAdminFieldMaxRedemptions')}</span>
                  <input
                    type="number"
                    min={1}
                    className="voucher-redeem__input"
                    value={adminForm.maxRedemptions}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, maxRedemptions: event.target.value }))
                    }
                    disabled={adminBusy}
                  />
                </label>
                <label className="voucher-admin-field">
                  <span className="voucher-admin-field__label">{t('voucherAdminFieldValidMonths')}</span>
                  <input
                    type="number"
                    min={1}
                    className="voucher-redeem__input"
                    value={adminForm.validMonths}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, validMonths: event.target.value }))
                    }
                    disabled={adminBusy || adminForm.validUntil.trim() !== ''}
                  />
                </label>
                <label className="voucher-admin-field">
                  <span className="voucher-admin-field__label">{t('voucherAdminFieldValidUntil')}</span>
                  <input
                    type="date"
                    className="voucher-redeem__input"
                    value={adminForm.validUntil}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, validUntil: event.target.value }))
                    }
                    disabled={adminBusy}
                  />
                </label>
              </div>
              <button type="submit" className="voucher-redeem__submit" disabled={adminBusy}>
                {adminBusy ? t('voucherAdminCreateBusy') : t('voucherAdminCreateButton')}
              </button>
            </form>

            {adminCreatedCode ? (
              <div className="voucher-gift-result">
                <span className="voucher-gift-result__label">{t('voucherGiftResultHeading')}</span>
                <div className="voucher-gift-result__code-row">
                  <code className="voucher-gift-result__code">{adminCreatedCode}</code>
                  <button
                    type="button"
                    className="voucher-gift-result__copy"
                    onClick={() => void handleCopy(adminCreatedCode, 'admin')}
                  >
                    {copied === 'admin' ? (
                      <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    )}
                    {copied === 'admin' ? t('voucherCopied') : t('voucherCopy')}
                  </button>
                </div>
              </div>
            ) : null}

            {adminFeedback ? (
              <p
                className={`credits-page__notice${adminFeedback.tone === 'success' ? ' credits-page__notice--success' : ''}`}
              >
                {adminFeedback.text}
              </p>
            ) : null}

            <h3 className="voucher-admin-form__heading voucher-admin-form__heading--list">
              {t('voucherAdminListHeading')}
            </h3>
            <div className="credits-table-wrap">
              <table className="credits-table">
                <thead>
                  <tr>
                    <th>{t('voucherAdminColCode')}</th>
                    <th>{t('voucherAdminColCredits')}</th>
                    <th>{t('voucherAdminColPeriods')}</th>
                    <th>{t('voucherAdminColRedemptions')}</th>
                    <th>{t('voucherAdminColValidUntil')}</th>
                    <th>{t('voucherAdminColStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {adminVouchers.map((row) => (
                    <tr key={row.id}>
                      <td className="credits-table__mono">{row.code}</td>
                      <td className="credits-table__mono">{row.creditsPerPeriod.toLocaleString(locale)}</td>
                      <td className="credits-table__mono">
                        {row.totalPeriods}× / {row.periodMonths}M
                      </td>
                      <td className="credits-table__mono">
                        {row.redemptionsUsed} / {row.maxRedemptions}
                      </td>
                      <td className="credits-table__mono">
                        {row.validUntil ? formatDateTime(row.validUntil, locale).split(',')[0] : '—'}
                      </td>
                      <td>{t(ADMIN_VOUCHER_STATUS_KEYS[adminVoucherStatusKey(row.status)])}</td>
                    </tr>
                  ))}
                  {adminVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="credits-table__empty">
                        {t('voucherAdminListEmpty')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
