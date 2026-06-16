import { useEffect, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { EnglishVariant, SettingsSectionId, UiLanguage } from '../../types/settings'
import type { AssessmentStandard } from '../../types/isdm'
import { AppearanceSection } from './AppearanceSection'
import { WorkspaceSection } from './WorkspaceSection'
import {
  AboutSection,
  AccountSection,
  DocumentationSection,
  LanguageSection,
} from './PlaceholderSection'
import { KiInstructionsSettings } from './KiInstructionsSettings'
import { AiUsageTrackerPanel } from './AiUsageTrackerPanel'
import type { useKiInstructions } from '../../hooks/useKiInstructions'
import { PatientPrivacySection } from './PatientPrivacySection'
import { LabImportSection } from './LabImportSection'
import { KbAdminSection } from './KbAdminSection'
import { SettingsSidebarPanel } from './SettingsSidebarPanel'
import type { SettingsSectionGroup } from './SettingsSectionNav'
import '../../styles/case-sidebar.css'

interface SettingsPageProps {
  activeSection: SettingsSectionId
  onSectionChange: (section: SettingsSectionId) => void
  onClose: () => void
  creditBalance: number
  appearance: ReturnType<typeof useAppearanceSettings>
  privacy: ReturnType<typeof usePrivacySettings>
  workspace: ReturnType<typeof useWorkspaceSettings>
  aiAutoMode: boolean
  onToggleAiAuto: () => void
  kiInstructions: ReturnType<typeof useKiInstructions>
  language: UiLanguage
  englishVariant: EnglishVariant
  onSelectLanguage: (language: UiLanguage) => void
  onSelectEnglishVariant: (variant: EnglishVariant) => void
  assessmentStandard: AssessmentStandard
  onSelectAssessmentStandard: (standard: AssessmentStandard) => void
  workspaceVault: ReturnType<typeof useWorkspaceVault>
}

export function SettingsPage({
  activeSection,
  onSectionChange,
  onClose,
  creditBalance,
  appearance,
  privacy,
  workspace,
  aiAutoMode,
  onToggleAiAuto,
  kiInstructions,
  language,
  englishVariant,
  onSelectLanguage,
  onSelectEnglishVariant,
  assessmentStandard,
  onSelectAssessmentStandard,
  workspaceVault,
}: SettingsPageProps) {
  const { t } = useTranslation()

  const sectionGroups: SettingsSectionGroup[] = useMemo(
    () => [
      {
        groupLabel: t('settingsNavGroupGeneral'),
        items: [
          { id: 'workspace', label: t('settingsWorkspace') },
          { id: 'language', label: t('settingsLanguage') },
          { id: 'documentation', label: t('settingsDocumentation') },
          { id: 'lab', label: t('settingsLab') },
          { id: 'kb-admin', label: 'KB Admin' },
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
    <div className="settings-sidebar-layout text-ink">
      <SettingsSidebarPanel
        groups={sectionGroups}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onClose={onClose}
        creditBalance={creditBalance}
      />

      {/* Right content area */}
      <div className="settings-fullpage__content settings-sidebar-main">
        <div className="case-main-top-bar">
          <button
            type="button"
            className="case-sidebar-back-link case-sidebar-back-link--content"
            onClick={onClose}
            aria-label={t('settingsBack')}
          >
            <ArrowLeft className="case-sidebar-back-link__icon" strokeWidth={2} aria-hidden />
            <span>{t('settingsBack')}</span>
          </button>
        </div>
        <header className="settings-fullpage__content-header">
          <h1 className="settings-fullpage__content-title">{activeSectionLabel}</h1>
        </header>
        <div className="settings-fullpage__content-body">
          {activeSection === 'appearance' ? <AppearanceSection appearance={appearance} /> : null}
          {activeSection === 'workspace' ? <WorkspaceSection workspace={workspace} /> : null}
          {activeSection === 'language' ? (
            <LanguageSection
              language={language}
              englishVariant={englishVariant}
              onSelectLanguage={onSelectLanguage}
              onSelectEnglishVariant={onSelectEnglishVariant}
              assessmentStandard={assessmentStandard}
              onSelectAssessmentStandard={onSelectAssessmentStandard}
            />
          ) : null}
          {activeSection === 'documentation' ? <DocumentationSection /> : null}
          {activeSection === 'lab' ? <LabImportSection /> : null}
          {activeSection === 'kb-admin' ? <KbAdminSection /> : null}
          {activeSection === 'ai' ? (
            <>
              <KiInstructionsSettings
                kiInstructions={kiInstructions}
                aiAutoMode={aiAutoMode}
                onToggleAiAuto={onToggleAiAuto}
              />
              <AiUsageTrackerPanel />
            </>
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
