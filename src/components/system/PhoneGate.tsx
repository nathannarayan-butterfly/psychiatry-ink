import { useEffect, useState } from 'react'
import { MonitorSmartphone } from 'lucide-react'
import { translateUi } from '../../data/uiTranslations'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import { useViewport } from '../../hooks/useViewport'

const DISMISS_KEY = 'psychiatryink:phone-gate-dismissed'

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

interface PhoneGateProps {
  language: UiLanguage
  englishVariant?: EnglishVariant
}

/**
 * Full-screen, localized notice shown when the viewport is too small (a phone)
 * for the dense clinical layout — see {@link isPhoneViewport}. Rendered globally
 * in the app shell so it covers every public and authenticated route.
 *
 * This is a strong WARNING, not a hard lock-out: a "continue anyway" link lets a
 * clinician proceed (clinical-safety escape hatch), and the choice is remembered
 * for the rest of the browser session. The gate re-evaluates on every resize /
 * orientation change because {@link useViewport} listens for both.
 */
export function PhoneGate({ language, englishVariant = 'uk' }: PhoneGateProps) {
  const { isPhone } = useViewport()
  const [dismissed, setDismissed] = useState<boolean>(readDismissed)

  // Lock body scroll while the gate is the only visible surface.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const active = isPhone && !dismissed
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isPhone, dismissed])

  if (!isPhone || dismissed) return null

  const t = (key: Parameters<typeof translateUi>[1]) => translateUi(language, key, englishVariant)

  const handleContinue = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* best-effort — proceed regardless */
    }
    setDismissed(true)
  }

  return (
    <div className="phone-gate" role="dialog" aria-modal="true" aria-labelledby="phone-gate-title">
      <div className="phone-gate__card">
        <span className="phone-gate__icon" aria-hidden>
          <MonitorSmartphone strokeWidth={1.5} />
        </span>
        <p className="phone-gate__brand">Psychiatry.Ink</p>
        <h1 id="phone-gate-title" className="phone-gate__title">
          {t('phoneGateTitle')}
        </h1>
        <p className="phone-gate__body">{t('phoneGateBody')}</p>
        <button type="button" className="phone-gate__continue" onClick={handleContinue}>
          {t('phoneGateContinue')}
        </button>
      </div>
    </div>
  )
}
