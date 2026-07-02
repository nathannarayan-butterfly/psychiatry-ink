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

  it('unwraps JSON with a non-standard prose key (Gemini "response")', () => {
    expect(sanitizeAiContent('{"response":"Sertralin ist ein SSRI."}')).toBe(
      'Sertralin ist ein SSRI.',
    )
  })

  it('unwraps JSON with arbitrary key names by shape', () => {
    expect(sanitizeAiContent('{"data":"Klinischer Hinweis."}')).toBe('Klinischer Hinweis.')
    expect(sanitizeAiContent('{"foo":"Nur ein Feld."}')).toBe('Nur ein Feld.')
  })

  it('unwraps nested JSON and fenced JSON with a non-standard key', () => {
    expect(sanitizeAiContent('{"result":{"response":"Verschachtelt."}}')).toBe('Verschachtelt.')
    expect(sanitizeAiContent('```json\n{"response":"Im Codeblock."}\n```')).toBe('Im Codeblock.')
  })

  it('drops metadata keys and keeps the prose', () => {
    const raw = '{"response":"Kernaussage.","references":["a","b"],"model":"gemini"}'
    expect(sanitizeAiContent(raw)).toBe('Kernaussage.')
  })

  it('does not mangle prose that merely contains a brace', () => {
    expect(sanitizeAiContent('Der Wert liegt bei {x}.')).toBe('Der Wert liegt bei {x}.')
  })
})
