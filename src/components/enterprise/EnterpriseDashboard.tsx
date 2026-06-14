import { Building2, ClipboardList, Link2, Plug, Shield, Users } from 'lucide-react'
import { useEnterpriseFeatures, useEnterpriseNotActivatedHint } from '../../hooks/useEnterpriseFeatures'
import { ENTERPRISE_ROLE_LIST, teamRoleLabelDe } from '../../data/org/teamRoles'
import '../../styles/enterprise.css'

interface EnterpriseDashboardProps {
  onNavigate: (path: string) => void
  onBack: () => void
}

export function EnterpriseDashboard({ onNavigate, onBack }: EnterpriseDashboardProps) {
  const { canAccessEnterpriseUi, enterpriseSettings } = useEnterpriseFeatures()
  const showNotActivated = useEnterpriseNotActivatedHint()

  if (!canAccessEnterpriseUi) {
    if (showNotActivated) {
      return (
        <div className="enterprise-page">
          <div className="enterprise-page__inner">
            <header className="enterprise-page__header">
              <button type="button" className="enterprise-page__back" onClick={onBack}>
                ← Dashboard
              </button>
            </header>
            <p className="enterprise-stub-note">Enterprise nicht aktiviert — Tier muss „enterprise“ sein.</p>
          </div>
        </div>
      )
    }
    return null
  }

  const links = [
    {
      path: '/dashboard/enterprise/sites',
      title: 'Standorte',
      desc: 'Kliniken und Standorte verwalten',
      icon: Building2,
    },
    {
      path: '/dashboard/enterprise/sites?type=department',
      title: 'Abteilungen',
      desc: 'Abteilungen und Einheiten (Stub)',
      icon: Users,
    },
    {
      path: '/dashboard/enterprise/sso',
      title: 'SSO',
      desc: 'Single Sign-On (Enterprise)',
      icon: Shield,
    },
    {
      path: '/dashboard/compliance',
      title: 'Compliance',
      desc: 'Audit- und Compliance-Dashboard',
      icon: ClipboardList,
    },
    {
      path: '/dashboard/enterprise/integrations',
      title: 'Integrationen',
      desc: 'Schnittstellen und Anbindungen',
      icon: Plug,
    },
  ]

  if (enterpriseSettings.externalConsultantMode) {
    links.push({
      path: '/consultant/requests',
      title: 'Externe Konsile',
      desc: 'Konsil- und Discuss-Modus für externe Berater',
      icon: Link2,
    })
  }

  return (
    <div className="enterprise-page">
      <div className="enterprise-page__inner">
        <header className="enterprise-page__header">
          <div>
            <button type="button" className="enterprise-page__back" onClick={onBack}>
              ← Dashboard
            </button>
            <h1 className="enterprise-page__title">Enterprise</h1>
            <p className="enterprise-page__subtitle">Organisationsverwaltung und erweiterte Einstellungen</p>
          </div>
        </header>

        <p className="enterprise-stub-note">
          Vorschau — Enterprise-Funktionen sind hinter dem Feature-Flag vorbereitet und noch nicht produktiv.
        </p>

        <div className="enterprise-hub__grid">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.path}
                type="button"
                className="enterprise-hub__link"
                onClick={() => onNavigate(link.path)}
              >
                <span>
                  <span className="enterprise-hub__link-title">{link.title}</span>
                  <span className="enterprise-hub__link-desc">{link.desc}</span>
                </span>
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            )
          })}
        </div>

        <section style={{ marginTop: '2rem' }}>
          <h2 className="enterprise-page__title" style={{ fontSize: '1rem' }}>
            Rollen (Stub)
          </h2>
          <ul className="enterprise-role-list">
            {ENTERPRISE_ROLE_LIST.map((role) => (
              <li key={role}>{teamRoleLabelDe(role)}</li>
            ))}
          </ul>
          <p className="enterprise-empty">
            Erweiterte Rollenzuweisung — API vorbereitet, UI folgt.
          </p>
        </section>
      </div>
    </div>
  )
}
