import { estimateTokensFromText } from './estimateCredits'
import type { AiGenerationChunk } from '../types/aiGeneration'

const DEFAULT_MAX_TOKENS = 3000

export function chunkTextByTokens(
  text: string,
  maxTokens = DEFAULT_MAX_TOKENS,
  labelPrefix = 'Chunk',
): AiGenerationChunk[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  if (estimateTokensFromText(trimmed) <= maxTokens) {
    return [{ id: 'chunk-0', label: labelPrefix, content: trimmed }]
  }

  const paragraphs = trimmed.split(/\n{2,}/).filter(Boolean)
  const chunks: AiGenerationChunk[] = []
  let current = ''
  let index = 0

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (estimateTokensFromText(candidate) > maxTokens && current) {
      chunks.push({
        id: `chunk-${index}`,
        label: `${labelPrefix} ${index + 1}`,
        content: current,
      })
      index += 1
      current = paragraph
      continue
    }
    current = candidate
  }

  if (current) {
    chunks.push({
      id: `chunk-${index}`,
      label: `${labelPrefix} ${index + 1}`,
      content: current,
    })
  }

  return chunks
}

export function chunkDocumentSections(
  sections: Array<{ sectionId: string; label: string; content: string }>,
  maxTokens = DEFAULT_MAX_TOKENS,
): AiGenerationChunk[] {
  const chunks: AiGenerationChunk[] = []

  for (const section of sections) {
    const content = section.content.trim()
    if (!content) continue

    const block = `${section.label}\n${content}`
    if (estimateTokensFromText(block) <= maxTokens) {
      chunks.push({
        id: section.sectionId,
        label: section.label,
        content: block,
        sectionId: section.sectionId,
      })
      continue
    }

    const subChunks = chunkTextByTokens(block, maxTokens, section.label)
    chunks.push(
      ...subChunks.map((chunk, index) => ({
        ...chunk,
        id: `${section.sectionId}-${index}`,
        sectionId: section.sectionId,
      })),
    )
  }

  return chunks
}
