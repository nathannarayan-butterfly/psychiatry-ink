import { describe, expect, it } from 'vitest'
import { parseInlineMarkdown } from '../inlineMarkdown'

function text(value: string) {
  return { type: 'text' as const, value }
}

describe('parseInlineMarkdown', () => {
  it('returns plain text unchanged', () => {
    expect(parseInlineMarkdown('Hello world')).toEqual([text('Hello world')])
  })

  it('parses bold markers', () => {
    expect(parseInlineMarkdown('**bold**')).toEqual([
      { type: 'strong', children: [text('bold')] },
    ])
  })

  it('parses italic markers', () => {
    expect(parseInlineMarkdown('*italic*')).toEqual([{ type: 'em', children: [text('italic')] }])
  })

  it('prefers bold over italic for **text**', () => {
    expect(parseInlineMarkdown('**not italic**')).toEqual([
      { type: 'strong', children: [text('not italic')] },
    ])
  })

  it('parses inline code', () => {
    expect(parseInlineMarkdown('Use `F32.1` here')).toEqual([
      text('Use '),
      { type: 'code', value: 'F32.1' },
      text(' here'),
    ])
  })

  it('supports mixed inline formatting', () => {
    expect(parseInlineMarkdown('**bold** and *italic* with `code`')).toEqual([
      { type: 'strong', children: [text('bold')] },
      text(' and '),
      { type: 'em', children: [text('italic')] },
      text(' with '),
      { type: 'code', value: 'code' },
    ])
  })

  it('supports nested bold inside italic', () => {
    expect(parseInlineMarkdown('*italic **bold** tail*')).toEqual([
      {
        type: 'em',
        children: [
          text('italic '),
          { type: 'strong', children: [text('bold')] },
          text(' tail'),
        ],
      },
    ])
  })

  it('leaves unmatched markers as literal text when no valid close exists', () => {
    expect(parseInlineMarkdown('*no close')).toEqual([text('*no close')])
    expect(parseInlineMarkdown('`no close')).toEqual([text('`no close')])
  })

  it('handles multilingual clinical content', () => {
    expect(parseInlineMarkdown('**Wichtig:** *Suizidalität* prüfen')).toEqual([
      { type: 'strong', children: [text('Wichtig:')] },
      text(' '),
      { type: 'em', children: [text('Suizidalität')] },
      text(' prüfen'),
    ])
  })
})
