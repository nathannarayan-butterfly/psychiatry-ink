import { describe, expect, it } from 'vitest'
import { sanitizeAiContent } from '../sanitizeAiContent'

describe('sanitizeAiContent', () => {
  it('unwraps JSON content payloads', () => {
    const raw = '{"content":"Hello clinician"}'
    expect(sanitizeAiContent(raw)).toBe('Hello clinician')
  })

  it('strips markdown code fences', () => {
    const raw = '```json\n{"answer":"Plain answer"}\n```'
    expect(sanitizeAiContent(raw)).toBe('Plain answer')
  })

  it('returns trimmed prose unchanged', () => {
    expect(sanitizeAiContent('  Short clinical note.  ')).toBe('Short clinical note.')
  })
})
