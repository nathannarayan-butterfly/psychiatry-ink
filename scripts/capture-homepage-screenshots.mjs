/**
 * Automated homepage demo screenshots — Nikolaos Demo (DEMO-CASE-0001), English UI.
 *
 * Captures PNGs referenced by `src/data/homepage/content.de.ts` into
 * `public/homepage/`. Idempotent: re-running overwrites the same files.
 *
 * Viewport: 1440×900 logical pixels at 2× device scale → 2880×1800 PNG output
 * for sharp display in the homepage 2-column grid and lightbox.
 *
 * Strategy
 * ─────────
 * 1. Start local dev (Vite + API) OR reuse an existing server via BASE.
 * 2. Without login credentials: Vite runs with Supabase env cleared so the app
 *    uses the dev no-auth entry; seed the demo via /dev/demo-patient.
 * 3. With HOMEPAGE_SCREENSHOT_EMAIL + HOMEPAGE_SCREENSHOT_PASSWORD: keep Supabase
 *    config, log in, auto-install demo for the user, and capture DiscussCase too.
 *
 * Environment
 * ───────────
 *   BASE                         Reuse server (e.g. http://localhost:5199)
 *   PORT                         Vite port when spawning (default 5199)
 *   API_PORT                     API port when spawning (default 3001, Vite proxy)
 *   HOMEPAGE_SCREENSHOT_EMAIL    Optional Supabase login for DiscussCase
 *   HOMEPAGE_SCREENSHOT_PASSWORD Optional Supabase login for DiscussCase
 *   HOMEPAGE_SCREENSHOT_SKIP_DISCUSS=1  Skip discuss panel (no credentials)
 *   SKIP_DEV_SERVER=1            Require BASE; do not spawn dev processes
 *
 * Usage
 * ─────
 *   npm run homepage:screenshots
 *   BASE=http://localhost:5173 npm run homepage:screenshots
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const ROOT = resolve(import.meta.dirname, '..')
const OUTPUT_DIR = resolve(ROOT, 'public/homepage')
const DEMO_CASE_ID = 'DEMO-CASE-EN-0001'
const CASE_PATH = `/case/${encodeURIComponent(DEMO_CASE_ID)}`
const VIEWPORT = { width: 1440, height: 900 }
const DEVICE_SCALE_FACTOR = 2
const LANGUAGE_KEY = 'psychiatry-ink-language'

const WEB_PORT = Number(process.env.PORT ?? 5199)
const API_PORT = Number(process.env.API_PORT ?? 3001)
const EXTERNAL_BASE = process.env.BASE?.replace(/\/+$/, '')
const BASE = EXTERNAL_BASE ?? `http://localhost:${WEB_PORT}`
const SKIP_DEV_SERVER = process.env.SKIP_DEV_SERVER === '1'
const SKIP_DISCUSS =
  process.env.HOMEPAGE_SCREENSHOT_SKIP_DISCUSS === '1' ||
  !(process.env.HOMEPAGE_SCREENSHOT_EMAIL && process.env.HOMEPAGE_SCREENSHOT_PASSWORD)

loadEnvFiles()

const failures = []
function check(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`)
  if (!condition) failures.push(label)
}

function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(ROOT, name)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      if (process.env[key] != null && process.env[key] !== '') continue
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}

function stripSupabaseEnv(env) {
  const next = { ...env }
  for (const key of [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ]) {
    next[key] = ''
  }
  return next
}

function devWebEnv(useAuth) {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
  }
  return useAuth ? env : stripSupabaseEnv(env)
}

function devServerEnv(useAuth) {
  return {
    ...(useAuth ? process.env : stripSupabaseEnv(process.env)),
    NODE_ENV: 'development',
    ENABLE_DEV_AUTH_BYPASS: 'true',
    API_PORT: String(API_PORT),
    PORT: String(API_PORT),
  }
}

async function waitForServer(url, attempts = 90) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return true
    } catch {
      /* not up yet */
    }
    await sleep(500)
  }
  return false
}

let apiProc = null
let viteProc = null

