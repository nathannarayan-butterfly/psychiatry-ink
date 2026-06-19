import { readFileSync, existsSync } from 'fs'
import { describe, expect, it } from 'vitest'
import mammoth from 'mammoth'
import { docxTextToResult } from '../parsers/docxParser'

const SAMPLE_DOCX = '/home/nathan-narayan/Downloads/Araya-Biniam-a031225.docx'

describe('sample DOCX candidate counts', () => {
  it('merges aufnahme subsections when the local sample file is present', async () => {
    if (!existsSync(SAMPLE_DOCX)) return

    const buffer = readFileSync(SAMPLE_DOCX)
    const { value: text } = await mammoth.extractRawText({ buffer })
    const result = docxTextToResult(text)

    const anamnese = result.candidates.filter((c) => c.module === 'anamnese')
    const verlauf = result.candidates.filter((c) => c.module === 'verlauf')
    const therapy = result.candidates.filter((c) => c.module === 'therapy')

    // Regression guard: admission subsections must collapse to one Aufnahmebefund.
    expect(anamnese.length).toBeLessThanOrEqual(1)
    if (anamnese[0]?.module === 'anamnese') {
      expect(anamnese[0].data.title).toBe('Aufnahmebefund')
      expect(Object.keys(anamnese[0].data.sectionContents ?? {}).length).toBeGreaterThan(3)
    }

    // Verlauf visit notes should stay verlauf; Ergotherapieverlauf-style headings map to complementaryTherapy.
    expect(verlauf.length).toBeGreaterThan(0)
    expect(therapy.length).toBeLessThan(verlauf.length)
    const complementary = result.candidates.filter((c) => c.module === 'complementaryTherapy')
    expect(complementary.length).toBeGreaterThan(0)
    expect(complementary.some((c) => c.module === 'complementaryTherapy' && c.data.therapyTypeId === 'ergotherapie')).toBe(
      true,
    )
    expect(verlauf.every((c) => c.module !== 'verlauf' || !/\n{3,}/.test(c.data.text))).toBe(true)
    expect(
      verlauf.every(
        (c) =>
          c.module !== 'verlauf' ||
          !c.data.text.split('\n').some((line) => /^[\s\u00A0\u200B]*$/.test(line) && line.length > 0),
      ),
    ).toBe(true)
  })
})
