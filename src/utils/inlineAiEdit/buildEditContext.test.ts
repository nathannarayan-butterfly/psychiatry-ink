import { describe, expect, it } from 'vitest'
import { applyEdit, buildEditContext, MAX_SELECTION_CHARS } from './buildEditContext'

const DOC = [
  'Erstkontakt in der Ambulanz.',
  '',
  'Der Patient wirkt unruhig und angespannt. Er berichtet über Schlafstörungen.',
  '',
  'Keine akute Eigen- oder Fremdgefährdung.',
].join('\n')

describe('buildEditContext', () => {
  it('returns the selected slice with neighbouring context', () => {
    const start = DOC.indexOf('Der Patient')
    const end = DOC.indexOf('angespannt.') + 'angespannt.'.length
    const ctx = buildEditContext(DOC, start, end)
    expect(ctx.selectedText).toBe('Der Patient wirkt unruhig und angespannt.')
    // After-context stays within the same paragraph.
    expect(ctx.contextAfter).toContain('Schlafstörungen')
    expect(ctx.contextBefore).toBe('')
  })

  it('widens context to neighbouring paragraphs for very short selections', () => {
    const start = DOC.indexOf('unruhig')
    const end = start + 'unruhig'.length
    const ctx = buildEditContext(DOC, start, end)
    expect(ctx.selectedText).toBe('unruhig')
    // Short selection pulls in surrounding paragraphs.
    expect(`${ctx.contextBefore}${ctx.contextAfter}`.length).toBeGreaterThan(0)
  })

  it('normalises reversed ranges', () => {
    const start = DOC.indexOf('angespannt.') + 'angespannt.'.length
    const end = DOC.indexOf('Der Patient')
    const ctx = buildEditContext(DOC, start, end)
    expect(ctx.selectedText).toBe('Der Patient wirkt unruhig und angespannt.')
  })

  it('caps the selection length', () => {
    const big = 'x'.repeat(MAX_SELECTION_CHARS + 500)
    const ctx = buildEditContext(big, 0, big.length)
    expect(ctx.selectedText.length).toBe(MAX_SELECTION_CHARS)
  })
})

describe('applyEdit', () => {
  it('splices the edited text into the range', () => {
    const result = applyEdit('Hallo Welt', 6, 10, 'Erde')
    expect(result).toBe('Hallo Erde')
  })

  it('handles reversed ranges', () => {
    const result = applyEdit('Hallo Welt', 10, 6, 'Erde')
    expect(result).toBe('Hallo Erde')
  })
})
