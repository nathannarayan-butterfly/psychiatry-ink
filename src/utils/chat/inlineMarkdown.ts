export type InlineMarkdownSegment =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: InlineMarkdownSegment[] }
  | { type: 'em'; children: InlineMarkdownSegment[] }
  | { type: 'code'; value: string }

function findDelimiter(text: string, start: number, delimiter: string): number {
  return text.indexOf(delimiter, start)
}

function findSingleStarClose(text: string, start: number): number {
  let index = start
  while (index < text.length) {
    if (text[index] !== '*') {
      index += 1
      continue
    }
    if (text[index + 1] === '*') {
      index += 2
      continue
    }
    return index
  }
  return -1
}

/** Parse limited inline markdown: **bold**, *italic*, `code`. */
export function parseInlineMarkdown(text: string): InlineMarkdownSegment[] {
  const segments: InlineMarkdownSegment[] = []
  let index = 0

  while (index < text.length) {
    if (text[index] === '*' && text[index + 1] === '*') {
      const close = findDelimiter(text, index + 2, '**')
      if (close !== -1) {
        segments.push({
          type: 'strong',
          children: parseInlineMarkdown(text.slice(index + 2, close)),
        })
        index = close + 2
        continue
      }
    }

    if (text[index] === '`') {
      const close = text.indexOf('`', index + 1)
      if (close !== -1) {
        segments.push({ type: 'code', value: text.slice(index + 1, close) })
        index = close + 1
        continue
      }
    }

    if (text[index] === '*' && text[index + 1] !== '*') {
      const close = findSingleStarClose(text, index + 1)
      if (close !== -1) {
        segments.push({
          type: 'em',
          children: parseInlineMarkdown(text.slice(index + 1, close)),
        })
        index = close + 1
        continue
      }
    }

    let next = index + 1
    while (next < text.length && text[next] !== '*' && text[next] !== '`') {
      next += 1
    }
    segments.push({ type: 'text', value: text.slice(index, next) })
    index = next
  }

  return segments
}
