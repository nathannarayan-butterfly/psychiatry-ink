import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiLanguage } from '../../types/settings'
import {
  formatSettingsWorkspaceUi,
  translateSettingsWorkspaceUi,
  type SettingsWorkspaceUiKey,
} from '../../data/settingsWorkspaceUiTranslations'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type {
  WorkspaceChecklistItem,
  WorkspaceComponentTemplate,
  WorkspaceComponentIcon,
  WorkspaceSectionTemplate,
} from '../../types/workspaceSettings'
import { localizeWorkspaceComponents } from '../../utils/localizeComponents'
import { AiManagerSettings } from './AiManagerSettings'
import { SettingsField } from './SettingsField'

const iconOptions: Array<{ value: WorkspaceComponentIcon; labelKey: SettingsWorkspaceUiKey }> = [
  { value: 'clipboard', labelKey: 'wsIconClipboard' },
  { value: 'file-text', labelKey: 'wsIconDocument' },
  { value: 'brain', labelKey: 'wsIconBrain' },
  { value: 'flask', labelKey: 'wsIconLab' },
  { value: 'activity', labelKey: 'wsIconHistory' },
  { value: 'mail', labelKey: 'wsIconLetter' },
  { value: 'pill', labelKey: 'wsIconMedication' },
  { value: 'message-square', labelKey: 'wsIconMessage' },
]

interface WorkspaceSectionProps {
  workspace: ReturnType<typeof useWorkspaceSettings>
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink"
    />
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-y rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-ink"
    />
  )
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

function ChecklistItemsEditor({
  items,
  language,
  onChange,
}: {
  items: WorkspaceChecklistItem[]
  language: UiLanguage
  onChange: (items: WorkspaceChecklistItem[]) => void
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-surface/80 p-2">
      <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
        {translateSettingsWorkspaceUi(language, 'wsChecklistItems')}
      </p>
      {items.map((item, index) => (
        <div key={item.id} className="space-y-1.5 border-t border-border/50 pt-2 first:border-t-0 first:pt-0">
          <TextInput
            value={item.label}
            placeholder={translateSettingsWorkspaceUi(language, 'wsCheckboxLabelPlaceholder')}
            onChange={(value) =>
              onChange(
                items.map((current, currentIndex) =>
                  currentIndex === index ? { ...current, label: value } : current,
                ),
              )
            }
          />
          <TextInput
            value={item.text}
            placeholder={translateSettingsWorkspaceUi(language, 'wsInsertedFindingPlaceholder')}
            onChange={(value) =>
              onChange(
                items.map((current, currentIndex) =>
                  currentIndex === index ? { ...current, text: value } : current,
                ),
              )
            }
          />
        </div>
      ))}
    </div>
  )
}

