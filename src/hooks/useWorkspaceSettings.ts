import { useCallback, useEffect, useState } from 'react'
import { cloneAufnahmeSections } from '../data/aufnahmeSections'
import {
  aufnahmeanlassSectionAi,
  cloneAiConfig,
  createNewComponentAiConfig,
} from '../data/aiManagerPresets'
import { defaultWorkspaceComponents } from '../data/defaultWorkspaceComponents'
import { safeSetItem } from '../utils/safeStorage'
import {
  clonePsychopathSections,
  isLegacyPsychopathChecklistSections,
} from '../data/psychopathSections'
import {
  cloneVerlaufBroadSections,
  isLegacyVerlaufBroadSections,
} from '../data/verlaufSections'
import type {
  WorkspaceComponentIcon,
  WorkspaceComponentTemplate,
  WorkspaceComponentVariant,
  WorkspaceSettings,
  WorkspaceVariantMode,
} from '../types/workspaceSettings'
import { isDefaultComponent } from '../utils/defaultComponents'
import { cloneWorkspaceComponents, createUniqueId } from '../utils/workspaceComponents'

const STORAGE_KEY = 'psychiatry-ink-workspace'

const PROTECTED_VARIANT_IDS: Record<string, string[]> = {
  psychopath: ['free', 'checklist'],
  verlauf: ['short', 'broad'],
}

function stripDefaultPsychopathSectionsVariant(
  component: WorkspaceComponentTemplate,
): WorkspaceComponentTemplate {
  if (!component.variants?.length) return component

  const variants = component.variants.filter((variant) => variant.id !== 'sections')
  const defaultVariantId =
    component.defaultVariantId === 'sections' ? 'free' : (component.defaultVariantId ?? 'free')

  return {
    ...component,
    defaultVariantId,
    variants: variants.length > 0 ? variants : component.variants,
  }
}

function buildPsychopathSectionsVariantSections(): WorkspaceComponentTemplate['sections'] {
  return clonePsychopathSections().map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    prefilledText: section.prefilledText,
  }))
}

