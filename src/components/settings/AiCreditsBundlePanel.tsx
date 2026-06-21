import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'

interface BundleSummary {
  sku: string
  credits: number
  priceGbp: number
  unitPriceGbp: number
  active: boolean
}

interface PurchaseSummary {
  id: string
  sku: string
  credits: number
  priceGbp: number
  status: 'pending' | 'paid' | 'failed' | 'refunded' | string
  createdAt: string
  paidAt: string | null
}

interface BundlesResponse {
  bundles: BundleSummary[]
}

interface PurchasesResponse {
  purchases: PurchaseSummary[]
}

interface PurchaseResponse {
  purchase: PurchaseSummary
  checkout: { url: string | null }
}

async function fetchBundles(): Promise<BundleSummary[]> {
  const res = await fetch('/api/ai-credits/bundles', { credentials: 'include' })
  if (!res.ok) throw new Error(`bundles ${res.status}`)
  const body = (await res.json()) as BundlesResponse
  return Array.isArray(body.bundles) ? body.bundles : []
}

async function fetchPurchases(): Promise<PurchaseSummary[]> {
  const res = await fetch('/api/ai-credits/purchases', { credentials: 'include' })
  if (!res.ok) return []
  const body = (await res.json()) as PurchasesResponse
  return Array.isArray(body.purchases) ? body.purchases : []
}

async function postPurchase(sku: string): Promise<PurchaseResponse> {
  const res = await fetch('/api/ai-credits/purchase', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bundleId: sku }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `purchase ${res.status}`)
  }
  return (await res.json()) as PurchaseResponse
}

function formatGbp(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatUnitPrice(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
}

export interface AiCreditsBundlePanelProps {
  /**
   * When true, render the explanatory "monthly credits depleted" banner.
   * Driven by the parent (credit summary widget) that knows the balance.
   */
  monthlyCreditsExhausted?: boolean
}

export function AiCreditsBundlePanel({
  monthlyCreditsExhausted = false,
}: AiCreditsBundlePanelProps) {
  const { t } = useTranslation()
  const [bundles, setBundles] = useState<BundleSummary[]>([])
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingSku, setPendingSku] = useState<string | null>(null)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [b, p] = await Promise.all([fetchBundles(), fetchPurchases()])
      setBundles(b)
      setPurchases(p)
    } catch {
      // Best effort — purchase UI still works against the static catalogue.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const bestUnitSku = useMemo(() => {
    if (bundles.length === 0) return null
    return bundles.reduce((best, curr) =>
      best === null || curr.unitPriceGbp < best.unitPriceGbp ? curr : best,
    bundles[0]).sku
  }, [bundles])

  const handlePurchase = useCallback(
    async (sku: string) => {
      setPendingSku(sku)
      setToast(null)
      try {
        await postPurchase(sku)
        setToast({ kind: 'ok', text: t('aiCreditsBundlePurchaseQueued') })
        await refresh()
      } catch {
        setToast({ kind: 'err', text: t('aiCreditsBundlePurchaseError') })
      } finally {
        setPendingSku(null)
      }
    },
    [refresh, t],
  )

  return (
    <section className="ai-credits-bundles" aria-labelledby="ai-credits-bundles-title">
      <header className="ai-credits-bundles__header">
        <h3 id="ai-credits-bundles-title" className="ai-credits-bundles__title">
          {t('aiCreditsBundlesTitle')}
        </h3>
        <p className="ai-credits-bundles__subtitle">{t('aiCreditsBundlesSubtitle')}</p>
      </header>

      {monthlyCreditsExhausted ? (
        <div className="ai-credits-bundles__banner ai-credits-bundles__banner--warn" role="status">
          {t('aiCreditsBundleOutOfMonthly')}
        </div>
      ) : null}

      <div className="ai-credits-bundles__grid">
        {(bundles.length > 0
          ? bundles
          : [
              { sku: 'credits-100', credits: 100, priceGbp: 4.99, unitPriceGbp: 0.0499, active: true },
              { sku: 'credits-250', credits: 250, priceGbp: 9.99, unitPriceGbp: 0.03996, active: true },
              { sku: 'credits-500', credits: 500, priceGbp: 17.99, unitPriceGbp: 0.03598, active: true },
              { sku: 'credits-1000', credits: 1000, priceGbp: 29.99, unitPriceGbp: 0.02999, active: true },
              { sku: 'credits-2500', credits: 2500, priceGbp: 59.99, unitPriceGbp: 0.023996, active: true },
            ]
        ).map((bundle) => {
          const isBest = bundle.sku === bestUnitSku
          const purchasing = pendingSku === bundle.sku
          return (
            <article
              key={bundle.sku}
              className={`ai-credits-bundles__card${isBest ? ' ai-credits-bundles__card--best' : ''}`}
            >
              {isBest ? (
                <span className="ai-credits-bundles__pill">{t('aiCreditsBundleBestValue')}</span>
              ) : null}
              <div className="ai-credits-bundles__credits">
                <strong>{bundle.credits.toLocaleString()}</strong>
                <span className="ai-credits-bundles__credits-label">
                  {t('aiCreditsBundleCreditsLabel')}
                </span>
              </div>
              <div className="ai-credits-bundles__price">
                <strong>{formatGbp(bundle.priceGbp)}</strong>
                <span className="ai-credits-bundles__unit">
                  {formatUnitPrice(bundle.unitPriceGbp)} {t('aiCreditsBundleUnitPrice')}
                </span>
              </div>
              <p className="ai-credits-bundles__note">{t('aiCreditsBundleNonExpiring')}</p>
              <button
                type="button"
                className="ai-credits-bundles__btn"
                onClick={() => void handlePurchase(bundle.sku)}
                disabled={purchasing || pendingSku !== null}
              >
                {purchasing ? t('aiCreditsBundlePurchasing') : t('aiCreditsBundlePurchase')}
              </button>
            </article>
          )
        })}
      </div>

      {toast ? (
        <p
          className={`ai-credits-bundles__toast ai-credits-bundles__toast--${toast.kind}`}
          role="status"
        >
          {toast.text}
        </p>
      ) : null}

      {purchases.length > 0 ? (
        <div className="ai-credits-bundles__recent">
          <h4 className="ai-credits-bundles__recent-title">
            {t('aiCreditsBundleRecentTitle')}
          </h4>
          <ul className="ai-credits-bundles__recent-list">
            {purchases.slice(0, 5).map((purchase) => {
              const statusLabel =
                purchase.status === 'pending'
                  ? t('aiCreditsBundleStatusPending')
                  : purchase.status === 'paid'
                    ? t('aiCreditsBundleStatusPaid')
                    : purchase.status === 'failed'
                      ? t('aiCreditsBundleStatusFailed')
                      : purchase.status === 'refunded'
                        ? t('aiCreditsBundleStatusRefunded')
                        : purchase.status
              return (
                <li key={purchase.id} className="ai-credits-bundles__recent-row">
                  <span className="ai-credits-bundles__recent-credits">
                    {purchase.credits.toLocaleString()}{' '}
                    {t('aiCreditsBundleCreditsLabel')}
                  </span>
                  <span className="ai-credits-bundles__recent-price">
                    {formatGbp(purchase.priceGbp)}
                  </span>
                  <span
                    className={`ai-credits-bundles__recent-status ai-credits-bundles__recent-status--${purchase.status}`}
                  >
                    {statusLabel}
                  </span>
                  <time className="ai-credits-bundles__recent-date">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </time>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {loading && bundles.length === 0 ? (
        <p className="ai-credits-bundles__loading">…</p>
      ) : null}
    </section>
  )
}
