import { describe, expect, it } from 'vitest'
import {
  SCROLL_FLEX_PARENTS,
  SCROLL_SURFACES,
  auditSurface,
  collectDeclarationsFor,
  extractStyleRules,
  hasMinHeightZero,
  hasOverflowScroll,
  loadStylesheet,
} from '../scrollGuard'

/** Unit tests for the CSS scanner itself — keeps the guardrail honest. */
describe('scrollGuard CSS scanner', () => {
  it('extracts style rules and their declarations', () => {
    const rules = extractStyleRules('.a, .b { color: red; min-height: 0; }')
    expect(rules).toHaveLength(1)
    expect(rules[0]?.selectors).toEqual(['.a', '.b'])
    expect(rules[0]?.declarations).toEqual([
      { prop: 'color', value: 'red' },
      { prop: 'min-height', value: '0' },
    ])
  })

  it('recurses into @media but skips @keyframes', () => {
    const css = `
      .x { overflow-y: auto; }
      @media (max-width: 64rem) { .x { min-height: 0; } }
      @keyframes spin { 0% { opacity: 0; } 100% { opacity: 1; } }
    `
    const rules = extractStyleRules(css)
    const decls = collectDeclarationsFor(rules, '.x')
    expect(hasOverflowScroll(decls)).toBe(true)
    expect(hasMinHeightZero(decls)).toBe(true)
    // keyframe steps must NOT be treated as style rules.
    expect(rules.some((r) => r.selectors.includes('0%'))).toBe(false)
  })

  it('detects overflow scroll affordances', () => {
    expect(hasOverflowScroll([{ prop: 'overflow-y', value: 'auto' }])).toBe(true)
    expect(hasOverflowScroll([{ prop: 'overflow', value: 'scroll' }])).toBe(true)
    expect(hasOverflowScroll([{ prop: 'overflow', value: 'hidden' }])).toBe(false)
    expect(hasOverflowScroll([{ prop: 'overflow-x', value: 'auto' }])).toBe(false)
  })

  it('treats only min-height:0 (last-wins) as the footgun fix', () => {
    expect(hasMinHeightZero([{ prop: 'min-height', value: '0' }])).toBe(true)
    expect(hasMinHeightZero([{ prop: 'min-height', value: '0px' }])).toBe(true)
    expect(hasMinHeightZero([{ prop: 'min-height', value: '400px' }])).toBe(false)
    // a later non-zero value wins → no longer counts as fixed.
    expect(
      hasMinHeightZero([
        { prop: 'min-height', value: '0' },
        { prop: 'min-height', value: '60vh' },
      ]),
    ).toBe(false)
  })

  it('matches compound and combinator selectors exactly', () => {
    const rules = extractStyleRules('.wai-panel--inline   .wai-panel__body { overflow-y: auto; }')
    expect(collectDeclarationsFor(rules, '.wai-panel--inline .wai-panel__body')).toHaveLength(1)
    expect(collectDeclarationsFor(rules, '.wai-panel__body')).toHaveLength(0)
  })
})

/**
 * The real guardrail: every tracked in-container surface must keep a scroll
 * region, and every tracked flex parent must keep `min-height: 0`. If you add a
 * new tool/page/dock, register it in scrollGuard.ts — do not weaken this test.
 */
describe('tracked scrollable surfaces keep their scroll affordance', () => {
  it.each(SCROLL_SURFACES.map((s) => [s.id, s] as const))(
    'surface "%s" has overflow-y:auto + min-height:0',
    (_id, surface) => {
      const audit = auditSurface(surface)
      expect(
        audit.found,
        `Selector "${surface.selector}" not found in src/styles/${surface.file} (${surface.where}).`,
      ).toBe(true)
      expect(
        audit.hasOverflow,
        `"${surface.selector}" (${surface.where}) lost its scroll region — add overflow-y: auto (see app-scroll.css / .app-scroll-region).`,
      ).toBe(true)
      expect(
        audit.hasMinHeightZero,
        `"${surface.minHeightZeroOn ?? surface.selector}" must keep min-height: 0 or its overflow-y:auto cannot engage (flexbox min-height:auto footgun).`,
      ).toBe(true)
    },
  )

  it.each(SCROLL_FLEX_PARENTS.map((p) => [p.id, p] as const))(
    'flex parent "%s" keeps min-height:0',
    (_id, parent) => {
      const rules = loadStylesheet(parent.file)
      const decls = collectDeclarationsFor(rules, parent.selector)
      expect(
        decls.length > 0,
        `Selector "${parent.selector}" not found in src/styles/${parent.file}.`,
      ).toBe(true)
      expect(
        hasMinHeightZero(decls),
        `"${parent.selector}" must keep min-height: 0 so descendant scroll regions can overflow.`,
      ).toBe(true)
    },
  )
})