function migrateComponents(
  components: WorkspaceComponentTemplate[],
): WorkspaceComponentTemplate[] {
  const migrated = components.map((component) => {
    if (component.id === 'psychopath') {
      const defaultPsychopath =
        defaultWorkspaceComponents.find((item) => item.id === 'psychopath') ?? null
      const normalized = {
        ...component,
        label:
          component.label === 'Psycho-pathologie'
            ? 'Psychopathologischer Befund'
            : component.label,
        toolLabelLines: component.toolLabelLines?.length
          ? component.toolLabelLines
          : ['Psycho-', 'pathologie'],
        multistage: false,
        sections: [],
        railHeading: undefined,
      }

      if (!normalized.variants?.length) {
        return stripDefaultPsychopathSectionsVariant({
          ...normalized,
          defaultVariantId: defaultPsychopath?.defaultVariantId ?? 'free',
          variants: defaultPsychopath?.variants
            ? defaultPsychopath.variants.map((variant) => ({
                ...variant,
                sections:
                  variant.id === 'free'
                    ? []
                    : clonePsychopathSections(),
              }))
            : [],
        })
      }

      return stripDefaultPsychopathSectionsVariant({
        ...normalized,
        defaultVariantId: normalized.defaultVariantId ?? 'free',
        variants: normalized.variants.map((variant) => ({
          ...variant,
          mode: (variant.mode ??
            (!variant.multistage
              ? 'free'
              : variant.sections.some((section) => section.checklistItems?.length)
                ? 'checklist'
                : 'sections')) as WorkspaceVariantMode,
          sections:
            (variant.id === 'checklist' || variant.mode === 'checklist') &&
            (isLegacyPsychopathChecklistSections(variant.sections) ||
              !variant.sections.some((section) => section.checklistItems?.length))
              ? clonePsychopathSections()
              : (variant.id === 'sections' || variant.mode === 'sections') &&
                  (isLegacyPsychopathChecklistSections(variant.sections) ||
                    variant.sections.length === 0)
                ? clonePsychopathSections().map((section) => ({
                    ...section,
                    checklistItems: undefined,
                  }))
                : variant.sections.map((section) => ({
                    ...section,
                    checklistItems: section.checklistItems?.map((item) => ({ ...item })),
                  })),
        })),
      })
    }

    if (component.id === 'aufnahme' && (!component.multistage || component.sections.length === 0)) {
      const defaultAufnahme =
        defaultWorkspaceComponents.find((item) => item.id === 'aufnahme') ?? null
      return {
        ...component,
        multistage: true,
        railHeading: component.railHeading ?? 'Aufnahme',
        sections: cloneAufnahmeSections(),
        ai: component.ai ?? defaultAufnahme?.ai,
      }
    }

    if (component.id === 'verlauf' && component.variants?.length) {
      const broadVariant = component.variants.find((variant) => variant.id === 'broad')
      const shortVariant = component.variants.find((variant) => variant.id === 'short')
      const needsBroadMigration =
        broadVariant && isLegacyVerlaufBroadSections(broadVariant.sections)
      // Always clear any prefilledText/sections accidentally stored on the short variant
      const shortHasStaleData = shortVariant && (shortVariant.prefilledText || shortVariant.sections.length > 0 || shortVariant.multistage)
      if (needsBroadMigration || shortHasStaleData) {
        return {
          ...component,
          variants: component.variants.map((variant) => {
            if (variant.id === 'broad' && needsBroadMigration) {
              return { ...variant, sections: cloneVerlaufBroadSections() }
            }
            if (variant.id === 'short') {
              return { ...variant, prefilledText: undefined, multistage: false, sections: [] }
            }
            return variant
          }),
        }
      }
    }

    if (component.id === 'therapie-verlauf') {
      const defaultTherapieVerlauf =
        defaultWorkspaceComponents.find((item) => item.id === 'therapie-verlauf') ?? null
      return {
        ...component,
        multistage: false,
        prefilledText: component.prefilledText ?? '',
        sections: [],
        railHeading: component.railHeading ?? 'Arztbrief',
        ai: component.ai ?? defaultTherapieVerlauf?.ai,
      }
    }

    if (component.id === 'medikation' || component.id === 'therapieplanung') {
      const defaultComponent =
        defaultWorkspaceComponents.find((item) => item.id === component.id) ?? null
      return {
        ...component,
        multistage: false,
        sections: [],
        railHeading: component.railHeading ?? defaultComponent?.railHeading,
        ai: component.ai ?? defaultComponent?.ai,
      }
    }

    if (component.id === 'verlauf' && !component.variants?.length) {
      const defaultVerlauf =
        defaultWorkspaceComponents.find((item) => item.id === 'verlauf') ?? null

      return {
        ...component,
        defaultVariantId: defaultVerlauf?.defaultVariantId ?? 'short',
        variants: defaultVerlauf?.variants
          ? defaultVerlauf.variants.map((variant) => ({
              ...variant,
              sections:
                variant.id === 'broad'
                  ? cloneVerlaufBroadSections()
                  : [...variant.sections],
            }))
          : [
              {
                id: 'short',
                label: 'Kurznotiz',
                mode: 'free' as const,
                multistage: false,
                sections: [],
              },
              {
                id: 'broad',
                label: 'Breiter Verlauf',
                railHeading: 'Verlauf',
                mode: 'sections' as const,
                multistage: true,
                sections: cloneVerlaufBroadSections(),
              },
            ],
      }
    }

    return component
  })

  const filtered = migrated.filter((component) => component.id !== 'labor')
  const existingIds = new Set(filtered.map((component) => component.id))
  const missing = defaultWorkspaceComponents.filter((component) => !existingIds.has(component.id))
  return applyAiPresets([
    ...filtered,
    ...missing.map((component) => ({
      ...component,
      sections: component.sections.map((section) => ({ ...section })),
      variants: component.variants?.map((variant) => ({
        ...variant,
        sections: variant.sections.map((section) => ({ ...section })),
      })),
    })),
  ])
}

