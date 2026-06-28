import { componentTranslations } from '../data/componentTranslations'
import {
  getPsychopathChecklistVariantLabel,
  getPsychopathDocumentTitle,
  getPsychopathRailHeading,
  getPsychopathToolLabelLines,
} from '../data/psychopathTitles'
import type { EnglishVariant, UiLanguage } from '../types/settings'
import type {
  WorkspaceComponentTemplate,
  WorkspaceComponentVariant,
  WorkspaceSectionTemplate,
} from '../types/workspaceSettings'

function linesMatch(left: string[] | undefined, right: string[] | undefined): boolean {
  if (!left && !right) return true
  if (!left || !right || left.length !== right.length) return false
  return left.every((line, index) => line === right[index])
}

function matchesStoredGermanLabel(stored: string, canonicalDe: string, legacyDe?: string[]): boolean {
  return stored === canonicalDe || (legacyDe?.includes(stored) ?? false)
}

function localizeSection(
  componentId: string,
  section: WorkspaceSectionTemplate,
  language: UiLanguage,
): WorkspaceSectionTemplate {
  const sectionTranslation = componentTranslations[componentId]?.sections?.[section.id]
  if (!sectionTranslation) return section

  const label =
    section.label === sectionTranslation.label.de
      ? sectionTranslation.label[language]
      : section.label

  return { ...section, label }
}

export function localizeWorkspaceComponent(
  component: WorkspaceComponentTemplate,
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): WorkspaceComponentTemplate {
  const translation = componentTranslations[component.id]
  if (!translation) return component

  const label = matchesStoredGermanLabel(
    component.label,
    translation.label.de,
    translation.legacyLabelDe,
  )
    ? translation.label[language]
    : component.label

  const railHeadingSource = component.railHeading ?? component.label
  const railHeading =
    translation.railHeading &&
    matchesStoredGermanLabel(
      railHeadingSource,
      translation.railHeading.de,
      translation.legacyRailHeadingDe,
    )
      ? translation.railHeading[language]
      : component.railHeading

  const defaultToolLines = translation.toolLabelLines?.de
  const toolLabelLines =
    translation.toolLabelLines && linesMatch(component.toolLabelLines, defaultToolLines)
      ? translation.toolLabelLines[language]
      : component.toolLabelLines

  const sections = component.sections.map((section) =>
    localizeSection(component.id, section, language),
  )

  const variants = component.variants?.map((variant) =>
    localizeVariant(component.id, variant, language),
  )

  const localized = {
    ...component,
    label,
    railHeading,
    toolLabelLines,
    sections,
    variants,
  }

  return applyPsychopathTitleOverrides(localized, language, englishVariant)
}

function applyPsychopathTitleOverrides(
  component: WorkspaceComponentTemplate,
  language: UiLanguage,
  englishVariant: EnglishVariant,
): WorkspaceComponentTemplate {
  if (component.id !== 'psychopath') return component

  return {
    ...component,
    label: getPsychopathDocumentTitle(language, englishVariant),
    toolLabelLines: [...getPsychopathToolLabelLines(language, englishVariant)],
    variants: component.variants?.map((variant) => {
      if (variant.id !== 'checklist') return variant
      return {
        ...variant,
        label: getPsychopathChecklistVariantLabel(language),
        railHeading: getPsychopathRailHeading(language, englishVariant),
      }
    }),
  }
}

function localizeVariant(
  componentId: string,
  variant: WorkspaceComponentVariant,
  language: UiLanguage,
): WorkspaceComponentVariant {
  const variantTranslation = componentTranslations[componentId]?.variants?.[variant.id]
  if (!variantTranslation) {
    return {
      ...variant,
      sections: variant.sections.map((section) =>
        localizeSection(componentId, section, language),
      ),
    }
  }

  const label =
    variant.label === variantTranslation.label.de
      ? variantTranslation.label[language]
      : variant.label

  const railHeading =
    variantTranslation.railHeading &&
    (variant.railHeading ?? variant.label) === variantTranslation.railHeading.de
      ? variantTranslation.railHeading[language]
      : variant.railHeading

  return {
    ...variant,
    label,
    railHeading,
    sections: variant.sections.map((section) => localizeSection(componentId, section, language)),
  }
}

export function localizeWorkspaceComponents(
  components: WorkspaceComponentTemplate[],
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): WorkspaceComponentTemplate[] {
  return components.map((component) =>
    localizeWorkspaceComponent(component, language, englishVariant),
  )
}
