import type { DocumentSection } from '../types'
import { getInitialEditorContent } from './workspaceComponents'

export function isDocumentEmpty(
  showMultistageSections: boolean,
  editorContent: string,
  sectionContents: Record<string, string>,
  sections: DocumentSection[],
): boolean {
  if (showMultistageSections) {
    return sections.every((section) => {
      const content = getInitialEditorContent(
        sectionContents[section.id],
        section.prefilledText,
      )
      return !content.trim()
    })
  }

  return !editorContent.trim()
}