function applyAiPresets(
  components: WorkspaceComponentTemplate[],
): WorkspaceComponentTemplate[] {
  const defaultsById = new Map(
    defaultWorkspaceComponents.map((component) => [component.id, component]),
  )

  return components.map((component) => {
    const defaultComponent = defaultsById.get(component.id)
    let next: WorkspaceComponentTemplate = {
      ...component,
      ai: component.ai ?? defaultComponent?.ai,
      sections: component.sections.map((section) => {
        if (section.id === 'aufnahmeanlass' && !section.ai) {
          return { ...section, ai: aufnahmeanlassSectionAi }
        }
        return section
      }),
    }

    if (next.variants?.length) {
      next = {
        ...next,
        variants: next.variants.map((variant) => {
          const defaultVariant = defaultComponent?.variants?.find(
            (item) => item.id === variant.id,
          )
          return {
            ...variant,
            ai: variant.ai ?? defaultVariant?.ai,
            sections: variant.sections.map((section) => {
              if (section.id === 'aufnahmeanlass' && !section.ai) {
                return { ...section, ai: aufnahmeanlassSectionAi }
              }
              return section
            }),
          }
        }),
      }
    }

    if (!next.ai && !defaultComponent) {
      next = { ...next, ai: createNewComponentAiConfig() }
    }

    return next
  })
}

function loadSettings(): WorkspaceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { components: cloneWorkspaceComponents(defaultWorkspaceComponents) }
    }

    const parsed = JSON.parse(raw) as WorkspaceSettings
    if (!Array.isArray(parsed.components) || parsed.components.length === 0) {
      return { components: cloneWorkspaceComponents(defaultWorkspaceComponents) }
    }

    return {
      components: migrateComponents(cloneWorkspaceComponents(parsed.components)),
    }
  } catch {
    return { components: cloneWorkspaceComponents(defaultWorkspaceComponents) }
  }
}

