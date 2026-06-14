import { useEnterpriseFeatures } from '../../hooks/useEnterpriseFeatures'
import '../../styles/enterprise.css'

interface EnterpriseIntegrationsPageProps {
  onBack: () => void
}

export function EnterpriseIntegrationsPage({ onBack }: EnterpriseIntegrationsPageProps) {
  const { canAccessEnterpriseUi } = useEnterpriseFeatures()

  if (!canAccessEnterpriseUi) return null

  return (
    <div className="enterprise-page">
      <div className="enterprise-page__inner">
        <header className="enterprise-page__header">
          <div>
            <button type="button" className="enterprise-page__back" onClick={onBack}>
              ← Enterprise
            </button>
            <h1 className="enterprise-page__title">Integrationen</h1>
            <p className="enterprise-page__subtitle">Schnittstellen und Anbindungen (Enterprise)</p>
          </div>
        </header>

        <p className="enterprise-stub-note">
          Platzhalter — HL7/FHIR, Labor-Schnittstellen und weitere Integrationen folgen.
        </p>

        <ul className="enterprise-list">
          <li className="enterprise-list__item">
            <div className="enterprise-list__item-name">Labor-Import</div>
            <div className="enterprise-list__item-meta">Geplant</div>
          </li>
          <li className="enterprise-list__item">
            <div className="enterprise-list__item-name">KIS-Anbindung</div>
            <div className="enterprise-list__item-meta">Geplant</div>
          </li>
        </ul>
      </div>
    </div>
  )
}
