import { type ReactNode } from 'react'
import { parseInlineMarkdown, type InlineMarkdownSegment } from './inlineMarkdown'

function renderSegments(segments: InlineMarkdownSegment[], keyPrefix: string): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`
    switch (segment.type) {
      case 'text':
        return segment.value
      case 'code':
        return <code key={key}>{segment.value}</code>
      case 'strong':
        return <strong key={key}>{renderSegments(segment.children, key)}</strong>
      case 'em':
        return <em key={key}>{renderSegments(segment.children, key)}</em>
    }
  })
}

interface ChatMarkdownTextProps {
  text: string
  className?: string
}

/** Safely render limited inline markdown in AI chat messages. */
export function ChatMarkdownText({ text, className }: ChatMarkdownTextProps) {
  const segments = parseInlineMarkdown(text)
  return <span className={className}>{renderSegments(segments, 'chat-md')}</span>
}
