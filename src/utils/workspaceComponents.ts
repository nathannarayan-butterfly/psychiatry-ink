import type { DocumentSection, DocumentType } from '../types'
import type {
  WorkspaceComponentTemplate,
  WorkspaceComponentVariant,
  WorkspaceSectionTemplate,
} from '../types/workspaceSettings'

function mapSectionTemplates(sections: WorkspaceSectionTemplate[]): DocumentSection[] {
  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    description: section.description,
    exampleHint: section.exampleHint,
    prefilledText: section.prefilledText,
    checklistItems: section.checklistItems?.map((item) => ({ ...item })),
    ai: section.ai,
    status: 'empty' as const,
  }))
}

function inferVariantMode(variant: WorkspaceComponentVariant) {
  if (variant.mode) return variant.mode
  if (!variant.multistage) return 'free' as const
  if (variant.sections.some((section) => section.checklistItems?.length)) return 'checklist' as const
  return 'sections' as const
}

function mapVariant(variant: WorkspaceComponentVariant) {
  const mode = inferVariantMode(variant)

  return {
    id: variant.id,
    label: variant.label,
    railHeading: variant.railHeading,
    mode,
    multistage: variant.multistage,
    prefilledText: variant.multistage ? undefined : variant.prefilledText,
    sections: variant.multistage ? mapSectionTemplates(variant.sections) : [],
    ai: variant.ai,
  }
}

export function resolveDocumentTypeWithVariant(
  documentType: DocumentType,
  variantId?: string,
): DocumentType {
  if (!documentType.variants?.length) return documentType

  const resolvedVariantId =
    variantId ?? documentType.defaultVariantId ?? documentType.variants[0]?.id
  const variant = documentType.variants.find((item) => item.id === resolvedVariantId)
  if (!variant) return documentType

  return {
    ...documentType,
    railHeading: variant.railHeading ?? documentType.railHeading ?? documentType.label,
    mode: variant.mode,
    multistage: variant.multistage,
    prefilledText: variant.prefilledText,
    sections: variant.multistage ? variant.sections : undefined,
  }
}

export function slugifyId(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9äöüß]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'abschnitt'
  )
}

export function createUniqueId(base: string, existingIds: string[]): string {
  const normalized = slugifyId(base)
  if (!existingIds.includes(normalized)) return normalized

  let index = 2
  while (existingIds.includes(`${normalized}-${index}`)) {
    index += 1
  }

  return `${normalized}-${index}`
}

export function getInitialEditorContent(
  savedContent: string | undefined,
  prefilledText: string | undefined,
): string {
  if (savedContent?.trim()) return savedContent
  return prefilledText ?? ''
}

export function toDocumentTypes(components: WorkspaceComponentTemplate[]): DocumentType[] {
  return components.map((component) => ({
    id: component.id,
    label: component.label,
    toolLabelLines: component.toolLabelLines,
    railHeading: component.railHeading ?? component.label,
    icon: component.icon,
    multistage: component.multistage,
    prefilledText: component.multistage ? undefined : component.prefilledText,
    sections: component.multistage ? mapSectionTemplates(component.sections) : undefined,
    defaultVariantId: component.defaultVariantId,
    variants: component.variants?.map(mapVariant),
    ai: component.ai,
  }))
}

export function mergeSectionStatuses(
  templates: WorkspaceSectionTemplate[],
  currentSections: DocumentSection[],
  activeSectionId: string | null,
): DocumentSection[] {
  const statusById = new Map(currentSections.map((section) => [section.id, section.status]))
  const hasActive = templates.some((section) => section.id === activeSectionId)

  return templates.map((section, index) => {
    const previousStatus = statusById.get(section.id)
    let status: DocumentSection['status'] = previousStatus ?? 'empty'

    if (!hasActive && index === 0) {
      status = 'active'
    } else if (section.id === activeSectionId && status === 'empty') {
      status = 'active'
    } else if (section.id !== activeSectionId && status === 'active') {
      status = 'draft'
    }

    return {
      id: section.id,
      label: section.label,
      description: section.description,
      exampleHint: section.exampleHint,
      prefilledText: section.prefilledText,
      checklistItems: section.checklistItems?.map((item) => ({ ...item })),
      ai: section.ai,
      status,
    }
  })
}

export function cloneWorkspaceComponents(
  components: WorkspaceComponentTemplate[],
): WorkspaceComponentTemplate[] {
  return components.map((component) => ({
    ...component,
    toolLabelLines: component.toolLabelLines ? [...component.toolLabelLines] : undefined,
    ai: component.ai,
    sections: component.sections.map((section) => ({ ...section, ai: section.ai })),
    variants: component.variants?.map((variant) => ({
      ...variant,
      ai: variant.ai,
      sections: variant.sections.map((section) => ({
        ...section,
        ai: section.ai,
        checklistItems: section.checklistItems?.map((item) => ({ ...item })),
      })),
    })),
  }))
}
