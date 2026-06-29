import { useCallback, useEffect, useState } from 'react'
import { cloneAufnahmeSections } from '../data/aufnahmeSections'
import {
  aufnahmeanlassSectionAi,
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
  WorkspaceComponentTemplate,
  WorkspaceComponentVariant,
  WorkspaceSettings,
  WorkspaceVariantMode,
} from '../types/workspaceSettings'
import { isDefaultComponent } from '../utils/defaultComponents'
import { cloneWorkspaceComponents } from '../utils/workspaceComponents'

const STORAGE_KEY = 'psychiatry-ink-workspace'

function inferPsychopathVariantMode(variant: WorkspaceComponentVariant): WorkspaceVariantMode {
  if (variant.id === 'isdm') return 'isdm'
  if (variant.mode) return variant.mode
  if (!variant.multistage) return 'free'
  if (variant.sections.some((section) => section.checklistItems?.length)) return 'checklist'
  return 'sections'
}

function normalizePsychopathVariantSections(
  variant: WorkspaceComponentVariant,
): WorkspaceComponentVariant {
  const mode = inferPsychopathVariantMode(variant)

  return {
    ...variant,
    mode,
    sections:
      (variant.id === 'checklist' || mode === 'checklist') &&
      (isLegacyPsychopathChecklistSections(variant.sections) ||
        !variant.sections.some((section) => section.checklistItems?.length))
        ? clonePsychopathSections()
        : (variant.id === 'sections' || mode === 'sections') &&
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
  }
}

function mergeDefaultPsychopathVariants(
  variants: WorkspaceComponentVariant[],
  defaultPsychopath: WorkspaceComponentTemplate | null,
): WorkspaceComponentVariant[] {
  const existingIds = new Set(variants.map((variant) => variant.id))
  const merged = [
    ...variants,
    ...(defaultPsychopath?.variants ?? [])
      .filter((variant) => !existingIds.has(variant.id))
      .map((variant) => ({
        ...variant,
        sections:
          variant.id === 'free' || variant.id === 'isdm'
            ? []
            : clonePsychopathSections(),
      })),
  ]

  return merged.map(normalizePsychopathVariantSections)
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
          component.label === 'Psycho-pathologie' ||
          component.label === 'Psychopathologischer Befund, AMDP-orientiert'
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
          variants: mergeDefaultPsychopathVariants([], defaultPsychopath),
        })
      }

      return stripDefaultPsychopathSectionsVariant({
        ...normalized,
        defaultVariantId: normalized.defaultVariantId ?? 'free',
        variants: mergeDefaultPsychopathVariants(normalized.variants, defaultPsychopath),
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

  // Drop any non-default components: custom workspace-component authoring was
  // removed, so legacy/custom entries saved on real devices (incl. the retired
  // `labor` component) are filtered out and only the default set is kept.
  const filtered = migrated.filter((component) => isDefaultComponent(component.id))
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

  const resetWorkspace = useCallback(() => {
    setSettings({ components: cloneWorkspaceComponents(defaultWorkspaceComponents) })
  }, [])

  return {
    components: settings.components,
    isDefaultComponent,
    resetWorkspace,
  }
}
