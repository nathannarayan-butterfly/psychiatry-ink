import { describe, expect, it } from 'vitest'
import { htmlToPlainLines, sanitizeRichHtml } from '../htmlUtils'

describe('sanitizeRichHtml (TipTap output)', () => {
  it('preserves typography inline styles from the editor', () => {
    const input =
      '<p style="text-align: center"><span style="font-family: Georgia, serif; font-size: 18pt">Title</span></p>'
    const out = sanitizeRichHtml(input)
    expect(out).toContain('text-align: center')
    expect(out).toContain('font-family: Georgia, serif')
    expect(out).toContain('font-size: 18pt')
    expect(out).toContain('Title')
  })

  it('keeps formatting marks and lists', () => {
    const input = '<p><strong>b</strong> <em>i</em> <u>u</u></p><ul><li>one</li><li>two</li></ul>'
    const out = sanitizeRichHtml(input)
    expect(out).toContain('<strong>b</strong>')
    expect(out).toContain('<em>i</em>')
    expect(out).toContain('<u>u</u>')
    expect(out).toContain('<li>one</li>')
  })

  it('strips dangerous tags, attributes and style values', () => {
    const input =
      '<p onclick="alert(1)" style="font-size:12pt; background:url(javascript:alert(1))">x</p><script>alert(2)</script><img src=x onerror=alert(3) />'
    const out = sanitizeRichHtml(input)
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('script')
    expect(out).not.toContain('url(')
    expect(out).not.toContain('<img')
    expect(out).toContain('font-size: 12pt')
    expect(out).toContain('x')
  })

  it('flattens to plain lines for copy/plain rendering', () => {
    const html = '<p>line1</p><p>line2</p><ul><li>a</li><li>b</li></ul>'
    const plain = htmlToPlainLines(html)
    expect(plain).toContain('line1')
    expect(plain).toContain('line2')
    expect(plain).toContain('• a')
  })
})
