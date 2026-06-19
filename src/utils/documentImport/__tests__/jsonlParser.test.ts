import { describe, expect, it } from 'vitest'
import { parseJsonlText } from '../parsers/jsonlParser'

describe('parseJsonlText', () => {
  it('maps one record per line and stamps line numbers', () => {
    const jsonl = [
      JSON.stringify({ module: 'diagnosis', label: 'Depression', icd10: 'F32.1' }),
      JSON.stringify({ module: 'medication', substance: 'Sertralin' }),
    ].join('\n')
    const result = parseJsonlText(jsonl)
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates[0].sourceLocation.lineNumber).toBe(1)
    expect(result.candidates[1].sourceLocation.lineNumber).toBe(2)
  })

  it('skips malformed lines with a warning but keeps valid ones', () => {
    const jsonl = ['{"module":"diagnosis","label":"A"}', 'not-json', '{"module":"diagnosis","label":"B"}'].join('\n')
    const result = parseJsonlText(jsonl)
    expect(result.candidates).toHaveLength(2)
    expect(result.notices.some((n) => n.code === 'jsonl_line_invalid')).toBe(true)
  })

  it('ignores blank lines', () => {
    const result = parseJsonlText('\n\n{"module":"diagnosis","label":"X"}\n\n')
    expect(result.candidates).toHaveLength(1)
  })
})
