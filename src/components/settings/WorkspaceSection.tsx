import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type {
  WorkspaceChecklistItem,
  WorkspaceComponentTemplate,
  WorkspaceComponentIcon,
  WorkspaceSectionTemplate,
} from '../../types/workspaceSettings'
import { AiManagerSettings } from './AiManagerSettings'
import { SettingsField } from './SettingsField'

const iconOptions: Array<{ value: WorkspaceComponentIcon; label: string }> = [
  { value: 'clipboard', label: 'Klemmbrett' },
  { value: 'file-text', label: 'Dokument' },
  { value: 'brain', label: 'Gehirn' },
  { value: 'flask', label: 'Labor' },
  { value: 'activity', label: 'Verlauf' },
  { value: 'mail', label: 'Brief' },
  { value: 'pill', label: 'Medikation' },
  { value: 'message-square', label: 'Nachricht' },
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

function getComponentSummary(component: WorkspaceComponentTemplate): string {
  if (component.variants?.length) {
    return component.variants
      .map((variant) =>
        variant.multistage
          ? `${variant.label} (${variant.sections.length} Abschnitte)`
          : variant.label,
      )
      .join(' · ')
  }

  if (component.multistage) {
    return `${component.sections.length} Abschnitte`
  }

  return 'Einzelnes Dokument'
}

function ChecklistItemsEditor({
  items,
  onChange,
}: {
  items: WorkspaceChecklistItem[]
  onChange: (items: WorkspaceChecklistItem[]) => void
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-surface/80 p-2">
      <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Checklistenpunkte</p>
      {items.map((item, index) => (
        <div key={item.id} className="space-y-1.5 border-t border-border/50 pt-2 first:border-t-0 first:pt-0">
          <TextInput
            value={item.label}
            placeholder="Checkbox-Label"
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
            placeholder="Eingefügter Befundtext"
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
  showChecklistItems = false,
  onUpdate,
  onRemove,
  onAdd,
}: {
  sections: WorkspaceSectionTemplate[]
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
              placeholder="Abschnittsname"
              onChange={(value) => onUpdate(section.id, { label: value })}
            />
            <TextInput
              value={section.description ?? ''}
              placeholder="Kurzinfo (optional)"
              onChange={(value) =>
                onUpdate(section.id, { description: value.trim() || undefined })
              }
            />
            {!showChecklistItems ? (
              <TextArea
                value={section.prefilledText ?? ''}
                placeholder="Vorlagentext für diesen Abschnitt …"
                rows={4}
                onChange={(value) =>
                  onUpdate(section.id, { prefilledText: value.trim() || undefined })
                }
              />
            ) : null}
            {showChecklistItems && section.checklistItems?.length ? (
              <ChecklistItemsEditor
                items={section.checklistItems}
                onChange={(items) => onUpdate(section.id, { checklistItems: items })}
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRemove(section.id)}
            disabled={sections.length <= 1}
            aria-label="Abschnitt entfernen"
            title="Abschnitt entfernen"
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
        Abschnitt hinzufügen
      </button>
    </div>
  )
}

export function WorkspaceSection({ workspace }: WorkspaceSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    workspace.components[0]?.id ?? null,
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">Arbeitsbereich</h2>
          <p className="mt-1 text-sm text-muted">
            Komponenten und Abschnitte der unteren Werkzeugleiste anpassen.
          </p>
        </div>
        <button
          type="button"
          onClick={workspace.resetWorkspace}
          className="shrink-0 self-start rounded-sm border-2 border-border px-3 py-1.5 text-xs text-ink transition-colors hover:bg-surface-hover"
        >
          Zurücksetzen
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {workspace.components.map((component) => {
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
                    {component.label}
                    {isLocked ? (
                      <span className="ml-2 rounded-sm bg-surface-hover px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                        Standard
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted">{getComponentSummary(component)}</p>
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
                    <div className="rounded-sm border border-border/70 bg-surface-hover/40 px-3 py-3 text-sm text-muted">
                      <p className="font-medium text-ink">Standardkomponente</p>
                      <p className="mt-1 leading-relaxed">
                        Struktur, Abschnitte und KI-Schema sind fest vorgegeben. Bearbeitung ist
                        deaktiviert. Zusätzliche Komponenten können je nach Abonnement hinzugefügt
                        werden.
                      </p>
                      <p className="mt-2 text-xs">{getComponentSummary(component)}</p>
                    </div>
                  ) : null}

                  {!isLocked ? (
                  <>
                  <SettingsField
                    label="Überschrift"
                    description="Titel in der Kopfzeile des Arbeitsbereichs."
                  >
                    <TextInput
                      value={component.label}
                      onChange={(value) => workspace.setComponentLabel(component.id, value)}
                    />
                  </SettingsField>

                  <SettingsField
                    label="Zweite Zeile"
                    description="Optional für zweizeilige Tool-Box-Beschriftung."
                  >
                    <TextInput
                      value={secondToolLine}
                      placeholder="z. B. pathologie"
                      onChange={(value) =>
                        workspace.setComponentToolSecondLine(component.id, value)
                      }
                    />
                  </SettingsField>

                  <SettingsField label="Symbol">
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
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </SettingsField>

                  {hasVariants ? (
                    <SettingsField
                      label="Dokumentationsformen"
                      description="Unterschiedliche Formen derselben Komponente, z. B. Kurznotiz und Breiter Verlauf."
                    >
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
                                  ? 'Freitext'
                                  : variant.mode === 'checklist'
                                    ? 'AMDP-Checkliste'
                                    : variant.mode === 'sections'
                                      ? 'Abschnitte'
                                      : 'Form'}
                              </p>
                              <TextInput
                                value={variant.label}
                                placeholder="Formbezeichnung"
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
                                  aria-label="Form entfernen"
                                  title="Form entfernen"
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-border text-ink transition-colors hover:bg-surface-hover"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                                </button>
                              ) : null}
                            </div>

                            {!variant.multistage ? (
                              <SettingsField
                                label="Vorlagentext"
                                description="Wird beim Öffnen dieser Form eingefügt, wenn der Arbeitsbereich leer ist."
                              >
                                <TextArea
                                  value={variant.prefilledText ?? ''}
                                  placeholder="z. B. Visite / Kurzkontakt …"
                                  onChange={(value) =>
                                    workspace.updateVariant(component.id, variant.id, {
                                      prefilledText: value.trim() || undefined,
                                    })
                                  }
                                />
                              </SettingsField>
                            ) : (
                              <SettingsField
                                label={variant.mode === 'checklist' ? 'Checklisten-Abschnitte' : 'Abschnitte'}
                                description={
                                  variant.mode === 'checklist'
                                    ? 'Bereiche mit anklickbaren Befundoptionen.'
                                    : 'Einzelne Bereiche für diese Dokumentationsform.'
                                }
                              >
                                <SectionsEditor
                                  sections={variant.sections}
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
                            Abschnitte-Form hinzufügen
                          </button>
                        ) : null}
                      </div>
                    </SettingsField>
                  ) : (
                    <>
                      <SettingsField
                        label="Mehrstufig"
                        description="Zeigt Abschnitte in der linken Spalte des Arbeitsbereichs."
                      >
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
                          Abschnitte verwenden
                        </label>
                      </SettingsField>

                      {!component.multistage ? (
                        <SettingsField
                          label="Vorlagentext"
                          description="Wird beim Öffnen der Komponente eingefügt, wenn der Arbeitsbereich leer ist."
                        >
                          <TextArea
                            value={component.prefilledText ?? ''}
                            placeholder="z. B. unauffälliger neurologischer Befund …"
                            onChange={(value) =>
                              workspace.setComponentPrefilledText(component.id, value)
                            }
                          />
                        </SettingsField>
                      ) : (
                        <SettingsField
                          label="Abschnitte"
                          description="Einzelne Bereiche für dieses Dokument. Vorlagentexte füllen leere Abschnitte automatisch."
                        >
                          <SectionsEditor
                            sections={component.sections}
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
                      Komponente entfernen
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
        onClick={workspace.addComponent}
        className="mt-4 inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-ink px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#2a2a2a]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        Komponente hinzufügen
      </button>
    </div>
  )
}
