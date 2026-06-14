import { useEffect, useState } from 'react'
import { useEnterpriseFeatures } from '../../hooks/useEnterpriseFeatures'
import { fetchEnterpriseSites, fetchEnterpriseTeams, type EnterpriseSite } from '../../services/enterpriseApi'
import '../../styles/enterprise.css'

interface EnterpriseSitesPageProps {
  onBack: () => void
  initialTab?: 'sites' | 'departments'
}

export function EnterpriseSitesPage({ onBack, initialTab = 'sites' }: EnterpriseSitesPageProps) {
  const { canAccessEnterpriseUi } = useEnterpriseFeatures()
  const [tab, setTab] = useState<'sites' | 'departments'>(initialTab)
  const [sites, setSites] = useState<EnterpriseSite[]>([])
  const [departments, setDepartments] = useState<Awaited<ReturnType<typeof fetchEnterpriseTeams>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canAccessEnterpriseUi) return
    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [siteRows, deptRows] = await Promise.all([
          fetchEnterpriseSites(),
          fetchEnterpriseTeams('department'),
        ])
        if (!cancelled) {
          setSites(siteRows)
          setDepartments(deptRows)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

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
            <h1 className="enterprise-page__title">Standorte & Abteilungen</h1>
          </div>
        </header>

        <div className="dashboard-settings-chips" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`dashboard-settings-chip${tab === 'sites' ? ' dashboard-settings-chip--active' : ''}`}
            onClick={() => setTab('sites')}
          >
            Standorte
          </button>
          <button
            type="button"
            className={`dashboard-settings-chip${tab === 'departments' ? ' dashboard-settings-chip--active' : ''}`}
            onClick={() => setTab('departments')}
          >
            Abteilungen
          </button>
        </div>

        {loading ? <p className="enterprise-empty">Laden…</p> : null}
        {error ? <p className="enterprise-stub-note">{error}</p> : null}

        {!loading && tab === 'sites' ? (
          sites.length === 0 ? (
            <p className="enterprise-empty">Noch keine Standorte angelegt.</p>
          ) : (
            <ul className="enterprise-list">
              {sites.map((site) => (
                <li key={site.id} className="enterprise-list__item">
                  <div className="enterprise-list__item-name">{site.name}</div>
                  <div className="enterprise-list__item-meta">Code: {site.code}</div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {!loading && tab === 'departments' ? (
          departments.length === 0 ? (
            <p className="enterprise-empty">Noch keine Abteilungen angelegt.</p>
          ) : (
            <ul className="enterprise-list">
              {departments.map((dept) => (
                <li key={dept.id} className="enterprise-list__item">
                  <div className="enterprise-list__item-name">{dept.name}</div>
                  <div className="enterprise-list__item-meta">Typ: {dept.teamType}</div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  )
}
