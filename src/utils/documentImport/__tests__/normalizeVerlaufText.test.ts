import { describe, expect, it } from 'vitest'
import { normalizeVerlaufText } from '../normalizeVerlaufText'

describe('normalizeVerlaufText', () => {
  it('collapses 3+ consecutive blank lines to a single paragraph break', () => {
    const input = ['Erster Satz.', '', '', '', 'Zweiter Satz.'].join('\n')
    expect(normalizeVerlaufText(input)).toBe(['Erster Satz.', '', 'Zweiter Satz.'].join('\n'))
  })

  it('trims trailing whitespace on each line and the whole body', () => {
    const input = '  Zeile mit Leerzeichen.   \n\n  Nächster Absatz.  '
    expect(normalizeVerlaufText(input)).toBe('Zeile mit Leerzeichen.\n\nNächster Absatz.')
  })

  it('preserves a single blank line between paragraphs', () => {
    const input = 'Absatz A.\n\nAbsatz B.'
    expect(normalizeVerlaufText(input)).toBe(input)
  })

  it('does not merge separate blocks when called per entry', () => {
    const entryA = normalizeVerlaufText('12.03.2024\n\n\nStimmung gebessert.')
    const entryB = normalizeVerlaufText('14.03.2024\n\n\nSchlaf stabil.')
    expect(entryA).not.toContain('14.03.2024')
    expect(entryB).not.toContain('Stimmung gebessert')
  })
})