export function useWorkspaceSettings() {
  const [settings, setSettings] = useState<WorkspaceSettings>(loadSettings)

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const updateComponents = useCallback(
    (updater: (current: WorkspaceComponentTemplate[]) => WorkspaceComponentTemplate[]) => {
      setSettings((current) => ({
        components: updater(current.components),
      }))
    },
    [],
  )

  const updateComponent = useCallback(
    (componentId: string, patch: Partial<WorkspaceComponentTemplate>) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) =>
          component.id === componentId ? { ...component, ...patch } : component,
        ),
      )
    },
    [updateComponents],
  )

  const addComponent = useCallback(() => {
    updateComponents((components) => {
      const label = `Neue Komponente ${components.length + 1}`
      const id = createUniqueId(
        label,
        components.map((component) => component.id),
      )

      return [
        ...components,
        {
          id,
          label,
          icon: 'file-text',
          multistage: false,
          sections: [],
          ai: createNewComponentAiConfig(),
        },
      ]
    })
  }, [updateComponents])

  const removeComponent = useCallback(
    (componentId: string) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) => {
        if (components.length <= 1) return components
        return components.filter((component) => component.id !== componentId)
      })
    },
    [updateComponents],
  )

  const addSection = useCallback(
    (componentId: string) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId || !component.multistage) return component

          const label = `Abschnitt ${component.sections.length + 1}`
          const id = createUniqueId(
            label,
            component.sections.map((section) => section.id),
          )

          return {
            ...component,
            sections: [...component.sections, { id, label }],
          }
        }),
      )
    },
    [updateComponents],
  )

  const updateSection = useCallback(
    (
      componentId: string,
      sectionId: string,
      patch: Partial<WorkspaceComponentTemplate['sections'][number]>,
    ) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId) return component

          return {
            ...component,
            sections: component.sections.map((section) =>
              section.id === sectionId ? { ...section, ...patch } : section,
            ),
          }
        }),
      )
    },
    [updateComponents],
  )

  const removeSection = useCallback(
    (componentId: string, sectionId: string) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId) return component

          return {
            ...component,
            sections: component.sections.filter((section) => section.id !== sectionId),
          }
        }),
      )
    },
    [updateComponents],
  )

  const updateVariant = useCallback(
    (
      componentId: string,
      variantId: string,
      patch: Partial<WorkspaceComponentVariant>,
    ) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId || !component.variants?.length) return component

          return {
            ...component,
            variants: component.variants.map((variant) =>
              variant.id === variantId ? { ...variant, ...patch } : variant,
            ),
          }
        }),
      )
    },
    [updateComponents],
  )

  const addVariantSection = useCallback(
    (componentId: string, variantId: string) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId || !component.variants?.length) return component

          return {
            ...component,
            variants: component.variants.map((variant) => {
              if (variant.id !== variantId || !variant.multistage) return variant

              const label = `Abschnitt ${variant.sections.length + 1}`
              const id = createUniqueId(
                label,
                variant.sections.map((section) => section.id),
              )

              return {
                ...variant,
                sections: [...variant.sections, { id, label }],
              }
            }),
          }
        }),
      )
    },
    [updateComponents],
  )

  const updateVariantSection = useCallback(
    (
      componentId: string,
      variantId: string,
      sectionId: string,
      patch: Partial<WorkspaceComponentTemplate['sections'][number]>,
    ) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId || !component.variants?.length) return component

          return {
            ...component,
            variants: component.variants.map((variant) => {
              if (variant.id !== variantId) return variant

              return {
                ...variant,
                sections: variant.sections.map((section) =>
                  section.id === sectionId ? { ...section, ...patch } : section,
                ),
              }
            }),
          }
        }),
      )
    },
    [updateComponents],
  )

  const addComponentVariant = useCallback(
    (componentId: string, mode: WorkspaceVariantMode) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId) return component

          const existingIds = component.variants?.map((variant) => variant.id) ?? []
          const labelByMode: Record<WorkspaceVariantMode, string> = {
            free: 'Freitext',
            sections: 'Abschnitte',
            checklist: 'AMDP-Checkliste',
          }
          const label = labelByMode[mode]
          const id = createUniqueId(label, existingIds)

          let newVariant: WorkspaceComponentVariant

          if (mode === 'free') {
            newVariant = {
              id,
              label,
              mode: 'free',
              multistage: false,
              sections: [],
            }
          } else if (mode === 'sections') {
            newVariant = {
              id,
              label,
              mode: 'sections',
              railHeading: component.label,
              multistage: true,
              sections:
                component.id === 'psychopath'
                  ? buildPsychopathSectionsVariantSections()
                  : [{ id: createUniqueId('abschnitt', []), label: 'Abschnitt 1' }],
            }
          } else {
            newVariant = {
              id,
              label,
              mode: 'checklist',
              railHeading: component.label,
              multistage: true,
              sections:
                component.id === 'psychopath' ? clonePsychopathSections() : [],
            }
          }

          return {
            ...component,
            variants: [...(component.variants ?? []), newVariant],
          }
        }),
      )
    },
    [updateComponents],
  )

  const removeComponentVariant = useCallback(
    (componentId: string, variantId: string) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId || !component.variants?.length) return component

          const protectedIds = PROTECTED_VARIANT_IDS[componentId] ?? []
          if (protectedIds.includes(variantId)) return component
          if (component.variants.length <= 1) return component

          const variants = component.variants.filter((variant) => variant.id !== variantId)
          const defaultVariantId =
            component.defaultVariantId === variantId
              ? (variants[0]?.id ?? component.defaultVariantId)
              : component.defaultVariantId

          return {
            ...component,
            defaultVariantId,
            variants,
          }
        }),
      )
    },
    [updateComponents],
  )

  const removeVariantSection = useCallback(
    (componentId: string, variantId: string, sectionId: string) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId || !component.variants?.length) return component

          return {
            ...component,
            variants: component.variants.map((variant) => {
              if (variant.id !== variantId) return variant

              return {
                ...variant,
                sections: variant.sections.filter((section) => section.id !== sectionId),
              }
            }),
          }
        }),
      )
    },
    [updateComponents],
  )

  const setComponentMultistage = useCallback(
    (componentId: string, multistage: boolean) => {
      if (isDefaultComponent(componentId)) return
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId) return component

          if (!multistage) {
            return { ...component, multistage: false, sections: [] }
          }

          const sections =
            component.sections.length > 0
              ? component.sections
              : [{ id: createUniqueId('abschnitt', []), label: 'Abschnitt 1' }]

          return { ...component, multistage: true, sections }
        }),
      )
    },
    [updateComponents],
  )

  const setComponentIcon = useCallback(
    (componentId: string, icon: WorkspaceComponentIcon) => {
      updateComponent(componentId, { icon })
    },
    [updateComponent],
  )

  const setComponentLabel = useCallback(
    (componentId: string, label: string) => {
      updateComponent(componentId, { label })
    },
    [updateComponent],
  )

  const setComponentPrefilledText = useCallback(
    (componentId: string, prefilledText: string) => {
      updateComponent(componentId, {
        prefilledText: prefilledText.trim() || undefined,
      })
    },
    [updateComponent],
  )

  const setComponentToolSecondLine = useCallback(
    (componentId: string, secondLine: string) => {
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId) return component

          const trimmed = secondLine.trim()
          if (!trimmed) {
            return { ...component, toolLabelLines: undefined }
          }

          const firstLine =
            component.toolLabelLines?.[0] ??
            `${component.label.slice(0, Math.max(3, Math.ceil(component.label.length / 2)))}-`

          return {
            ...component,
            toolLabelLines: [firstLine, trimmed],
          }
        }),
      )
    },
    [updateComponents],
  )

  const resetWorkspace = useCallback(() => {
    setSettings({ components: cloneWorkspaceComponents(defaultWorkspaceComponents) })
  }, [])

  const setComponentAi = useCallback(
    (componentId: string, ai: WorkspaceComponentTemplate['ai']) => {
      if (!ai) return
      updateComponent(componentId, { ai: cloneAiConfig(ai) })
    },
    [updateComponent],
  )

  const setVariantAi = useCallback(
    (
      componentId: string,
      variantId: string,
      ai: NonNullable<WorkspaceComponentVariant['ai']>,
    ) => {
      updateComponents((components) =>
        components.map((component) => {
          if (component.id !== componentId || !component.variants) return component
          return {
            ...component,
            variants: component.variants.map((variant) =>
              variant.id === variantId
                ? { ...variant, ai: cloneAiConfig(ai) }
                : variant,
            ),
          }
        }),
      )
    },
    [updateComponents],
  )

  const setSectionAi = useCallback(
    (
      componentId: string,
      sectionId: string,
      ai: NonNullable<WorkspaceComponentTemplate['sections'][number]['ai']>,
    ) => {
      updateSection(componentId, sectionId, { ai: cloneAiConfig(ai) })
    },
    [updateSection],
  )

  return {
    components: settings.components,
    isDefaultComponent,
    addComponent,
    removeComponent,
    setComponentLabel,
    setComponentPrefilledText,
    setComponentToolSecondLine,
    setComponentIcon,
    setComponentMultistage,
    addSection,
    updateSection,
    removeSection,
    updateVariant,
    addComponentVariant,
    removeComponentVariant,
    addVariantSection,
    updateVariantSection,
    removeVariantSection,
    resetWorkspace,
    setComponentAi,
    setVariantAi,
    setSectionAi,
  }
}
