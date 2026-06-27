import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useVersionCheck } from '../../hooks/useVersionCheck'

/**
 * Non-intrusive, dismissible prompt shown when a newer deploy is detected for a
 * long-lived tab. The user explicitly chooses to reload — we never auto-reload,
 * which could discard unsaved clinical input.
 *
 * Nagging is bounded: dismissing suppresses the CURRENT detected build id. If an
 * even newer build is later detected, the prompt returns for that new id.
 */
export function NewVersionToast() {
  const newBuildId = useVersionCheck()
  const { t } = useTranslation()
  const [dismissedBuildId, setDismissedBuildId] = useState<string | null>(null)

  if (!newBuildId || newBuildId === dismissedBuildId) return null

  return (
    <div className="version-toast" role="status" aria-live="polite">
      <div className="version-toast__text">
        <span className="version-toast__title">{t('newVersionAvailable')}</span>
        <span className="version-toast__hint">{t('newVersionHint')}</span>
      </div>
      <div className="version-toast__actions">
        <button
          type="button"
          className="version-toast__reload"
          onClick={() => window.location.reload()}
        >
          <RefreshCw aria-hidden size={14} />
          {t('newVersionReload')}
        </button>
        <button
          type="button"
          className="version-toast__dismiss"
          aria-label={t('newVersionDismiss')}
          title={t('newVersionDismiss')}
          onClick={() => setDismissedBuildId(newBuildId)}
        >
          <X aria-hidden size={16} />
        </button>
      </div>
    </div>
  )
}
