import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { SettingsSectionId, UiLanguage } from '../../types/settings'
import { AppearanceSection } from './AppearanceSection'
import { WorkspaceSection } from './WorkspaceSection'
import {
  AccountSection,
  DocumentationSection,
  LanguageSection,
} from './PlaceholderSection'
import { KiInstructionsSettings } from './KiInstructionsSettings'
import type { useKiInstructions } from '../../hooks/useKiInstructions'
import { PatientPrivacySection } from './PatientPrivacySection'

const sectionLabelKeys: Record<SettingsSectionId, UiTranslationKey> = {
  appearance: 'settingsAppearance',
  workspace: 'settingsWorkspace',
  language: 'settingsLanguage',
  documentation: 'settingsDocumentation',
  ai: 'settingsAi',
  account: 'account',
  privacy: 'settingsPrivacy',
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
  const sections = useMemo(
    () =>
      (Object.keys(sectionLabelKeys) as SettingsSectionId[]).map((id) => ({
        id,
        label: t(sectionLabelKeys[id]),
      })),
    [t],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      data-lottie-exclusion
      className="settings-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="settings-dialog flex h-[min(640px,90dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-sm border-2 border-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-dialog__header flex shrink-0 items-center justify-between border-b-2 border-border px-5 py-4">
          <h1 id="settings-title" className="text-base font-semibold text-ink">
            {t('settingsTitle')}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('settingsClose')}
            className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border text-ink transition-colors hover:bg-surface-hover"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:flex-row">
          <nav className="settings-dialog__nav flex shrink-0 gap-1 overflow-x-auto border-b-2 border-border p-2 sm:w-44 sm:flex-col sm:overflow-x-visible sm:border-b-0 sm:border-r-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`shrink-0 rounded-sm px-3 py-2 text-left text-xs transition-colors sm:mb-0.5 sm:w-full ${
                  activeSection === section.id
                    ? 'bg-surface-active font-medium text-ink'
                    : 'text-ink hover:bg-surface-hover'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6">
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
          </div>
        </div>
      </div>
    </div>
  )
}
