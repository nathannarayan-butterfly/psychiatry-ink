/**
 * Regression test for the case-sidebar collapse/expand toggle.
 *
 * Bug (confirmed in production): clicking the sidebar collapse button navigated
 * the user to /dashboard instead of collapsing the sidebar. Root cause was a
 * pure layout/stacking-context issue — the decorative, oversized brand-logo mark
 * (an `<svg>` child of the `<a href="/dashboard">` brand link, carrying a
 * `filter: drop-shadow()` that forms its own stacking context) overflowed its
 * column and painted on top of the sibling collapse button, so a real click
 * landed on the logo link and routed to the dashboard.
 *
 * This MUST be a real-browser test: jsdom has no layout or hit-testing, so it
 * cannot observe the overlap. We drive a headless Chromium via Playwright and
 * assert that a real coordinate click on the toggle's visual centre collapses
 * (and re-expands) the sidebar WITHOUT changing the route.
 *
 * The app's dev server skips auth when Supabase is unconfigured
 * (`import.meta.env.DEV && !isConfigured`), so this runs without credentials.
 *
 * Usage:
 *   node tests/regression/sidebar-collapse-no-nav.mjs
 * Optional: BASE=http://localhost:5199 to reuse an already-running dev server.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = Number(process.env.PORT ?? 5199)
const EXTERNAL_BASE = process.env.BASE
const BASE = EXTERNAL_BASE ?? `http://localhost:${PORT}`

const failures = []
function check(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures.push(label)
}

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await sleep(500)
  }
  return false
}

let viteProc = null
if (!EXTERNAL_BASE) {
  viteProc = spawn(
    'npm',
    ['run', 'dev:web', '--', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore', detached: true },
  )
}

const browser = await chromium.launch()
try {
  const ok = await waitForServer(`${BASE}/`)
  if (!ok) throw new Error(`dev server never became reachable at ${BASE}`)

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  await page.goto(`${BASE}/workspace`, { waitUntil: 'networkidle' })

  const btn = page.locator('.case-sidebar-panel__collapse-btn').first()
  await btn.waitFor({ state: 'visible', timeout: 20_000 })

  // The toggle must be the topmost hit target at its own centre (not the logo).
  const hit = await btn.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return {
      isToggleOrInside: !!(top && (top === el || el.contains(top))),
      navAnchorAtCentre: top ? (top.closest('a')?.getAttribute('href') ?? null) : null,
    }
  })
  check('toggle is the topmost element at its centre', hit.isToggleOrInside)
  check('no navigating <a> intercepts the toggle centre', hit.navAnchorAtCentre === null)

  const clickCentre = async () => {
    const box = await btn.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(600)
  }
  const isCollapsed = () =>
    page.locator('.case-sidebar-panel--collapsed').count().then((n) => n > 0)

  // 1) Collapse: a real click must collapse and must NOT navigate.
  const urlBefore = page.url()
  await clickCentre()
  check('collapse click did not navigate', page.url() === urlBefore)
  check('collapse click collapsed the sidebar', await isCollapsed())

  // 2) Expand: a real click on the (now collapsed) toggle must expand, no nav.
  const urlBeforeExpand = page.url()
  await clickCentre()
  check('expand click did not navigate', page.url() === urlBeforeExpand)
  check('expand click expanded the sidebar', !(await isCollapsed()))
} finally {
  await browser.close()
  if (viteProc?.pid) {
    try {
      process.kill(-viteProc.pid, 'SIGTERM')
    } catch {
      /* already gone */
    }
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n - ${failures.join('\n - ')}`)
  process.exit(1)
}
console.log('\nAll sidebar collapse/expand regression checks passed.')
