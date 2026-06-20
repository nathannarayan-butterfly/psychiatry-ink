import { KeyRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import {
  isAccountRegistryRestoreNeeded,
  restoreAccountCloudBackup,
} from '../../utils/accountBackup'

interface AccountRegistryRestoreBannerProps {
  countryCode: string
  onRestored: () => void
}

export function AccountRegistryRestoreBanner({
  countryCode,
  onRestored,
}: AccountRegistryRestoreBannerProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void isAccountRegistryRestoreNeeded()
      .then((needed) => {
        if (active) setVisible(needed)
      })
      .catch(() => {
        if (active) setVisible(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleRestore = useCallback(async () => {
    if (!passphrase.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const result = await restoreAccountCloudBackup(passphrase.trim(), countryCode)
      setPassphrase('')
      setVisible(false)
      setStatus(
        `${t('accountBackupCloudRestored')} — ${result.identifierCases} ${t('accountBackupIdentifiersLabel')}`,
      )
      onRestored()
    } catch {
      setStatus(t('workspacePassphraseRestoreFailed'))
    } finally {
      setBusy(false)
    }
  }, [countryCode, onRestored, passphrase, t])

  if (!visible && !status) return null

  if (!visible) {
    return status ? <p className="dashboard-restore-banner__status text-xs text-muted">{status}</p> : null
  }

  return (
    <section className="dashboard-restore-banner" aria-labelledby="dashboard-restore-banner-title">
      <div className="dashboard-restore-banner__header">
        <KeyRound className="dashboard-restore-banner__icon" strokeWidth={1.75} aria-hidden />
        <div>
          <h2 id="dashboard-restore-banner-title" className="dashboard-restore-banner__title">
            {t('accountRegistryRestoreBannerTitle')}
          </h2>
          <p className="dashboard-restore-banner__body">{t('accountRegistryRestoreBannerBody')}</p>
        </div>
      </div>
      <div className="dashboard-restore-banner__actions">
        <input
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          placeholder={t('workspacePassphrasePlaceholder')}
          className="dashboard-restore-banner__input rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink"
          autoComplete="current-password"
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={busy || !passphrase.trim()}
          className="dashboard-restore-banner__button rounded-sm border-2 border-border px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          {t('accountRegistryRestoreBannerAction')}
        </button>
      </div>
      {status ? <p className="dashboard-restore-banner__status text-xs text-recording">{status}</p> : null}
    </section>
  )
}
