/**
 * Shared scroll-affordance guardrail — the single source of truth that keeps the
 * repo's height-constrained tool/page surfaces scrollable.
 *
 * ## Why this exists (the systemic root cause)
 *
 * Psychiatry.Ink renders almost every tool/page inside a height-bounded shell
 * (`.notion-preview-app` is `height: 100dvh; overflow: hidden`; the workspace
 * scroll is owned by `.case-tab-shell__body` / the standalone `.swx-host`). The
 * recurring bug — fixed one screen at a time on the Medikamenten-Check, the
 * standalone tools, the docks and (most recently) the Aufklärung
 * medication-selected view — is that a NEW in-container surface ships its content
 * without a designated scroll region, so everything below the fold is unreachable.
 *
 * Two CSS footguns cause it every time:
 *   1. the content container has no `overflow-y: auto` (nothing scrolls), and
 *   2. a flex-column ANCESTOR keeps the default `min-height: auto`, which refuses
 *      to shrink below its content and so prevents a descendant's
 *      `overflow-y: auto` from ever engaging.
 *
 * This module turns the per-screen fix into a permanent, repo-wide guardrail: it
 * statically scans the real CSS and fails if a tracked surface loses its scroll
 * region (`overflow-y: auto` + `min-height: 0`) or a tracked flex parent loses
 * its `min-height: 0`. New tracked surfaces are added to {@link SCROLL_SURFACES}
 * / {@link SCROLL_FLEX_PARENTS} — see "How to extend" at the bottom of this file.
 *
 * How to run:
 *   npm test -- scrollGuard            # this guardrail suite
 *   npm test                           # full vitest run (guardrails included)
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface StyleRule {
  selectors: string[]
  declarations: Array<{ prop: string; value: string }>
}

/**
 * Minimal, brace-aware CSS rule extractor. Strips comments, walks balanced
 * braces, recurses into block at-rules (`@media`/`@supports`/`@container`/…) so
 * responsive overrides are included, and skips non-style at-rules
 * (`@keyframes`/`@font-face`/…). Good enough for the hand-authored CSS in this
 * repo (no preprocessor, no exotic syntax).
 */
export function extractStyleRules(css: string): StyleRule[] {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: StyleRule[] = []

  const walk = (text: string): void => {
    let i = 0
    while (i < text.length) {
      const open = text.indexOf('{', i)
      if (open === -1) break
      const prelude = text.slice(i, open).trim()

      let depth = 1
      let j = open + 1
      while (j < text.length && depth > 0) {
        const ch = text[j]
        if (ch === '{') depth++
        else if (ch === '}') depth--
        j++
      }
      const body = text.slice(open + 1, j - 1)

      if (/^@(media|supports|container|layer|scope)\b/i.test(prelude)) {
        walk(body)
      } else if (prelude.startsWith('@')) {
        // keyframes / font-face / page / etc. — not a style rule.
      } else if (prelude.length > 0) {
        rules.push({
          selectors: prelude
            .split(',')
            .map((s) => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean),
          declarations: parseDeclarations(body),
        })
      }
      i = j
    }
  }

  walk(noComments)
  return rules
}

/** Parse a declaration block body into `{prop, value}` pairs (lowercased prop). */
export function parseDeclarations(body: string): Array<{ prop: string; value: string }> {
  const out: Array<{ prop: string; value: string }> = []
  for (const chunk of body.split(';')) {
    const idx = chunk.indexOf(':')
    if (idx === -1) continue
    const prop = chunk.slice(0, idx).trim().toLowerCase()
    const value = chunk.slice(idx + 1).trim()
    if (prop && value) out.push({ prop, value: value.replace(/\s+/g, ' ') })
  }
  return out
}

/** Normalise a selector for comparison (collapse whitespace around combinators). */
function normaliseSelector(sel: string): string {
  return sel.replace(/\s*([>+~])\s*/g, ' $1 ').replace(/\s+/g, ' ').trim()
}

/**
 * Collect every declaration that applies to an EXACT selector across all rules
 * (including responsive overrides) in the given parsed stylesheet.
 */
export function collectDeclarationsFor(
  rules: StyleRule[],
  selector: string,
): Array<{ prop: string; value: string }> {
  const target = normaliseSelector(selector)
  const decls: Array<{ prop: string; value: string }> = []
  for (const rule of rules) {
    if (rule.selectors.some((s) => normaliseSelector(s) === target)) {
      decls.push(...rule.declarations)
    }
  }
  return decls
}

/** Does this declaration set establish a vertical scroll region? */
export function hasOverflowScroll(decls: Array<{ prop: string; value: string }>): boolean {
  return decls.some(
    ({ prop, value }) =>
      (prop === 'overflow-y' || prop === 'overflow') && /\b(auto|scroll)\b/.test(value),
  )
}

/** Does this declaration set neutralise the flexbox `min-height: auto` footgun? */
export function hasMinHeightZero(decls: Array<{ prop: string; value: string }>): boolean {
  // last-wins: a later `min-height: 0` must not be overridden by a non-zero one.
  let value: string | null = null
  for (const d of decls) {
    if (d.prop === 'min-height') value = d.value
  }
  return value !== null && /^0(\D|$)/.test(value)
}

const STYLES_DIR = resolve(process.cwd(), 'src/styles')