function startDevStack(useAuth) {
  if (SKIP_DEV_SERVER || EXTERNAL_BASE) return

  apiProc = spawn('npm', ['run', 'dev:server'], {
    stdio: 'ignore',
    detached: true,
    cwd: ROOT,
    env: devServerEnv(useAuth),
  })

  viteProc = spawn(
    'npm',
    ['run', 'dev:web', '--', '--port', String(WEB_PORT), '--strictPort'],
    {
      stdio: 'ignore',
      detached: true,
      cwd: ROOT,
      env: devWebEnv(useAuth),
    },
  )
}

function stopDevStack() {
  for (const proc of [viteProc, apiProc]) {
    if (!proc?.pid) continue
    try {
      process.kill(-proc.pid, 'SIGTERM')
    } catch {
      /* already gone */
    }
  }
}

async function preparePage(context, useAuth) {
  if (!useAuth) {
    await context.route('**/app-config.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: 'window.__APP_CONFIG__ = Object.freeze({ supabaseUrl: "", supabaseAnonKey: "" });',
      }),
    )
  }

  await context.addInitScript((langKey) => {
    try {
      localStorage.setItem(langKey, 'en')
      localStorage.setItem('psychiatry-ink:identifier-storage-acknowledged', 'true')
      localStorage.setItem(
        'psychiatry-ink-privacy',
        JSON.stringify({ countryCode: 'DE', identifierStorage: 'device' }),
      )
    } catch {
      /* ignore */
    }
  }, LANGUAGE_KEY)

  const page = await context.newPage({ viewport: VIEWPORT })
  page.setDefaultTimeout(45_000)
  return page
}

async function login(page) {
  const email = process.env.HOMEPAGE_SCREENSHOT_EMAIL
  const password = process.env.HOMEPAGE_SCREENSHOT_PASSWORD
  if (!email || !password) return false

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(
    (url) => !url.pathname.startsWith('/login'),
    { timeout: 60_000 },
  )
  await sleep(1500)
  return true
}

async function seedDemoPatient(page) {
  await page.goto(`${BASE}/dev/demo-patient`, { waitUntil: 'networkidle' })
  const installBtn = page.getByRole('button', { name: 'Install / Reinstall' })
  await installBtn.waitFor({ state: 'visible' })
  await installBtn.click()
  await page.locator('.demo-dev-msg--ok').waitFor({ state: 'visible', timeout: 120_000 })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await sleep(2500)
}

async function clickSidebarTab(page, area) {
  const link = page.locator(`.case-sidebar-nav__link[data-area="${area}"]`).first()
  await link.waitFor({ state: 'visible', timeout: 60_000 })
  await link.click()
  await sleep(800)
}

async function assertNikolaosVisible(page) {
  await page
    .locator('body')
    .filter({ hasText: 'Nikolaos Demo' })
    .waitFor({ state: 'visible', timeout: 60_000 })
  check('Nikolaos Demo visible in UI', (await page.locator('body').innerText()).includes('Nikolaos Demo'))
}

async function capture(page, filename) {
  const outPath = resolve(OUTPUT_DIR, filename)
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`  → wrote ${outPath}`)
}

async function openCase(page) {
  await page.goto(`${BASE}${CASE_PATH}`, { waitUntil: 'networkidle' })
  await page.locator('.case-sidebar-nav').first().waitFor({ state: 'visible', timeout: 60_000 })
  await sleep(2000)
  await assertNikolaosVisible(page)
}

async function captureIntelligence(page) {
  await openCase(page)
  await clickSidebarTab(page, 'ci')
  await page.locator('.ci-panel').first().waitFor({ state: 'visible' })
  await sleep(1200)
  await capture(page, 'demo-intelligence.png')
}

async function dismissBlockingModals(page) {
  const onboarding = page.locator('.identifier-onboarding-backdrop')
  if (await onboarding.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Save selection|Auswahl speichern/i }).click()
    await onboarding.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})
  }
}

async function captureKnowledgeBase(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await dismissBlockingModals(page)
  await page.locator('.dashboard-nav-card--kb').click()
  await page.locator('.kb-overlay').waitFor({ state: 'visible' })
  await page
    .locator('.kb-collection-tile__main')
    .filter({ hasText: /Psychopharmacology|Psychopharmakologie/i })
    .click()
  await page.locator('.kb-classified-drug__name', { hasText: /Aripiprazole|Aripiprazol/i }).first().click()
  await page.locator('.kbp-drug-header__name').waitFor({ state: 'visible' })
  await sleep(800)
  await capture(page, 'demo-knowledge-base.png')
}

