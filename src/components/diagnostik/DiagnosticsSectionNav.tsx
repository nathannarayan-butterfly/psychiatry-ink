import { useTranslation } from '../../context/TranslationContext'
import { useDiagnosticsSectionNavOptional } from '../../contexts/DiagnosticsSectionNavContext'
import { DIAGNOSTICS_SECTIONS } from '../../data/diagnosticsSections'

/**
 * Diagnostik/Labor tab navigation in the global case sidebar.
 *
 * Shows only the section-level switcher (Labor, Befunde, …). Individual
 * Labor/Befund entries (e.g. "10.06.2026 EKG") are intentionally NOT listed
 * here — they live in the Diagnostik page body (labor-page__sidebar) so the
 * global left panel stays uncluttered and consistent with the other tabs.
 */
export function DiagnosticsSectionNav() {
  const { t } = useTranslation()
  const nav = useDiagnosticsSectionNavOptional()
  if (!nav) return null

  const { diagnosticsSection, setDiagnosticsSection } = nav

  return (
    <nav className="med-therapy-nav diagnostics-sidebar-nav" aria-label={t('diagnosticsPageTitle')}>
      <label className="med-therapy-nav__dropdown">
        <span className="med-therapy-nav__dropdown-label">{t('diagnosticsPageTitle')}</span>
        <select
          className="med-therapy-nav__select"
          value={diagnosticsSection}
          onChange={(e) => setDiagnosticsSection(e.target.value as typeof diagnosticsSection)}
          aria-label={t('diagnosticsPageTitle')}
        >
          {DIAGNOSTICS_SECTIONS.map((section) => (
            <option key={section.id} value={section.id} disabled={!section.enabled}>
              {t(section.labelKey)}
              {!section.enabled ? ` (${t('diagnosticsSectionComingSoon')})` : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="med-therapy-nav__list">
        <div className="med-therapy-nav__group">
          <span className="med-therapy-nav__title">{t('diagnosticsPageTitle')}</span>
          <ul className="med-therapy-nav__items">
            {DIAGNOSTICS_SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className={`med-therapy-nav__link${
                    diagnosticsSection === section.id ? ' med-therapy-nav__link--active' : ''
                  }`}
                  disabled={!section.enabled}
                  title={section.enabled ? undefined : t('diagnosticsSectionComingSoon')}
                  onClick={() => section.enabled && setDiagnosticsSection(section.id)}
                >
                  {t(section.labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
