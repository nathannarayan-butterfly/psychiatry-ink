import { useEffect, useState } from 'react'
import { useEnterpriseFeatures } from '../../hooks/useEnterpriseFeatures'
import { fetchEnterpriseSsoConfig, type EnterpriseSsoConfig } from '../../services/enterpriseApi'
import '../../styles/enterprise.css'

interface EnterpriseSsoPlaceholderProps {
  onBack: () => void
}

export function EnterpriseSsoPlaceholder({ onBack }: EnterpriseSsoPlaceholderProps) {
  const { canAccessEnterpriseUi } = useEnterpriseFeatures()
  const [config, setConfig] = useState<EnterpriseSsoConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canAccessEnterpriseUi) return
    let cancelled = false
    void fetchEnterpriseSsoConfig()
      .then((row) => {
        if (!cancelled) setConfig(row)
      })
      .catch(() => {
        if (!cancelled) setConfig(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canAccessEnterpriseUi])

  if (!canAccessEnterpriseUi) return null

  return (
    <div className="enterprise-page">
      <div className="enterprise-page__inner">
        <header className="enterprise-page__header">
          <div>
            <button type="button" className="enterprise-page__back" onClick={onBack}>
              ← Enterprise
            </button>
            <h1 className="enterprise-page__title">SSO (Enterprise)</h1>
            <p className="enterprise-page__subtitle">Single Sign-On Konfiguration</p>
          </div>
        </header>

        <p className="enterprise-stub-note">
          SAML/OIDC-Anbindung — Konfiguration folgt. Keine SSO-Daten erforderlich für den Betrieb.
        </p>

        {loading ? (
          <p className="enterprise-empty">Laden…</p>
        ) : (
          <ul className="enterprise-list">
            <li className="enterprise-list__item">
              <div className="enterprise-list__item-name">Provider</div>
              <div className="enterprise-list__item-meta">{config?.provider ?? 'saml'}</div>
            </li>
            <li className="enterprise-list__item">
              <div className="enterprise-list__item-name">Status</div>
              <div className="enterprise-list__item-meta">
                {config?.enabled ? 'Aktiviert' : 'Deaktiviert'}
              </div>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
