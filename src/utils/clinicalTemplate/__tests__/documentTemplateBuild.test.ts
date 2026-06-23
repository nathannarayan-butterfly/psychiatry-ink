import { describe, expect, it } from 'vitest'
import {
  buildFallbackBlocks,
  normalizeAnalyzedCategory,
  resolveAnalyzedBlocks,
  resolveAnalyzedTemplate,
} from '../documentTemplateBuild'
import { templateNameFromFilename } from '../documentText'

describe('normalizeAnalyzedCategory', () => {
  it('keeps a known category', () => {
    expect(normalizeAnalyzedCategory('arztbrief')).toBe('arztbrief')
    expect(normalizeAnalyzedCategory('gutachten')).toBe('gutachten')
  })

  it('falls back to custom for unknown or non-string input', () => {
    expect(normalizeAnalyzedCategory('not-a-category')).toBe('custom')
    expect(normalizeAnalyzedCategory(undefined)).toBe('custom')
    expect(normalizeAnalyzedCategory(42)).toBe('custom')
  })
})

describe('resolveAnalyzedBlocks', () => {
  it('keeps schema-valid blocks and assigns fresh ids', () => {
    const blocks = resolveAnalyzedBlocks(
      [
        { id: 'x', type: 'heading', text: 'Befund', level: 2 },
        { id: 'y', type: 'text', text: 'Hallo' },
      ],
      'raw text',
    )
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.type).toBe('heading')
    expect(blocks[1]!.type).toBe('text')
    expect(blocks[0]!.id).not.toBe(blocks[1]!.id)
    expect(blocks[0]!.id).toBeTruthy()
  })

  it('drops invalid blocks but keeps the valid ones', () => {
    const blocks = resolveAnalyzedBlocks(
      [
        { type: 'heading', text: 'no id but level missing' }, // invalid (no level)
        { id: 'ok', type: 'text', text: 'kept' },
        { type: 'bogus_type', whatever: true }, // invalid type
      ],
      'raw text',
    )
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe('text')
  })

  it('falls back to a single text block when nothing validates', () => {
    const blocks = resolveAnalyzedBlocks([{ type: 'nope' }, 'garbage', 123], 'the raw content')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe('text')
    expect(blocks[0]).toMatchObject({ type: 'text', text: 'the raw content' })
  })

  it('falls back when blocks is not an array', () => {
    const blocks = resolveAnalyzedBlocks(undefined, 'raw')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe('text')
  })
})

describe('buildFallbackBlocks', () => {
  it('trims to the raw text and caps very long content', () => {
    const huge = 'a'.repeat(20000)
    const [block] = buildFallbackBlocks(huge)
    expect(block!.type).toBe('text')
    expect((block as { text: string }).text.length).toBeLessThanOrEqual(12000)
  })
})

describe('resolveAnalyzedTemplate', () => {
  it('returns validated blocks + normalized category without fallback', () => {
    const result = resolveAnalyzedTemplate({
      category: 'arztbrief',
      blocks: [{ id: 'a', type: 'text', text: 'x' }],
      rawText: 'raw',
    })
    expect(result.category).toBe('arztbrief')
    expect(result.usedFallback).toBe(false)
    expect(result.blocks).toHaveLength(1)
  })

  it('flags fallback and inserts raw text when AI output is unusable', () => {
    const result = resolveAnalyzedTemplate({
      category: 'totally-wrong',
      blocks: 'not-an-array',
      rawText: 'fallback body',
    })
    expect(result.category).toBe('custom')
    expect(result.usedFallback).toBe(true)
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0]).toMatchObject({ type: 'text', text: 'fallback body' })
  })
})

describe('templateNameFromFilename', () => {
  it('strips the extension and normalizes separators', () => {
    expect(templateNameFromFilename('Arztbrief_Vorlage.docx')).toBe('Arztbrief Vorlage')
    expect(templateNameFromFilename('mein-befund.pdf')).toBe('mein befund')
    expect(templateNameFromFilename('notes.txt')).toBe('notes')
  })
})
