import { describe, expect, it } from 'vitest'
import { injectMarketingMeta } from '../marketingHtml'

const TEMPLATE = [
  '<!doctype html>',
  '<html lang="de">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <title>Psychiatry.ink</title>',
  '  </head>',
  '  <body><div id="root"></div></body>',
  '</html>',
].join('\n')

describe('injectMarketingMeta', () => {
  it('serves an English shell for psychiatry.ink', () => {
    const html = injectMarketingMeta(TEMPLATE, 'psychiatry.ink')
    expect(html).toContain('<html lang="en-GB">')
    expect(html).not.toContain('lang="de"')
    expect(html).toContain('<meta property="og:site_name" content="Psychiatry.Ink" />')
    expect(html).toContain('<meta name="description"')
  })

  it('serves a German shell for psychiatrie.ink', () => {
    const html = injectMarketingMeta(TEMPLATE, 'psychiatrie.ink')
    expect(html).toContain('<html lang="de">')
    expect(html).toContain('<meta property="og:site_name" content="Psychiatrie.Ink" />')
  })

  it('does not confuse the two spelling domains', () => {
    const en = injectMarketingMeta(TEMPLATE, 'psychiatry.ink')
    const de = injectMarketingMeta(TEMPLATE, 'psychiatrie.ink')
    expect(en).toContain('lang="en-GB"')
    expect(de).toContain('lang="de"')
    expect(en).not.toEqual(de)
  })

  it('strips www. and ports from the Host before resolving', () => {
    expect(injectMarketingMeta(TEMPLATE, 'www.psychiatry.ink')).toContain('lang="en-GB"')
    expect(injectMarketingMeta(TEMPLATE, 'psychiatrie.ink:443')).toContain('lang="de"')
  })

  it('falls back to the English shell for localhost and unknown hosts', () => {
    expect(injectMarketingMeta(TEMPLATE, 'localhost')).toContain('lang="en-GB"')
    expect(injectMarketingMeta(TEMPLATE, 'unknown.example.com')).toContain('lang="en-GB"')
  })

  it('replaces the title with the resolved domain title', () => {
    const html = injectMarketingMeta(TEMPLATE, 'psiquiatria.ink')
    expect(html).toContain('lang="es"')
    expect(html).toMatch(/<title>[^<]+<\/title>/)
    expect(html).not.toContain('<title>Psychiatry.ink</title>')
  })

  it('does not mutate the input template', () => {
    const before = TEMPLATE
    injectMarketingMeta(TEMPLATE, 'psychiatry.ink')
    expect(TEMPLATE).toBe(before)
  })
})
