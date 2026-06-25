import { describe, expect, it } from 'vitest'
import {
  cssToFontSizePt,
  DEFAULT_FONT_SIZE_PT,
  ensureRichHtml,
  fontSizeToCss,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  isRichTextField,
  looksLikeHtml,
  plainTextToHtml,
} from '../richText'

describe('richText helpers', () => {
  it('detects HTML vs plain text', () => {
    expect(looksLikeHtml('<p>hi</p>')).toBe(true)
    expect(looksLikeHtml('<span style="font-size:14pt">x</span>')).toBe(true)
    expect(looksLikeHtml('plain text 2 < 3')).toBe(false)
    expect(looksLikeHtml('just words')).toBe(false)
  })

  it('migrates plain text to paragraph HTML, escaping content', () => {
    expect(plainTextToHtml('Hello world')).toBe('<p>Hello world</p>')
    expect(plainTextToHtml('a\nb')).toBe('<p>a<br />b</p>')
    expect(plainTextToHtml('para1\n\npara2')).toBe('<p>para1</p><p>para2</p>')
    expect(plainTextToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>')
  })

  it('preserves existing HTML and migrates legacy plain text', () => {
    expect(ensureRichHtml('')).toBe('')
    expect(ensureRichHtml('   ')).toBe('')
    expect(ensureRichHtml('<p>kept</p>')).toBe('<p>kept</p>')
    expect(ensureRichHtml('legacy\nnote')).toBe('<p>legacy<br />note</p>')
  })

  it('converts between pt and css font sizes', () => {
    expect(fontSizeToCss(14)).toBe('14pt')
    expect(cssToFontSizePt('14pt')).toBe(14)
    expect(cssToFontSizePt('16px')).toBe(12)
    expect(cssToFontSizePt(null)).toBeNull()
    expect(cssToFontSizePt('weird')).toBeNull()
  })

  it('exposes sane font catalogs and field classification', () => {
    expect(FONT_FAMILY_OPTIONS.length).toBeGreaterThanOrEqual(4)
    expect(FONT_SIZE_OPTIONS).toContain(DEFAULT_FONT_SIZE_PT)
    expect(isRichTextField('long_text')).toBe(true)
    expect(isRichTextField('short_text')).toBe(true)
    expect(isRichTextField('static_text')).toBe(true)
    expect(isRichTextField('date')).toBe(false)
  })
})
