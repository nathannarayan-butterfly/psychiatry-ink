import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'

export type TopNavTabId = 'overview' | 'workspace' | 'verlauf' | 'labor' | 'therapie' | 'dokumente'

interface CaseTopNavProps {
  activeTab: TopNavTabId
  onTabSelect: (tab: TopNavTabId) => void
  /** Patient's local name to display in the assignment control. */
  patientName?: string
  /** Called when the patient name chip is clicked — typically navigates to dashboard. */
  onPatientClick?: () => void
  /** Called when the patient registry chip is clicked. */
  onRegistryClick?: () => void
  /** Highlight the registry chip when the registry view is open. */
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
  patientName,
  onPatientClick,
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

  const displayName = patientName?.trim()
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
        <button
          type="button"
          className={[
            'case-topnav__registry-link',
            registryActive ? 'case-topnav__registry-link--active' : '',
          ].join(' ').trim()}
          onClick={onRegistryClick}
          title={t('patientNavFallback')}
        >
          {t('patientNavFallback')}
        </button>
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
        {displayName ? (
          <button
            type="button"
            className="case-topnav__patient-name"
            onClick={onPatientClick}
            title={displayName}
            aria-label={displayName}
          >
            {displayName}
          </button>
        ) : null}
      </div>
    </nav>
  )
}
