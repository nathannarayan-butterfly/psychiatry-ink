import { KeyRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import {
  isAccountRegistryRestoreNeeded,
  isKeyRestoreNeeded,
  restoreAccountCloudBackup,
} from '../../utils/accountBackup'
import { markAccountKeyLinked } from '../../utils/accountKeyLink'

interface AccountRegistryRestoreBannerProps {
  countryCode: string
  onRestored: () => void
}

/** Why the unlock prompt is showing — drives the copy and the success message. */
type RestoreReason = 'key' | 'registry'

export function AccountRegistryRestoreBanner({
  countryCode,
  onRestored,
}: AccountRegistryRestoreBannerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [reason, setReason] = useState<RestoreReason | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        // A new device whose local key pair is not yet the account key must
        // unlock BEFORE anything else — without the real private key the
        // encrypted case files cannot be read. This takes precedence over the
        // (narrower) identifier-only restore.
        const keyNeeded = await isKeyRestoreNeeded(userId)
        if (!active) return
        if (keyNeeded) {
          setReason('key')
          return
        }
        const registryNeeded = await isAccountRegistryRestoreNeeded()
        if (active) setReason(registryNeeded ? 'registry' : null)
      } catch {
        if (active) setReason(null)
      }
    })()
    return () => {
      active = false
    }
  }, [userId])

  const handleRestore = useCallback(async () => {
    if (!passphrase.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const result = await restoreAccountCloudBackup(passphrase.trim(), countryCode)
      // The passphrase decrypted the account key backup, so this browser now
      // holds the account's real private key — remember it so the prompt does
      // not reappear on every login on this device.
      markAccountKeyLinked(userId)
      setPassphrase('')
      setReason(null)
      const parts = [t('accountBackupCloudRestored')]
      if (result.identifiersFromAccount) {
        parts.push(`${result.identifierCases} ${t('accountBackupIdentifiersLabel')}`)
      }
      parts.push(`${result.workspaceCases} ${t('accountBackupWorkspaceLabel')}`)
      setStatus(parts.join(' — '))
      onRestored()
    } catch {
      setStatus(t('workspacePassphraseRestoreFailed'))
    } finally {
      setBusy(false)
    }
  }, [countryCode, onRestored, passphrase, t, userId])

  if (!reason && !status) return null

  if (!reason) {
    return status ? <p className="dashboard-restore-banner__status text-xs text-muted">{status}</p> : null
  }

  const title =
    reason === 'key' ? t('accountKeyRestoreBannerTitle') : t('accountRegistryRestoreBannerTitle')
  const body =
    reason === 'key' ? t('accountKeyRestoreBannerBody') : t('accountRegistryRestoreBannerBody')
  const action =
    reason === 'key' ? t('accountKeyRestoreBannerAction') : t('accountRegistryRestoreBannerAction')

  return (
    <section className="dashboard-restore-banner" aria-labelledby="dashboard-restore-banner-title">
      <div className="dashboard-restore-banner__header">
        <KeyRound className="dashboard-restore-banner__icon" strokeWidth={1.75} aria-hidden />
        <div>
          <h2 id="dashboard-restore-banner-title" className="dashboard-restore-banner__title">
            {title}
          </h2>
          <p className="dashboard-restore-banner__body">{body}</p>
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
          {action}
        </button>
      </div>
      {status ? <p className="dashboard-restore-banner__status text-xs text-recording">{status}</p> : null}
    </section>
  )
}
