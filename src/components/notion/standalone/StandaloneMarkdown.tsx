import { Fragment, type ReactNode } from 'react'
import { parseInlineMarkdown, type InlineMarkdownSegment } from '../../../utils/chat/inlineMarkdown'

interface StandaloneMarkdownProps {
  text: string
  className?: string
}

function renderInline(segments: InlineMarkdownSegment[], keyPrefix: string): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`
    switch (segment.type) {
      case 'strong':
        return <strong key={key}>{renderInline(segment.children, key)}</strong>
      case 'em':
        return <em key={key}>{renderInline(segment.children, key)}</em>
      case 'code':
        return <code key={key}>{segment.value}</code>
      default:
        return <Fragment key={key}>{segment.value}</Fragment>
    }
  })
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  return renderInline(parseInlineMarkdown(text), keyPrefix)
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/
// Bullets the AI commonly emits, incl. typographic ones (•, ·, ‣, ◦) so they
// render as a list instead of leaking the literal glyph into the prose.
const UL_RE = /^\s*[-*•·‣◦]\s+(.*)$/
const OL_RE = /^\s*\d+[.)]\s+(.*)$/

/**
 * Read-only renderer for the limited markdown the AI tools emit (paragraphs,
 * headings, unordered/ordered lists, plus inline **bold** / *italic* / `code`).
 * Used by `StandaloneResultPanel` when `renderMarkdown` is set (#11 lab
 * interpretation output), so `**bold**` etc. display formatted instead of raw.
 */
export function StandaloneMarkdown({ text, className }: StandaloneMarkdownProps) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let listItems: ReactNode[] = []
  let listOrdered = false
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const key = `p-${blocks.length}`
    blocks.push(
      <p key={key} className="swx-md__p">
        {inline(paragraph.join(' '), key)}
      </p>,
    )
    paragraph = []
  }

  const flushList = () => {
    if (listItems.length === 0) return
    const key = `list-${blocks.length}`
    const items = listItems
    blocks.push(
      listOrdered ? (
        <ol key={key} className="swx-md__list">
          {items}
        </ol>
      ) : (
        <ul key={key} className="swx-md__list">
          {items}
        </ul>
      ),
    )
    listItems = []
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd()

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      return
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      const level = Math.min(heading[1].length + 2, 6)
      const Tag = `h${level}` as 'h3' | 'h4' | 'h5' | 'h6'
      const key = `h-${blocks.length}`
      blocks.push(
        <Tag key={key} className="swx-md__heading">
          {inline(heading[2], key)}
        </Tag>,
      )
      return
    }

    const ol = OL_RE.exec(line)
    const ul = UL_RE.exec(line)
    if (ol || ul) {
      flushParagraph()
      const ordered = Boolean(ol)
      if (listItems.length > 0 && ordered !== listOrdered) flushList()
      listOrdered = ordered
      const content = (ol ? ol[1] : ul![1]) ?? ''
      const key = `li-${blocks.length}-${listItems.length}`
      listItems.push(<li key={key}>{inline(content, key)}</li>)
      return
    }

    flushList()
    paragraph.push(line.trim())
  })

  flushParagraph()
  flushList()

  return <div className={className}>{blocks}</div>
}