const cache = new Map<string, StyleRule[]>()

/** Read + parse a stylesheet under `src/styles`, memoised per file. */
export function loadStylesheet(file: string): StyleRule[] {
  const cached = cache.get(file)
  if (cached) return cached
  const css = readFileSync(resolve(STYLES_DIR, file), 'utf8')
  const rules = extractStyleRules(css)
  cache.set(file, rules)
  return rules
}

export interface ScrollSurface {
  /** Stable id used in failure messages. */
  id: string
  /** Stylesheet under `src/styles/` that owns the scroll region. */
  file: string
  /** Exact selector of the element that must own the scroll. */
  selector: string
  /**
   * Selector whose `min-height: 0` allows this region to overflow. Often the
   * region itself; sometimes a parent (e.g. the Arztbrief body relies on its
   * `.arztbrief-workspace` parent being `min-height: 0`).
   */
  minHeightZeroOn?: string
  /** Human note on where this surface renders. */
  where: string
}

/**
 * The tracked scrollable surfaces. Each MUST keep a real scroll region. Adding a
 * NEW in-container tool/page? Add it here too (that is the contract) — the test
 * then fails until the surface declares `overflow-y: auto` + `min-height: 0`.
 */
export const SCROLL_SURFACES: readonly ScrollSurface[] = [
  {
    id: 'app-scroll-region',
    file: 'app-scroll.css',
    selector: '.app-scroll-region',
    where: 'shared utility — the canonical scrollable content region',
  },
  {
    id: 'medication-education-sections',
    file: 'medication-education.css',
    selector: '.medication-education-sections',
    where:
      'MedicationEducationWorkspace + PatientEducationGenericWorkspace — the Aufklärung section stack',
  },
  {
    id: 'swx-host',
    file: 'standalone-workspace.css',
    selector: '.swx-host',
    where: 'standalone (patient-less) in-container tool host',
  },
  {
    id: 'wai-panel-inline-body',
    file: 'standalone-workspace.css',
    selector: '.wai-panel--inline .wai-panel__body',
    where: 'inline workspace-AI panel body (Medikamenten-Check etc.)',
  },
  {
    id: 'wai-panel-rendered',
    file: 'standalone-workspace.css',
    selector: '.wai-panel__rendered',
    where: 'rendered markdown result view (lab interpretation etc.)',
  },
  {
    id: 'arztbrief-workspace-body',
    file: 'arztbrief.css',
    selector: '.arztbrief-workspace__body',
    minHeightZeroOn: '.arztbrief-workspace',
    where: 'Arztbrief workspace scroll body',
  },
  {
    id: 'case-tab-shell-body',
    file: 'case-sidebar.css',
    selector: '.case-tab-shell__body',
    where: 'the workspace tab scroll owner',
  },
]

/**
 * Tracked flex-column ancestors that MUST stay `min-height: 0` so a descendant
 * scroll region can overflow. (The flexbox `min-height: auto` default is the
 * silent killer.)
 */
export const SCROLL_FLEX_PARENTS: ReadonlyArray<{
  id: string
  file: string
  selector: string
}> = [
  { id: 'workspace-panel', file: 'workspace-panel-bordered.css', selector: '.workspace-panel' },
  { id: 'arztbrief-workspace', file: 'arztbrief.css', selector: '.arztbrief-workspace' },
  { id: 'notion-preview-canvas', file: 'notion-preview.css', selector: '.notion-preview-canvas' },
  { id: 'case-tab-shell', file: 'case-sidebar.css', selector: '.case-tab-shell' },
  { id: 'app-scroll-parent', file: 'app-scroll.css', selector: '.app-scroll-parent' },
]

export interface SurfaceAudit {
  surface: ScrollSurface
  found: boolean
  hasOverflow: boolean
  hasMinHeightZero: boolean
  ok: boolean
}

/** Audit one tracked surface against the real CSS on disk. */
export function auditSurface(surface: ScrollSurface): SurfaceAudit {
  const rules = loadStylesheet(surface.file)
  const decls = collectDeclarationsFor(rules, surface.selector)
  const found = decls.length > 0
  const overflow = hasOverflowScroll(decls)

  const minHeightDecls = surface.minHeightZeroOn
    ? collectDeclarationsFor(rules, surface.minHeightZeroOn)
    : decls
  const minHeightZero = hasMinHeightZero(minHeightDecls)

  return {
    surface,
    found,
    hasOverflow: overflow,
    hasMinHeightZero: minHeightZero,
    ok: found && overflow && minHeightZero,
  }
}

/**
 * ## How to extend
 *
 * 1. Shipping a NEW in-container tool/page/dock/dialog whose content can exceed
 *    its height? Put `app-scroll-region` (see app-scroll.css) on the scrolling
 *    element and `min-height: 0` (or `app-scroll-parent`) on every flex-column
 *    ancestor up to the nearest height-bounded scroll owner.
 * 2. Register the surface in {@link SCROLL_SURFACES} (and any new tracked flex
 *    ancestor in {@link SCROLL_FLEX_PARENTS}). The guardrail then fails until the
 *    affordance is present — so the scroll bug cannot silently ship again.
 * 3. NEVER weaken the guardrail to make it pass. Fix the CSS, not the test.
 */
