import type { DocumentSection } from '../types'
import type { WorkspaceSectionTemplate } from '../types/workspaceSettings'
import { compileChecklistText } from '../utils/checklist'
import { defaultPsychopathSections } from './psychopathSections'

export const psychopathNormalBefundHeading =
  'Psychopathologischer Befund – AMDP-Checkliste'

function resolveSectionsWithChecklist(
  sections?: Array<Pick<DocumentSection, 'id' | 'label' | 'checklistItems'>>,
): WorkspaceSectionTemplate[] {
  if (!sections?.length) return defaultPsychopathSections

  const resolved: WorkspaceSectionTemplate[] = []

  for (const section of sections) {
    const defaultSection = defaultPsychopathSections.find((item) => item.id === section.id)
    const checklistItems =
      section.checklistItems?.length
        ? section.checklistItems
        : defaultSection?.checklistItems

    if (!checklistItems?.length) continue

    resolved.push({
      id: section.id,
      label: section.label,
      checklistItems,
    })
  }

  return resolved.length > 0 ? resolved : defaultPsychopathSections
}

export function buildPsychopathNormalChecklistSelections(
  sections?: Array<Pick<DocumentSection, 'id' | 'label' | 'checklistItems'>>,
): Record<string, Record<string, boolean>> {
  const resolvedSections = resolveSectionsWithChecklist(sections)
  const result: Record<string, Record<string, boolean>> = {}

  for (const section of resolvedSections) {
    const selections: Record<string, boolean> = {}

    for (const item of section.checklistItems ?? []) {
      if (item.normal) {
        selections[item.id] = true
      }
    }

    result[section.id] = selections
  }

  return result
}

export function compilePsychopathNormalSectionTexts(
  sections?: Array<Pick<DocumentSection, 'id' | 'label' | 'checklistItems'>>,
): Record<string, string> {
  const resolvedSections = resolveSectionsWithChecklist(sections)
  const selections = buildPsychopathNormalChecklistSelections(sections)
  const result: Record<string, string> = {}

  for (const section of resolvedSections) {
    const sectionSelections = selections[section.id] ?? {}
    const text = compileChecklistText(
      section.checklistItems ?? [],
      sectionSelections,
      section.label,
    )

    if (text.trim()) {
      result[section.id] = text
    }
  }

  return result
}

export function buildPsychopathNormalBefundText(
  sections?: Array<Pick<DocumentSection, 'id' | 'label' | 'checklistItems'>>,
): string {
  const blocks = Object.values(compilePsychopathNormalSectionTexts(sections))

  return [psychopathNormalBefundHeading, '', ...blocks].join('\n').trim()
}

export function buildPsychopathNormalSectionTexts(
  sections?: Array<Pick<DocumentSection, 'id' | 'label' | 'checklistItems'>>,
): Record<string, string> {
  return compilePsychopathNormalSectionTexts(sections)
}
