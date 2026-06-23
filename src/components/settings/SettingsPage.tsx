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
import { AboutSection, AccountSection, LanguageSection } from './PlaceholderSection'
import { KiInstructionsSettings } from './KiInstructionsSettings'
import { KiModelSettings } from './KiModelSettings'
import type { useKiInstructions } from '../../hooks/useKiInstructions'
import { useAiModelPreferences } from '../../hooks/useAiModelPreferences'
import { PatientPrivacySection } from './PatientPrivacySection'
import { LabImportSection } from './LabImportSection'
import { ParserOptimizationSection } from './ParserOptimizationSection'
import { OverviewWidgetsSettingsSection } from './OverviewWidgetsSettingsSection'
import { KbAdminSection } from './KbAdminSection'
import { CreditsSettingsSection } from './CreditsSettingsSection'
import { SettingsSidebarPanel } from './SettingsSidebarPanel'
import type { SettingsSectionGroup } from './SettingsSectionNav'
import '../../styles/case-sidebar.css'

interface SettingsPageProps {
  activeSection: SettingsSectionId
  onSectionChange: (section: SettingsSectionId) => void
  onClose: () => void
  onOpenCredits: () => void
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
  onOpenCredits,
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
  const modelPreferences = useAiModelPreferences()

  const sectionGroups: SettingsSectionGroup[] = useMemo(
    () => [
      {
        groupLabel: t('settingsNavGroupGeneral'),
        items: [
          { id: 'language', label: t('settingsLanguage') },
          { id: 'appearance', label: t('settingsAppearance') },
          { id: 'workspace', label: t('settingsWorkspace') },
        ],
      },
      {
        groupLabel: t('settingsNavGroupDocumentation'),
        items: [
          { id: 'lab', label: t('settingsLab') },
          { id: 'parser-optimization', label: t('settingsParserOptimization') },
          { id: 'overview-widgets', label: t('settingsOverviewWidgets') },
        ],
      },
      {
        groupLabel: t('settingsNavGroupSystem'),
        items: [
          { id: 'ai', label: t('settingsAi') },
          { id: 'privacy', label: t('settingsPrivacy') },
          { id: 'about', label: t('settingsAbout') },
          { id: 'kb-admin', label: t('settingsKbAdmin') },
        ],
      },
      {
        groupLabel: t('settingsNavGroupAccount'),
        items: [
          { id: 'credits', label: t('settingsCredits') },
          { id: 'account', label: t('settingsAccount') },
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
        onOpenCredits={onOpenCredits}
        creditBalance={creditBalance}
      />

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
          {activeSection === 'lab' ? <LabImportSection /> : null}
          {activeSection === 'parser-optimization' ? <ParserOptimizationSection /> : null}
          {activeSection === 'overview-widgets' ? <OverviewWidgetsSettingsSection /> : null}
          {activeSection === 'kb-admin' ? <KbAdminSection /> : null}
          {activeSection === 'ai' ? (
            <>
              <KiModelSettings modelPreferences={modelPreferences} />
              <KiInstructionsSettings
                kiInstructions={kiInstructions}
                aiAutoMode={aiAutoMode}
                onToggleAiAuto={onToggleAiAuto}
              />
            </>
          ) : null}
          {activeSection === 'privacy' ? (
            <PatientPrivacySection privacy={privacy} workspaceVault={workspaceVault} />
          ) : null}
          {activeSection === 'account' ? <AccountSection /> : null}
          {activeSection === 'credits' ? (
            <CreditsSettingsSection onOpenCredits={onOpenCredits} />
          ) : null}
          {activeSection === 'about' ? <AboutSection /> : null}
        </div>
      </div>
    </div>
  )
}
