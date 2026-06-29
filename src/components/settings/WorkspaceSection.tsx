import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiLanguage } from '../../types/settings'
import { translateSettingsWorkspaceUi } from '../../data/settingsWorkspaceUiTranslations'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { WorkspaceComponentTemplate } from '../../types/workspaceSettings'
import { localizeWorkspaceComponents } from '../../utils/localizeComponents'

interface WorkspaceSectionProps {
  workspace: ReturnType<typeof useWorkspaceSettings>
}

function getComponentSummary(component: WorkspaceComponentTemplate, language: UiLanguage): string {
  const sectionsWord = translateSettingsWorkspaceUi(language, 'wsSectionsCount')
  if (component.variants?.length) {
    return component.variants
      .map((variant) =>
        variant.multistage
          ? `${variant.label} (${variant.sections.length} ${sectionsWord})`
          : variant.label,
      )
      .join(' · ')
  }

  if (component.multistage) {
    return `${component.sections.length} ${sectionsWord}`
  }

  return translateSettingsWorkspaceUi(language, 'wsSingleDocument')
}

export function WorkspaceSection({ workspace }: WorkspaceSectionProps) {
  const { t, language, englishVariant } = useTranslation()
  const [expandedId, setExpandedId] = useState<string | null>(
    workspace.components[0]?.id ?? null,
  )

  const displayById = useMemo(() => {
    const localized = localizeWorkspaceComponents(
      workspace.components,
      language,
      englishVariant,
    )
    return new Map(localized.map((component) => [component.id, component]))
  }, [workspace.components, language, englishVariant])

  return (
    <div>
      <div className="settings-section-toolbar">
        <button
          type="button"
          onClick={workspace.resetWorkspace}
          className="settings-section-toolbar__action"
        >
          {t('settingsReset')}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {workspace.components.map((component) => {
          const displayComponent = displayById.get(component.id) ?? component
          const isExpanded = expandedId === component.id

          return (
            <div
              key={component.id}
              className="rounded-sm border-2 border-border bg-surface"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : component.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {displayComponent.label}
                    <span className="ml-2 rounded-sm bg-surface-hover px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                      {translateSettingsWorkspaceUi(language, 'wsStandardBadge')}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {getComponentSummary(displayComponent, language)}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  strokeWidth={1.5}
                  aria-hidden
                />
              </button>

              {isExpanded ? (
                <div className="space-y-4 border-t-2 border-border px-3 py-4">
                  <p className="rounded-sm border border-border/70 bg-surface-hover/40 px-3 py-2 text-xs text-muted">
                    {translateSettingsWorkspaceUi(language, 'wsDefaultComponentNote')}
                  </p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
