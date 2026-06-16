import { describe, expect, it } from 'vitest'
import {
  MAX_SELECTION_CHARS,
  buildInlineEditUserPrompt,
  cleanEditedText,
  clampSelection,
  isInlineEditMockText,
} from './inlineEditService'

describe('inlineEditService prompt + cleaning helpers', () => {
  it('places the selection LAST after a --- fence (so the mock provider echoes it)', () => {
    const prompt = buildInlineEditUserPrompt({
      context: {
        selectedText: 'Patient wirkt unruhig.',
        contextBefore: 'Erstkontakt.',
        contextAfter: 'Keine akute Eigengefährdung.',
      },
      instruction: 'Formuliere das klinischer.',
    })
    const lastSegment = prompt.split('---').pop()?.trim()
    expect(lastSegment).toBe('Patient wirkt unruhig.')
    expect(prompt).toContain('Formuliere das klinischer.')
    // Context is included for reference but clearly marked do-not-rewrite.
    expect(prompt).toContain('Erstkontakt.')
    expect(prompt).toContain('Keine akute Eigengefährdung.')
  })

  it('falls back to a default instruction when none is given', () => {
    const prompt = buildInlineEditUserPrompt({
      context: { selectedText: 'x', contextBefore: '', contextAfter: '' },
      instruction: '',
    })
    expect(prompt.toLowerCase()).toContain('rephrase')
  })

  it('cleanEditedText strips the mock provider suffix', () => {
    const raw = 'Der Patient wirkt unruhig und angespannt.\n\n[AI draft — set OPENAI_API_KEY to enable AI]'
    expect(cleanEditedText(raw)).toBe('Der Patient wirkt unruhig und angespannt.')
  })

  it('cleanEditedText strips enclosing quotes and code fences', () => {
    expect(cleanEditedText('"Hallo Welt"')).toBe('Hallo Welt')
    expect(cleanEditedText('«Hallo Welt»')).toBe('Hallo Welt')
    expect(cleanEditedText('```\nHallo Welt\n```')).toBe('Hallo Welt')
  })

  it('isInlineEditMockText detects the mock marker', () => {
    expect(isInlineEditMockText('abc [AI draft — foo]')).toBe(true)
    expect(isInlineEditMockText('abc')).toBe(false)
  })

  it('clampSelection enforces the hard cap', () => {
    const long = 'a'.repeat(MAX_SELECTION_CHARS + 100)
    expect(clampSelection(long).length).toBe(MAX_SELECTION_CHARS)
  })
})
