import { AuditDebugPage } from '../audit/AuditDebugPage'
import { useEnterpriseFeatures } from '../../hooks/useEnterpriseFeatures'
import '../../styles/enterprise.css'

interface EnterpriseCompliancePageProps {
  onBack: () => void
}

/** Enterprise compliance view — wraps audit debug with enterprise gate. */
export function EnterpriseCompliancePage({ onBack }: EnterpriseCompliancePageProps) {
  const { canAccessEnterpriseUi } = useEnterpriseFeatures()

  if (!canAccessEnterpriseUi) return null

  return (
    <div className="enterprise-page">
      <div className="enterprise-page__inner" style={{ maxWidth: '64rem' }}>
        <header className="enterprise-page__header">
          <div>
            <button type="button" className="enterprise-page__back" onClick={onBack}>
              ← Enterprise
            </button>
            <h1 className="enterprise-page__title">Compliance</h1>
            <p className="enterprise-page__subtitle">Audit- und Compliance-Dashboard (Enterprise)</p>
          </div>
        </header>
        <p className="enterprise-stub-note">
          Organisationsweite Audit-Logs — Vollversion folgt; derzeit Audit-Debug-Ansicht.
        </p>
      </div>
      <AuditDebugPage onBack={onBack} />
    </div>
  )
}
