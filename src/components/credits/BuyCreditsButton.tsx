/**
 * Reusable "Buy AI credits" button.
 *
 * Renders a small inline button that funnels every credit-purchase CTA in
 * the app through {@link useBuyAiCredits}. Two modes:
 *
 * - `bundleSku` set → direct purchase. Clicks call POST /api/ai-credits/purchase
 *   with the bundle and HARD-redirect the browser to the Stripe Checkout
 *   session URL. Used by the homepage pricing tier and "out of credits"
 *   banners that already imply a specific bundle (default: `credits-250`).
 *
 * - `bundleSku` unset → navigation. Clicks call the injected `onOpenSettings`
 *   callback (or navigate via `href`) so the clinician lands on the settings
 *   purchase page where they can pick the bundle that matches their need.
 *
 * Why a single component: the user has many CTAs ("Buy credits",
 * "Get more credits", banners, links). Funneling all of them through one
 * component guarantees the same wire format, the same redirect behaviour,
 * the same translated copy, and the same toast on failure.
 */

import type { CSSProperties } from 'react'
import { useCallback, useState } from 'react'
import { Coins } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useBuyAiCredits } from '../../hooks/useBuyAiCredits'
import type { UiTranslationKey } from '../../data/uiTranslations'

export type BuyCreditsButtonVariant = 'primary' | 'ghost' | 'inline'
export type BuyCreditsButtonSize = 'sm' | 'md'

export interface BuyCreditsButtonProps {
  /**
   * Stripe Checkout is created directly for this SKU when set. When omitted
   * the button instead routes to the settings page so the user can pick
   * a bundle from the catalogue.
   */
  bundleSku?: string
  /** Override the visible label. Defaults to `aiCreditsBundleBuyMoreCta`. */
  labelKey?: UiTranslationKey
  /** Called when the user clicks and `bundleSku` is unset. */
  onOpenSettings?: () => void
  /**
   * Same-origin path to navigate to when `bundleSku` is unset and
   * `onOpenSettings` is not provided. Defaults to `/settings/ai-credits`.
   */
  href?: string
  variant?: BuyCreditsButtonVariant
  size?: BuyCreditsButtonSize
  fullWidth?: boolean
  className?: string
  style?: CSSProperties
  iconOnly?: boolean
  /** Tracking label written to the data-analytics attribute. */
  source?: string
}

export function BuyCreditsButton({
  bundleSku,
  labelKey = 'aiCreditsBundleBuyMoreCta',
  onOpenSettings,
  href = '/settings/ai-credits',
  variant = 'primary',
  size = 'sm',
  fullWidth,
  className,
  style,
  iconOnly,
  source,
}: BuyCreditsButtonProps) {
  const { t } = useTranslation()
  const { purchase, isBusy } = useBuyAiCredits()
  const [localError, setLocalError] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    setLocalError(null)
    if (bundleSku) {
      const result = await purchase(bundleSku)
      if (!result.ok) setLocalError(result.errorMessage ?? null)
      return
    }
    if (onOpenSettings) {
      onOpenSettings()
      return
    }
    if (typeof window !== 'undefined') {
      window.location.assign(href)
    }
  }, [bundleSku, href, onOpenSettings, purchase])

  const classes = ['buy-credits-btn', `buy-credits-btn--${variant}`, `buy-credits-btn--${size}`]
  if (fullWidth) classes.push('buy-credits-btn--full')
  if (className) classes.push(className)

  const label = t(labelKey)

  return (
    <span className="buy-credits-btn-wrap">
      <button
        type="button"
        className={classes.join(' ')}
        onClick={() => void handleClick()}
        disabled={isBusy}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        style={style}
        data-analytics={source ? `buy-credits:${source}` : undefined}
      >
        <Coins
          className="buy-credits-btn__icon"
          aria-hidden
          strokeWidth={1.75}
        />
        {iconOnly ? null : (
          <span className="buy-credits-btn__label">
            {isBusy && bundleSku ? t('aiCreditsBundlePurchasing') : label}
          </span>
        )}
      </button>
      {localError ? (
        <span className="buy-credits-btn__error" role="alert">
          {localError}
        </span>
      ) : null}
    </span>
  )
}
