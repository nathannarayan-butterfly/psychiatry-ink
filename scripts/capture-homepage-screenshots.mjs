/**
 * Automated homepage demo screenshots — locale-specific capture.
 *
 * Captures a full single-language panel set for BOTH landing locales:
 *   • English UI  → Marcus Demo (DEMO-CASE-EN-0001) → public/homepage/en/*.png
 *   • German UI   → Thomas Demo (DEMO-CASE-DE-0001) → public/homepage/de/*.png
 *
 * The landing content wires each locale at its own folder
 * (`content.en.ts` → /homepage/en/…, `content.de.ts` → /homepage/de/…,
 * ES/FR → the English set) so a German page never shows English UI and an
 * English page never shows German UI. Idempotent: re-running overwrites the
 * same files.
 *
 * Viewport: 1440×900 logical pixels at 2× device scale → 2880×1800 PNG output.
 * The homepage frames use `aspect-ratio: 16/10; object-fit: cover`, so a
 * 1440×900 (16:10) capture fills every frame with no cropping.
 *
 * Strategy
 * ─────────
 * 1. Start local dev (Vite + API) OR reuse an existing server via BASE.
 * 2. Default (no login credentials): Vite runs with Supabase env cleared so the
 *    app uses the dev no-auth entry; the corrected, locale-split bundled demo
 *    fixtures (Marcus EN / Thomas DE, seed v9 — German leak fixed) are seeded
 *    via /dev/demo-patient. KB drug profiles come from the bundled
 *    `KB_DRUG_SEED_DATA` and are localized by UI language.
 * 3. With HOMEPAGE_SCREENSHOT_EMAIL + HOMEPAGE_SCREENSHOT_PASSWORD: keep Supabase
 *    config and log in instead of seeding locally.
 *
 * Environment
 * ───────────
 *   BASE                         Reuse server (e.g. http://localhost:5199)
 *   PORT                         Vite port when spawning (default 5199)
 *   API_PORT                     API port when spawning (default 3001, Vite proxy)
 *   HOMEPAGE_SCREENSHOT_EMAIL    Optional Supabase login (skips local seeding)
 *   HOMEPAGE_SCREENSHOT_PASSWORD Optional Supabase login
 *   HOMEPAGE_SCREENSHOT_LOCALES  Comma list to restrict locales (default "en,de")
 *   SKIP_DEV_SERVER=1            Require BASE; do not spawn dev processes
 *
 * Usage
 * ─────
 *   npm run homepage:screenshots
 *   BASE=http://localhost:5173 npm run homepage:screenshots
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const ROOT = resolve(import.meta.dirname, '..')
const PUBLIC_HOMEPAGE_DIR = resolve(ROOT, 'public/homepage')
const VIEWPORT = { width: 1440, height: 900 }
const DEVICE_SCALE_FACTOR = 2
const LANGUAGE_KEY = 'psychiatry-ink-language'

/** Per-locale capture targets — matches src/demo/constants.ts. */
const LOCALE_CONFIG = {
  en: { caseId: 'DEMO-CASE-EN-0001', displayName: 'Marcus Demo', outputDir: resolve(PUBLIC_HOMEPAGE_DIR, 'en') },
  de: { caseId: 'DEMO-CASE-DE-0001', displayName: 'Thomas Demo', outputDir: resolve(PUBLIC_HOMEPAGE_DIR, 'de') },
}

const LOCALES = (process.env.HOMEPAGE_SCREENSHOT_LOCALES ?? 'en,de')
  .split(',')
  .map((l) => l.trim())
  .filter((l) => l in LOCALE_CONFIG)

const WEB_PORT = Number(process.env.PORT ?? 5199)
const API_PORT = Number(process.env.API_PORT ?? 3001)
const EXTERNAL_BASE = process.env.BASE?.replace(/\/+$/, '')
const BASE = EXTERNAL_BASE ?? `http://localhost:${WEB_PORT}`
const SKIP_DEV_SERVER = process.env.SKIP_DEV_SERVER === '1'

loadEnvFiles()

const useAuth = Boolean(
  process.env.HOMEPAGE_SCREENSHOT_EMAIL && process.env.HOMEPAGE_SCREENSHOT_PASSWORD,
)

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

function devWebEnv() {
  const env = { ...process.env, NODE_ENV: 'development' }
  return useAuth ? env : stripSupabaseEnv(env)
}

function devServerEnv() {
  return {
    ...(useAuth ? process.env : stripSupabaseEnv(process.env)),
    NODE_ENV: 'development',
    ENABLE_DEV_AUTH_BYPASS: 'true',
    API_PORT: String(API_PORT),
    PORT: String(API_PORT),
  }
}