function SectionsEditor({
  sections,
  language,
  showChecklistItems = false,
  onUpdate,
  onRemove,
  onAdd,
}: {
  sections: WorkspaceSectionTemplate[]
  language: UiLanguage
  showChecklistItems?: boolean
  onUpdate: (sectionId: string, patch: Partial<WorkspaceSectionTemplate>) => void
  onRemove: (sectionId: string) => void
  onAdd: () => void
}) {
  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div
          key={section.id}
          className="flex flex-col gap-2 rounded-sm border-2 border-border bg-surface-hover/40 p-2 sm:flex-row sm:items-start"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <TextInput
              value={section.label}
              placeholder={translateSettingsWorkspaceUi(language, 'wsSectionNamePlaceholder')}
              onChange={(value) => onUpdate(section.id, { label: value })}
            />
            <TextInput
              value={section.description ?? ''}
              placeholder={translateSettingsWorkspaceUi(language, 'wsShortInfoPlaceholder')}
              onChange={(value) =>
                onUpdate(section.id, { description: value.trim() || undefined })
              }
            />
            {!showChecklistItems ? (
              <TextArea
                value={section.prefilledText ?? ''}
                placeholder={translateSettingsWorkspaceUi(language, 'wsSectionTemplatePlaceholder')}
                rows={4}
                onChange={(value) =>
                  onUpdate(section.id, { prefilledText: value.trim() || undefined })
                }
              />
            ) : null}
            {showChecklistItems && section.checklistItems?.length ? (
              <ChecklistItemsEditor
                items={section.checklistItems}
                language={language}
                onChange={(items) => onUpdate(section.id, { checklistItems: items })}
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRemove(section.id)}
            disabled={sections.length <= 1}
            aria-label={translateSettingsWorkspaceUi(language, 'wsRemoveSection')}
            title={translateSettingsWorkspaceUi(language, 'wsRemoveSection')}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-border text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border px-3 py-1.5 text-xs text-ink transition-colors hover:bg-surface-hover"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        {translateSettingsWorkspaceUi(language, 'wsAddSection')}
      </button>
    </div>
  )
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
          const secondToolLine = component.toolLabelLines?.[1] ?? ''
          const hasVariants = Boolean(component.variants?.length)
          const isLocked = workspace.isDefaultComponent(component.id)

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
                    {isLocked ? displayComponent.label : component.label}
                    {isLocked ? (
                      <span className="ml-2 rounded-sm bg-surface-hover px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                        {translateSettingsWorkspaceUi(language, 'wsStandardBadge')}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {getComponentSummary(isLocked ? displayComponent : component, language)}
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
                  {isLocked ? (
                    <p className="rounded-sm border border-border/70 bg-surface-hover/40 px-3 py-2 text-xs text-muted">
                      {translateSettingsWorkspaceUi(language, 'wsDefaultComponentNote')}
                    </p>
                  ) : null}

                  {!isLocked ? (
                  <>
                  <SettingsField label={translateSettingsWorkspaceUi(language, 'wsFieldHeading')}>
                    <TextInput
                      value={component.label}
                      onChange={(value) => workspace.setComponentLabel(component.id, value)}
                    />
                  </SettingsField>

                  <SettingsField label={translateSettingsWorkspaceUi(language, 'wsFieldSecondLine')}>
                    <TextInput
                      value={secondToolLine}
                      placeholder={translateSettingsWorkspaceUi(language, 'wsSecondLinePlaceholder')}
                      onChange={(value) =>
                        workspace.setComponentToolSecondLine(component.id, value)
                      }
                    />
                  </SettingsField>

                  <SettingsField label={translateSettingsWorkspaceUi(language, 'wsFieldIcon')}>
                    <select
                      value={component.icon}
                      onChange={(event) =>
                        workspace.setComponentIcon(
                          component.id,
                          event.target.value as WorkspaceComponentIcon,
                        )
                      }
                      className="w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                    >
                      {iconOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {translateSettingsWorkspaceUi(language, option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </SettingsField>

                  {hasVariants ? (
                    <SettingsField label={translateSettingsWorkspaceUi(language, 'wsFieldDocForms')}>
                      <div className="space-y-3">
                        {component.variants?.map((variant) => {
                          const protectedVariantIds =
                            component.id === 'psychopath'
                              ? ['free', 'checklist']
                              : component.id === 'verlauf'
                                ? ['short', 'broad']
                                : []
                          const canRemoveVariant =
                            (component.variants?.length ?? 0) > 1 &&
                            !protectedVariantIds.includes(variant.id)

                          return (
                          <div
                            key={variant.id}
                            className="rounded-sm border-2 border-border bg-surface-hover/30 p-3"
                          >
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                                {variant.mode === 'free'
                                  ? translateSettingsWorkspaceUi(language, 'wsModeFreeText')
                                  : variant.mode === 'checklist'
                                    ? translateSettingsWorkspaceUi(language, 'wsModeAmdpChecklist')
                                    : variant.mode === 'sections'
                                      ? translateSettingsWorkspaceUi(language, 'wsSections')
                                      : translateSettingsWorkspaceUi(language, 'wsModeForm')}
                              </p>
                              <TextInput
                                value={variant.label}
                                placeholder={translateSettingsWorkspaceUi(language, 'wsFormLabelPlaceholder')}
                                onChange={(value) =>
                                  workspace.updateVariant(component.id, variant.id, {
                                    label: value,
                                  })
                                }
                              />
                              </div>

                              {canRemoveVariant ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    workspace.removeComponentVariant(component.id, variant.id)
                                  }
                                  aria-label={translateSettingsWorkspaceUi(language, 'wsRemoveForm')}
                                  title={translateSettingsWorkspaceUi(language, 'wsRemoveForm')}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-border text-ink transition-colors hover:bg-surface-hover"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                                </button>
                              ) : null}
                            </div>

                            {!variant.multistage ? (
                              <SettingsField label={translateSettingsWorkspaceUi(language, 'wsFieldTemplateText')}>
                                <TextArea
                                  value={variant.prefilledText ?? ''}
                                  placeholder={translateSettingsWorkspaceUi(language, 'wsVariantTemplatePlaceholder')}
                                  onChange={(value) =>
                                    workspace.updateVariant(component.id, variant.id, {
                                      prefilledText: value.trim() || undefined,
                                    })
                                  }
                                />
                              </SettingsField>
                            ) : (
                              <SettingsField
                                label={
                                  variant.mode === 'checklist'
                                    ? translateSettingsWorkspaceUi(language, 'wsFieldChecklistSections')
                                    : translateSettingsWorkspaceUi(language, 'wsSections')
                                }
                              >
                                <SectionsEditor
                                  sections={variant.sections}
                                  language={language}
                                  showChecklistItems={variant.mode === 'checklist'}
                                  onUpdate={(sectionId, patch) =>
                                    workspace.updateVariantSection(
                                      component.id,
                                      variant.id,
                                      sectionId,
                                      patch,
                                    )
                                  }
                                  onRemove={(sectionId) =>
                                    workspace.removeVariantSection(
                                      component.id,
                                      variant.id,
                                      sectionId,
                                    )
                                  }
                                  onAdd={() =>
                                    workspace.addVariantSection(component.id, variant.id)
                                  }
                                />
                              </SettingsField>
                            )}

                            <AiManagerSettings
                              ai={variant.ai}
                              onChange={(ai) =>
                                workspace.setVariantAi(component.id, variant.id, ai)
                              }
                            />
                          </div>
                          )
                        })}

                        {component.id === 'psychopath' ? (
                          <button
                            type="button"
                            onClick={() => workspace.addComponentVariant(component.id, 'sections')}
                            className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border px-3 py-1.5 text-xs text-ink transition-colors hover:bg-surface-hover"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                            {translateSettingsWorkspaceUi(language, 'wsAddSectionsForm')}
                          </button>
                        ) : null}
                      </div>
                    </SettingsField>
                  ) : (
                    <>
                      <SettingsField label={translateSettingsWorkspaceUi(language, 'wsFieldMultistage')}>
                        <label className="inline-flex items-center gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={component.multistage}
                            onChange={(event) =>
                              workspace.setComponentMultistage(
                                component.id,
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 rounded-sm border-2 border-border"
                          />
                          {translateSettingsWorkspaceUi(language, 'wsUseSections')}
                        </label>
                      </SettingsField>

                      {!component.multistage ? (
                        <SettingsField label={translateSettingsWorkspaceUi(language, 'wsFieldTemplateText')}>
                          <TextArea
                            value={component.prefilledText ?? ''}
                            placeholder={translateSettingsWorkspaceUi(language, 'wsComponentTemplatePlaceholder')}
                            onChange={(value) =>
                              workspace.setComponentPrefilledText(component.id, value)
                            }
                          />
                        </SettingsField>
                      ) : (
                        <SettingsField label={translateSettingsWorkspaceUi(language, 'wsSections')}>
                          <SectionsEditor
                            sections={component.sections}
                            language={language}
                            onUpdate={(sectionId, patch) =>
                              workspace.updateSection(component.id, sectionId, patch)
                            }
                            onRemove={(sectionId) =>
                              workspace.removeSection(component.id, sectionId)
                            }
                            onAdd={() => workspace.addSection(component.id)}
                          />
                        </SettingsField>
                      )}
                    </>
                  )}

                  {!hasVariants ? (
                    <AiManagerSettings
                      ai={component.ai}
                      onChange={(ai) => workspace.setComponentAi(component.id, ai)}
                    />
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => workspace.removeComponent(component.id)}
                      disabled={workspace.components.length <= 1}
                      className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border px-3 py-1.5 text-xs text-recording transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      {translateSettingsWorkspaceUi(language, 'wsRemoveComponent')}
                    </button>
                  </div>
                  </>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          workspace.addComponent(
            formatSettingsWorkspaceUi(language, 'wsNewComponentLabel', {
              index: workspace.components.length + 1,
            }),
          )
        }
        className="mt-4 inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-ink px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#2a2a2a]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        {translateSettingsWorkspaceUi(language, 'wsAddComponent')}
      </button>
    </div>
  )
}
