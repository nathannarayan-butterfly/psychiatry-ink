import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards the per-tool tablet (≤ 1024px / 64rem) inner-layout polish so the
 * standalone patient-less tools keep reflowing to 1–2 columns and never lose
 * the responsive rules during future edits. The boundary must stay aligned
 * with TABLET_BREAKPOINT_PX (1024px === 64rem) in responsiveBreakpoints.ts.
 */
const stylesDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const standaloneCss = readFileSync(join(stylesDir, 'standalone-workspace.css'), 'utf8')
const launcherCss = readFileSync(join(stylesDir, 'workspace-launcher.css'), 'utf8')

function tabletBlock(css: string): string {
  const start = css.indexOf('@media (max-width: 64rem)')
  expect(start, 'expected a 64rem tablet media query').toBeGreaterThan(-1)
  // Capture from the media query to the end of file — good enough to assert the
  // reflow selectors live inside a tablet block.
  return css.slice(start)
}

describe('standalone tools tablet layout polish', () => {
  it('defines a tablet media query at the shipped 64rem boundary', () => {
    expect(standaloneCss).toContain('@media (max-width: 64rem)')
  })

  it('stacks multi-column control rows to a single full-width column', () => {
    const block = tabletBlock(standaloneCss)
    expect(block).toContain('.swx-rewrite__controls')
    expect(block).toContain('.swx-translate__langs')
    expect(block).toContain('flex-direction: column')
  })

  it('reflows the Befund mode chooser to one card per row', () => {
    const block = tabletBlock(standaloneCss)
    expect(block).toMatch(/\.swx-mode-grid\s*\{\s*grid-template-columns:\s*1fr;/)
  })

  it('lets lab parameter/value grid cells shrink instead of overflowing', () => {
    const block = tabletBlock(standaloneCss)
    expect(block).toContain('.swx-lab-row > *')
    expect(block).toMatch(/min-width:\s*0/)
  })

  it('keeps tab bars scrollable rather than breaking onto a second row', () => {
    const block = tabletBlock(standaloneCss)
    expect(block).toContain('.swx-lab-tools__tabs')
    expect(block).toContain('overflow-x: auto')
  })

  it('reflows the launcher grid to fewer, tappable cards on tablet', () => {
    const block = tabletBlock(launcherCss)
    expect(block).toContain('.wl-grid')
    expect(block).toMatch(/minmax\(190px/)
  })
})