async function waitForServer(url, attempts = 120) {
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

function startDevStack() {
  if (SKIP_DEV_SERVER || EXTERNAL_BASE) return

  apiProc = spawn('npm', ['run', 'dev:server'], {
    stdio: 'ignore',
    detached: true,
    cwd: ROOT,
    env: devServerEnv(),
  })

  viteProc = spawn(
    'npm',
    ['run', 'dev:web', '--', '--port', String(WEB_PORT), '--strictPort'],
    {
      stdio: 'ignore',
      detached: true,
      cwd: ROOT,
      env: devWebEnv(),
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

async function preparePage(context, lang) {
  if (!useAuth) {
    await context.route('**/app-config.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: 'window.__APP_CONFIG__ = Object.freeze({ supabaseUrl: "", supabaseAnonKey: "" });',
      }),
    )
  }

  await context.addInitScript(
    ({ langKey, lang }) => {
      try {
        localStorage.setItem(langKey, lang)
        localStorage.setItem('psychiatry-ink:identifier-storage-acknowledged', 'true')
        localStorage.setItem(
          'psychiatry-ink-privacy',
          JSON.stringify({ countryCode: 'DE', identifierStorage: 'device' }),
        )
      } catch {
        /* ignore */
      }

      // Suppress transient notification toasts (e.g. the AI-extraction error
      // toast that fires in the no-backend demo) so marketing screenshots stay
      // clean and never capture a stray error banner.
      const hideToastsCss =
        '.notion-toast-host,.version-toast{display:none !important;visibility:hidden !important;}'
      const injectToastStyle = () => {
        if (!document.head || document.getElementById('capture-hide-toasts')) return
        const style = document.createElement('style')
        style.id = 'capture-hide-toasts'
        style.textContent = hideToastsCss
        document.head.appendChild(style)
      }
      if (document.head) injectToastStyle()
      else document.addEventListener('DOMContentLoaded', injectToastStyle)
    },
    { langKey: LANGUAGE_KEY, lang },
  )

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
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })
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

async function dismissBlockingModals(page) {
  const onboarding = page.locator('.identifier-onboarding-backdrop')
  if (await onboarding.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Save selection|Auswahl speichern/i }).click()
    await onboarding.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {})
  }
}

function makeCtx(locale) {
  const cfg = LOCALE_CONFIG[locale]
  mkdirSync(cfg.outputDir, { recursive: true })
  return {
    locale,
    caseId: cfg.caseId,
    displayName: cfg.displayName,
    outputDir: cfg.outputDir,
    casePath: `/case/${encodeURIComponent(cfg.caseId)}`,
  }
}

async function capture(page, ctx, filename) {
  const outPath = resolve(ctx.outputDir, filename)
  await page.screenshot({ path: outPath, fullPage: false })
  console.log(`  → wrote ${outPath}`)
}

async function assertDemoPatientVisible(page, ctx, label) {
  await page
    .locator('body')
    .filter({ hasText: ctx.displayName })
    .first()
    .waitFor({ state: 'visible', timeout: 60_000 })
  check(
    `[${ctx.locale}] ${ctx.displayName} visible (${label})`,
    (await page.locator('body').innerText()).includes(ctx.displayName),
  )
}

async function openCase(page, ctx) {
  await page.goto(`${BASE}${ctx.casePath}`, { waitUntil: 'networkidle' })
  await page.locator('.case-sidebar-nav').first().waitFor({ state: 'visible', timeout: 60_000 })
  await sleep(2000)
  await dismissBlockingModals(page)
  await assertDemoPatientVisible(page, ctx, 'case')
}

async function captureOverview(page, ctx) {
  await openCase(page, ctx)
  await clickSidebarTab(page, 'overview')
  await sleep(1200)
  await capture(page, ctx, 'demo-overview.png')
}

async function captureIntelligence(page, ctx) {
  await openCase(page, ctx)
  await clickSidebarTab(page, 'ci')
  await page.locator('.ci-panel').first().waitFor({ state: 'visible' })
  await sleep(1200)
  await capture(page, ctx, 'demo-intelligence.png')
}

async function captureKnowledgeBase(page, ctx) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await dismissBlockingModals(page)
  await page.locator('.dashboard-nav-card--kb').click()
  await page.locator('.kb-overlay').waitFor({ state: 'visible' })
  await page
    .locator('.kb-collection-tile__main')
    .filter({ hasText: /Psychopharmacology|Psychopharmakologie/i })
    .click()
  await page
    .locator('.kb-classified-drug__name', { hasText: /Aripiprazole|Aripiprazol/i })
    .first()
    .click()
  await page.locator('.kbp-drug-header__name').waitFor({ state: 'visible' })
  await sleep(800)
  await capture(page, ctx, 'demo-knowledge-base.png')
}

