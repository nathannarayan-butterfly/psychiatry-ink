import { useEffect, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { SettingsSectionId, UiLanguage } from '../../types/settings'
import { AppearanceSection } from './AppearanceSection'
import { WorkspaceSection } from './WorkspaceSection'
import {
  AboutSection,
  AccountSection,
  DocumentationSection,
  LanguageSection,
} from './PlaceholderSection'
import { KiInstructionsSettings } from './KiInstructionsSettings'
import type { useKiInstructions } from '../../hooks/useKiInstructions'
import { PatientPrivacySection } from './PatientPrivacySection'

interface SectionGroup {
  groupLabel?: string
  items: { id: SettingsSectionId; label: string }[]
}

interface SettingsPageProps {
  activeSection: SettingsSectionId
  onSectionChange: (section: SettingsSectionId) => void
  onClose: () => void
  appearance: ReturnType<typeof useAppearanceSettings>
  privacy: ReturnType<typeof usePrivacySettings>
  workspace: ReturnType<typeof useWorkspaceSettings>
  aiAutoMode: boolean
  onToggleAiAuto: () => void
  kiInstructions: ReturnType<typeof useKiInstructions>
  language: UiLanguage
  onSelectLanguage: (language: UiLanguage) => void
  workspaceVault: ReturnType<typeof useWorkspaceVault>
}

export function SettingsPage({
  activeSection,
  onSectionChange,
  onClose,
  appearance,
  privacy,
  workspace,
  aiAutoMode,
  onToggleAiAuto,
  kiInstructions,
  language,
  onSelectLanguage,
  workspaceVault,
}: SettingsPageProps) {
  const { t } = useTranslation()

  const sectionGroups: SectionGroup[] = useMemo(
    () => [
      {
        groupLabel: t('settingsNavGroupGeneral'),
        items: [
          { id: 'workspace', label: t('settingsWorkspace') },
          { id: 'language', label: t('settingsLanguage') },
          { id: 'documentation', label: t('settingsDocumentation') },
        ],
      },
      {
        items: [
          { id: 'appearance', label: t('settingsAppearance') },
          { id: 'ai', label: t('settingsAi') },
          { id: 'privacy', label: t('settingsPrivacy') },
          { id: 'account', label: t('account') },
          { id: 'about', label: t('settingsAbout') },
        ],
      },
    ],
    [t],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const activeSectionLabel = useMemo(() => {
    for (const group of sectionGroups) {
      const item = group.items.find((i) => i.id === activeSection)
      if (item) return item.label
    }
    return ''
  }, [sectionGroups, activeSection])

  return (
    <div className="settings-fullpage" data-lottie-exclusion>
      {/* Left sidebar */}
      <nav className="settings-fullpage__sidebar" aria-label={t('settingsTitle')}>
        <div className="settings-fullpage__sidebar-top">
          <button
            type="button"
            className="settings-fullpage__back"
            onClick={onClose}
            aria-label={t('settingsBack')}
          >
            <ArrowLeft className="settings-fullpage__back-icon" strokeWidth={1.5} aria-hidden />
            <span className="settings-fullpage__back-label">{t('settingsBack')}</span>
          </button>

          <p className="settings-fullpage__sidebar-title">{t('settingsTitle')}</p>
        </div>

        <div className="settings-fullpage__nav">
          {sectionGroups.map((group, gi) => (
            <div key={gi} className="settings-fullpage__nav-group">
              {group.groupLabel ? (
                <span className="settings-fullpage__nav-group-label">{group.groupLabel}</span>
              ) : (
                gi > 0 && <div className="settings-fullpage__nav-sep" />
              )}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-fullpage__nav-item${activeSection === item.id ? ' settings-fullpage__nav-item--active' : ''}`}
                  onClick={() => onSectionChange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* Right content area */}
      <div className="settings-fullpage__content">
        <header className="settings-fullpage__content-header">
          <h1 className="settings-fullpage__content-title">{activeSectionLabel}</h1>
        </header>
        <div className="settings-fullpage__content-body">
          {activeSection === 'appearance' ? <AppearanceSection appearance={appearance} /> : null}
          {activeSection === 'workspace' ? <WorkspaceSection workspace={workspace} /> : null}
          {activeSection === 'language' ? (
            <LanguageSection language={language} onSelectLanguage={onSelectLanguage} />
          ) : null}
          {activeSection === 'documentation' ? <DocumentationSection /> : null}
          {activeSection === 'ai' ? (
            <KiInstructionsSettings
              kiInstructions={kiInstructions}
              aiAutoMode={aiAutoMode}
              onToggleAiAuto={onToggleAiAuto}
            />
          ) : null}
          {activeSection === 'account' ? <AccountSection /> : null}
          {activeSection === 'privacy' ? (
            <PatientPrivacySection privacy={privacy} workspaceVault={workspaceVault} />
          ) : null}
          {activeSection === 'about' ? <AboutSection /> : null}
        </div>
      </div>
    </div>
  )
}
