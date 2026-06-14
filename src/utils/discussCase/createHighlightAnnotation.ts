import { addDiscussAnnotation } from '../../services/discussCaseApi'
import type { DiscussCaseAnnotation } from '../../types/discussCase'

export async function createHighlightAnnotation(
  discussionId: string,
  input: {
    sectionId: string
    startOffset: number
    endOffset: number
    highlightedText: string
    commentBody?: string
  },
  annotations: DiscussCaseAnnotation[],
  onAnnotationsChange: (annotations: DiscussCaseAnnotation[]) => void,
): Promise<void> {
  const annotation = await addDiscussAnnotation(discussionId, input)
  onAnnotationsChange([...annotations, annotation])
}
