import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'

export type TopNavTabId = 'overview' | 'workspace' | 'verlauf' | 'labor' | 'therapie' | 'dokumente'

interface CaseTopNavProps {
  activeTab: TopNavTabId
  onTabSelect: (tab: TopNavTabId) => void
  /** Patient's local name (retained for accessibility/title context). */
  patientName?: string
  /** Called when navigating to the patient dashboard overview. */
  onPatientClick?: () => void
  /** Display name of the next patient in the Meine Patienten list. */
  nextPatientName?: string
  /** Called when the next-patient button is clicked. */
  onNextPatientClick?: () => void
  /** Display name of the previous patient in the Meine Patienten list. */
  prevPatientName?: string
  /** Called when the prev-patient button is clicked. */
  onPrevPatientClick?: () => void
  /** Called when the Meine Patienten icon button is clicked. */
  onRegistryClick?: () => void
  /** Highlight the Meine Patienten button when the registry view is open. */
  registryActive?: boolean
  /** Whether a patient is linked to this case. Controls which tabs are visible. */
  hasPatient?: boolean
  /** Called when the "Zuordnen" pseudo-tab is clicked. */
  onCreatePatient?: () => void
  /** Label of the currently open page inside Workspace (shown dim next to the tab). */
  activePageLabel?: string
  /** Close the open workspace page and return to the default case home. */
  onCloseWorkspacePage?: () => void
}

interface TabConfig {
  id: TopNavTabId
  labelKey: UiTranslationKey
}

const TABS: TabConfig[] = [
  { id: 'overview', labelKey: 'topNavOverview' },
  { id: 'workspace', labelKey: 'topNavWorkspaceFall' },
  { id: 'verlauf', labelKey: 'topNavVerlauf' },
  { id: 'labor', labelKey: 'topNavLabor' },
  { id: 'therapie', labelKey: 'topNavTherapie' },
  { id: 'dokumente', labelKey: 'topNavDokumente' },
]

export function CaseTopNav({
  activeTab,
  onTabSelect,
  patientName: _patientName,
  onPatientClick: _onPatientClick,
  nextPatientName,
  onNextPatientClick,
  prevPatientName,
  onPrevPatientClick,
  onRegistryClick,
  registryActive = false,
  hasPatient = true,
  onCreatePatient,
  activePageLabel,
  onCloseWorkspacePage,
}: CaseTopNavProps) {
  const { t } = useTranslation()
  const [zuordnenOpen, setZuordnenOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const nextName = nextPatientName?.trim()
  const prevName = prevPatientName?.trim()
  const visibleTabs = hasPatient ? TABS : TABS.filter((tab) => tab.id === 'workspace')

  useEffect(() => {
    if (!zuordnenOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setZuordnenOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [zuordnenOpen])

  return (
    <nav className="case-topnav" aria-label="Case navigation">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={[
            'case-topnav__tab',
            activeTab === tab.id ? 'case-topnav__tab--active' : '',
          ]
            .join(' ')
            .trim()}
          onClick={() => onTabSelect(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {t(tab.labelKey)}
          {tab.id === 'workspace' && activeTab === 'workspace' && activePageLabel ? (
            <span className="case-topnav__tab-sublabel-group">
              <span className="case-topnav__tab-sublabel">{activePageLabel}</span>
              {onCloseWorkspacePage ? (
                <button
                  type="button"
                  className="case-topnav__tab-close"
                  onClick={(event) => {
                    event.stopPropagation()
                    onCloseWorkspacePage()
                  }}
                  aria-label={t('workspaceCloseDocument')}
                  title={t('workspaceCloseDocument')}
                >
                  <X className="h-3 w-3" strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </span>
          ) : null}
        </button>
      ))}

      <div className="case-topnav__right">
        {hasPatient && onPrevPatientClick && (
          <button
            type="button"
            className="case-topnav__nav-text-btn"
            onClick={onPrevPatientClick}
            title={prevName ? `${t('topNavPrevPatient')}: ${prevName}` : t('topNavPrevPatient')}
            aria-label={prevName ? `${t('topNavPrevPatient')}: ${prevName}` : t('topNavPrevPatient')}
          >
            {t('topNavPrevPatient')}
          </button>
        )}

        {/* Meine Patienten — navigates to the patient list */}
        <button
          type="button"
          className={[
            'case-topnav__nav-text-btn',
            registryActive ? 'case-topnav__nav-text-btn--active' : '',
          ].join(' ').trim()}
          onClick={onRegistryClick}
          title={t('topNavMeinePatienten')}
          aria-label={t('topNavMeinePatienten')}
          aria-pressed={registryActive}
        >
          {t('topNavMeinePatienten')}
        </button>

        {hasPatient && onNextPatientClick && (
          <button
            type="button"
            className="case-topnav__nav-text-btn"
            onClick={onNextPatientClick}
            title={nextName ? `${t('topNavNextPatient')}: ${nextName}` : t('topNavNextPatient')}
            aria-label={nextName ? `${t('topNavNextPatient')}: ${nextName}` : t('topNavNextPatient')}
          >
            {t('topNavNextPatient')}
          </button>
        )}

        {!hasPatient && (
          <div className="labor-zuordnen-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="case-topnav__create-patient-btn"
              onClick={() => setZuordnenOpen((o) => !o)}
              title="Zuordnen"
              aria-expanded={zuordnenOpen}
              aria-haspopup="listbox"
            >
              + Zuordnen
            </button>
            {zuordnenOpen && (
              <div className="labor-zuordnen-dropdown__menu" role="listbox">
                <button
                  type="button"
                  className="labor-zuordnen-dropdown__item"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setZuordnenOpen(false)
                    onCreatePatient?.()
                  }}
                >
                  Neuer Patient
                </button>
                <button
                  type="button"
                  className="labor-zuordnen-dropdown__item"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setZuordnenOpen(false)
                    onRegistryClick?.()
                  }}
                >
                  Vorhandener Patient
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
