import { componentTranslations } from '../data/componentTranslations'
import type { UiLanguage } from '../types/settings'
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
): WorkspaceComponentTemplate {
  const translation = componentTranslations[component.id]
  if (!translation) return component

  const label =
    component.label === translation.label.de ? translation.label[language] : component.label

  const railHeading =
    translation.railHeading &&
    (component.railHeading ?? component.label) === translation.railHeading.de
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

  return {
    ...component,
    label,
    railHeading,
    toolLabelLines,
    sections,
    variants,
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
): WorkspaceComponentTemplate[] {
  return components.map((component) => localizeWorkspaceComponent(component, language))
}