async function captureDiscuss(page, ctx) {
  await openCase(page, ctx)
  await clickSidebarTab(page, 'discuss')
  await page.waitForSelector(
    '.discuss-case-view, .discuss-case-card__open, .discuss-case-hero__cta, .discuss-case-builder',
    { timeout: 60_000 },
  )

  // A persisted, server-backed discussion (auth mode) is preferred.
  if (await page.locator('.discuss-case-view').isVisible().catch(() => false)) {
    await sleep(1000)
    await capture(page, ctx, 'demo-discuss.png')
    return
  }
  const existing = page.locator('.discuss-case-card__open').first()
  if (await existing.isVisible().catch(() => false)) {
    await existing.click()
    await page.locator('.discuss-case-view').waitFor({ state: 'visible' })
    await sleep(1000)
    await capture(page, ctx, 'demo-discuss.png')
    return
  }

  // No-auth / fresh: open the package builder and preview the curated package.
  if (!(await page.locator('.discuss-case-builder').isVisible().catch(() => false))) {
    const newBtn = page.getByRole('button', { name: /New discussion|Neue Besprechung/i }).first()
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click()
    }
  }
  await page.locator('.discuss-case-builder').waitFor({ state: 'visible', timeout: 60_000 })
  const previewBtn = page.getByRole('button', { name: /Preview|Vorschau/i }).first()
  if (await previewBtn.isVisible().catch(() => false)) {
    await previewBtn.click()
    await sleep(1200)
  }
  await capture(page, ctx, 'demo-discuss.png')
}

async function captureLabor(page, ctx) {
  await page.goto(`${BASE}${ctx.casePath}?page=visualisation`, { waitUntil: 'networkidle' })
  await page.locator('.notion-lab-canvas').waitFor({ state: 'visible', timeout: 60_000 })
  await sleep(1500)
  await dismissBlockingModals(page)
  await assertDemoPatientVisible(page, ctx, 'labor')
  const labSelect = page.locator('.lab-toolbar__select')
  const prolactinLabel =
    (await labSelect.locator('option').allTextContents()).find((t) => /prolactin|prolaktin/i.test(t)) ??
    'Prolactin'
  await labSelect.selectOption({ label: prolactinLabel })
  await page.locator('.notion-lab-canvas__chart svg').waitFor({ state: 'visible' })
  await sleep(1000)
  await capture(page, ctx, 'demo-labor.png')
}

async function captureInteraction(page, ctx) {
  await openCase(page, ctx)
  await clickSidebarTab(page, 'medikation')
  await page
    .locator('.med-section-nav__link', { hasText: /Combination check|Kombinations-Check/i })
    .click()
  await page.locator('.combination-check').first().waitFor({ state: 'visible' })
  await sleep(800)
  await capture(page, ctx, 'demo-interaction.png')
}

async function captureIsdm(page, ctx) {
  await openCase(page, ctx)
  await clickSidebarTab(page, 'diagnose')
  await page.locator('.butterfly-panel').first().waitFor({ state: 'visible' })
  await sleep(1000)
  await capture(page, ctx, 'demo-isdm.png')
}

async function captureLocale(browser, locale) {
  const ctx = makeCtx(locale)
  console.log(`\n=== Capturing ${locale.toUpperCase()} → ${ctx.outputDir} ===`)

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  })
  try {
    const page = await preparePage(context, locale)

    if (useAuth) {
      check(`[${locale}] login succeeded`, await login(page))
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
      await sleep(3000)
    } else {
      await seedDemoPatient(page)
    }

    const steps = [
      ['overview', captureOverview],
      ['intelligence', captureIntelligence],
      ['knowledge-base', captureKnowledgeBase],
      ['discuss', captureDiscuss],
      ['labor', captureLabor],
      ['interaction', captureInteraction],
      ['isdm', captureIsdm],
    ]
    for (const [name, fn] of steps) {
      try {
        await fn(page, ctx)
      } catch (err) {
        check(
          `[${locale}] ${name} capture (${err instanceof Error ? err.message : String(err)})`,
          false,
        )
      }
    }
  } finally {
    await context.close()
  }
}

console.log('Homepage screenshot capture (locale-specific)')
console.log(`  BASE=${BASE}`)
console.log(`  auth=${useAuth ? 'login' : 'dev no-auth (bundled fixtures)'}`)
console.log(`  locales=${LOCALES.join(', ')}`)

startDevStack()

const browser = await chromium.launch()
try {
  const ok = await waitForServer(`${BASE}/`)
  if (!ok) throw new Error(`Dev server never became reachable at ${BASE}`)

  for (const locale of LOCALES) {
    await captureLocale(browser, locale)
  }
} finally {
  await browser.close()
  stopDevStack()
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n - ${failures.join('\n - ')}`)
  process.exit(1)
}

console.log('\nAll homepage demo screenshots captured.')
