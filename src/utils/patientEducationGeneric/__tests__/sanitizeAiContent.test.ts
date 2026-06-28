import { describe, expect, it } from 'vitest'
import { sanitizeEducationAiContent } from '../sanitizeAiContent'

describe('sanitizeEducationAiContent', () => {
  it('strips markdown code fences', () => {
    expect(sanitizeEducationAiContent('```json\n{"content":"Hello"}\n```')).toBe('Hello')
  })

  it('extracts content from JSON wrapper', () => {
    expect(
      sanitizeEducationAiContent('{"content":"Patient-friendly explanation.","references":[]}'),
    ).toBe('Patient-friendly explanation.')
  })

  it('removes raw heading markup fragments', () => {
    expect(sanitizeEducationAiContent('h2 What to expect\n\nSome text.')).toBe('What to expect\n\nSome text.')
  })

  it('strips orphaned quote wrappers', () => {
    expect(sanitizeEducationAiContent('"content": "Clean prose here"')).toBe('Clean prose here')
  })
})
