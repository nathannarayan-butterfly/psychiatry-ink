// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('KbStructuredSection interaction layout', () => {
  it('uses shared structured shell classes for CYP/interactions', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/medication/kb/KbStructuredSection.tsx'),
      'utf8',
    )
    expect(source).toContain('kb-structured kb-structured--cyp')
    expect(source).toContain('kb-chart__caption')
    expect(source).toContain('kb-structured__visual')
  })
})
