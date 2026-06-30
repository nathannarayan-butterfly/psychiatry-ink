import { useEffect, useMemo, useState } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'
import { translateUi } from '../../data/uiTranslations'
import { loadBootstrapUiLanguage } from '../../utils/clinicalLanguage'
import {
  getCryptoVaultProbeStatus,
  subscribeToCryptoVaultProbe,
  type CryptoVaultProbeStatus,
} from '../../utils/bootCryptoVaultProbe'

/**
 * Full-screen blocking banner that surfaces when the boot-time
 * `openCryptoVaultDb()` probe fails (see `src/utils/bootCryptoVaultProbe.ts`).
 *
 * The banner is rendered OUTSIDE the per-route `TranslationProvider` so it can
 * surface even when App fails to render; that is why we read the locale via
 * `loadBootstrapUiLanguage()` + `translateUi()` directly instead of the
 * translation context.
 *
 * We deliberately block the rest of the UI: a clinician who proceeds past an
 * unopenable IDB will see every feature throw later (the original 2026-06-30
 * symptom). It is safer — and clearer — to stop here and tell them that the
 * server still holds their data, and that switching browsers is the recommended
 * recovery path.
 */
export function CryptoVaultBootBanner() {
  const [status, setStatus] = useState<CryptoVaultProbeStatus>(() =>
    getCryptoVaultProbeStatus(),
  )

  useEffect(() => subscribeToCryptoVaultProbe(setStatus), [])

  const t = useMemo(() => {
    const language = loadBootstrapUiLanguage()
    return (key: Parameters<typeof translateUi>[1]) => translateUi(language, key)
  }, [])

  if (status.state !== 'failed') return null

  return (
    <div
      role="alertdialog"
      aria-labelledby="crypto-vault-boot-banner-title"
      aria-describedby="crypto-vault-boot-banner-body"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(15,15,20,0.85)] p-6 backdrop-blur-sm"
      data-testid="crypto-vault-boot-banner"
    >
      <section className="max-w-xl w-full rounded-md border-2 border-recording bg-surface p-6 text-ink shadow-2xl">
        <header className="flex items-start gap-3">
          <AlertOctagon className="h-6 w-6 shrink-0 text-recording" strokeWidth={1.75} aria-hidden />
          <div>
            <h1
              id="crypto-vault-boot-banner-title"
              className="text-lg font-semibold leading-tight"
            >
              {t('cryptoVaultBootBannerTitle')}
            </h1>
            <p
              id="crypto-vault-boot-banner-body"
              className="mt-2 text-sm leading-relaxed text-muted"
            >
              {t('cryptoVaultBootBannerBody')}
            </p>
          </div>
        </header>

        <p className="mt-4 break-words rounded-sm border border-border bg-surface-sunken px-3 py-2 text-xs text-muted">
          <span className="font-mono">{status.message}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border bg-surface-hover px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-active"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('cryptoVaultBootBannerReload')}
          </button>
        </div>
      </section>
    </div>
  )
}