async function captureDiscuss(page) {
  await openCase(page)
  await clickSidebarTab(page, 'discuss')
  await page.waitForSelector(
    '.discuss-case-view, .discuss-case-card__open, .discuss-case-hero__cta',
    { timeout: 60_000 },
  )

  if (await page.locator('.discuss-case-view').isVisible()) {
    await sleep(1000)
    await capture(page, 'demo-discuss.png')
    return
  }

  const existing = page.locator('.discuss-case-card__open').first()
  if (await existing.isVisible()) {
    await existing.click()
    await page.locator('.discuss-case-view').waitFor({ state: 'visible' })
    await sleep(1000)
    await capture(page, 'demo-discuss.png')
    return
  }

  await page.getByRole('button', { name: /New discussion|Neue Besprechung/i }).click()
  await page.locator('.discuss-case-builder').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /Preview|Vorschau/i }).click()
  await page.getByRole('button', { name: /Save package|Paket speichern/i }).click()
  await page.getByRole('button', { name: /Open discussion|Zur Besprechung/i }).click({ timeout: 120_000 })
  await page.locator('.discuss-case-view').waitFor({ state: 'visible' })
  await sleep(1000)
  await capture(page, 'demo-discuss.png')
}

async function captureLabor(page) {
  await page.goto(`${BASE}${CASE_PATH}?page=visualisation`, { waitUntil: 'networkidle' })
  await page.locator('.notion-lab-canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await sleep(1500)
  await assertNikolaosVisible(page)
  const labSelect = page.locator('.lab-toolbar__select')
  const prolactinLabel =
    (await labSelect.locator('option').allTextContents()).find((t) => /prolactin|prolaktin/i.test(t)) ??
    'Prolactin'
  await labSelect.selectOption({ label: prolactinLabel })
  await page.locator('.notion-lab-canvas__chart svg').waitFor({ state: 'visible' })
  await sleep(1000)
  await capture(page, 'demo-labor.png')
}

async function captureInteraction(page) {
  await openCase(page)
  await clickSidebarTab(page, 'medikation')
  await page.locator('.med-section-nav__link', { hasText: /Combination check|Kombinations-Check/i }).click()
  await page.locator('.combination-check').first().waitFor({ state: 'visible' })
  await sleep(800)
  await capture(page, 'demo-interaction.png')
}

async function captureIsdm(page) {
  await openCase(page)
  await clickSidebarTab(page, 'diagnose')
  await page.locator('.butterfly-panel').first().waitFor({ state: 'visible' })
  await sleep(1000)
  await capture(page, 'demo-isdm.png')
}

const useAuth = Boolean(
  process.env.HOMEPAGE_SCREENSHOT_EMAIL && process.env.HOMEPAGE_SCREENSHOT_PASSWORD,
)

console.log(`Homepage screenshot capture`)
console.log(`  BASE=${BASE}`)
console.log(`  auth=${useAuth ? 'login' : 'dev no-auth'}`)
console.log(`  discuss=${SKIP_DISCUSS ? 'skip' : 'capture'}`)
console.log(`  output=${OUTPUT_DIR}`)

startDevStack(useAuth)

const browser = await chromium.launch()
try {
  const ok = await waitForServer(`${BASE}/`)
  if (!ok) throw new Error(`Dev server never became reachable at ${BASE}`)

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  })
  const page = await preparePage(context, useAuth)

  if (useAuth) {
    check('login succeeded', await login(page))
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
    await sleep(3000)
  } else {
    await seedDemoPatient(page)
  }

  await captureIntelligence(page)
  await captureKnowledgeBase(page)
  if (!SKIP_DISCUSS) {
    try {
      await captureDiscuss(page)
    } catch (err) {
      check(
        `discuss capture (${err instanceof Error ? err.message : String(err)})`,
        false,
      )
    }
  } else {
    console.log('SKIP — demo-discuss.png (set HOMEPAGE_SCREENSHOT_EMAIL/PASSWORD to capture)')
  }
  await captureLabor(page)
  await captureInteraction(page)
  await captureIsdm(page)
} finally {
  await browser.close()
  stopDevStack()
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n - ${failures.join('\n - ')}`)
  process.exit(1)
}

console.log('\nAll homepage demo screenshots captured.')
