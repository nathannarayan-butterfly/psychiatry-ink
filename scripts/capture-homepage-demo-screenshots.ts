/**
 * Capture homepage demo PNGs (1440×900) with German UI and Nikolaos Demo case.
 * Usage: npm run dev (in another terminal), then:
 *   npx tsx scripts/capture-homepage-demo-screenshots.ts
 */
import { chromium, type Page } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })
loadEnv({ path: resolve(process.cwd(), '.env') })

const BASE_URL = process.env.HOMEPAGE_SCREENSHOT_BASE_URL ?? 'http://localhost:5173'
const OUT_DIR = resolve(process.cwd(), 'public/homepage')
const VIEWPORT = { width: 1440, height: 900 }
const DEMO_CASE_ID = 'DEMO-CASE-0001'
const ONLY = process.env.HOMEPAGE_SCREENSHOT_ONLY?.trim()
const SCREENSHOT_EMAIL =
  process.env.HOMEPAGE_SCREENSHOT_EMAIL ?? 'homepage-screenshots@psychiatry.ink.internal'
const SCREENSHOT_PASSWORD =
  process.env.HOMEPAGE_SCREENSHOT_PASSWORD ?? 'HomepageScreenshot!2026'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type SupabaseSession = {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
  token_type: string
  user: Record<string, unknown>
}

async function supabaseAdminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey!,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Supabase admin ${path} failed (${res.status}): ${JSON.stringify(body)}`)
  }
  return body
}

async function ensureScreenshotUser(): Promise<void> {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  const listed = await supabaseAdminFetch('/auth/v1/admin/users?page=1&per_page=200')
  const existing = (listed.users as { id: string; email?: string }[] | undefined)?.find(
    (u) => u.email === SCREENSHOT_EMAIL,
  )
  if (existing) {
    await supabaseAdminFetch(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        password: SCREENSHOT_PASSWORD,
        email_confirm: true,
      }),
    })
    return
  }
  await supabaseAdminFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: SCREENSHOT_EMAIL,
      password: SCREENSHOT_PASSWORD,
      email_confirm: true,
    }),
  })
}

async function signInSession(): Promise<SupabaseSession> {
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase URL or anon key')
  }
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: SCREENSHOT_EMAIL,
      password: SCREENSHOT_PASSWORD,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Supabase sign-in failed (${res.status}): ${JSON.stringify(body)}`)
  }
  return body as SupabaseSession
}

function authStorageKey(): string {
  const ref = new URL(supabaseUrl!).hostname.split('.')[0]
  return `sb-${ref}-auth-token`
}

async function injectSession(page: Page, session: SupabaseSession) {
  const storageKey = authStorageKey()
  await page.addInitScript(
    ({ key, value, language }) => {
      localStorage.setItem(key, JSON.stringify(value))
      localStorage.setItem('psychiatry-ink-language', language)
      localStorage.setItem('psychiatry-ink:identifier-storage-acknowledged', 'true')
      localStorage.setItem(
        'psychiatry-ink-privacy',
        JSON.stringify({ countryCode: 'DE', identifierStorage: 'device' }),
      )
      localStorage.setItem('psychiatry-ink:identifier-storage-mode', 'device')
    },
    {
      key: storageKey,
      value: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      },
      language: 'de',
    },
  )
}

async function dismissBlockingOverlays(page: Page) {
  const onboardingConfirm = page.getByRole('button', { name: /Auswahl speichern|Save my choice/i })
  if (await onboardingConfirm.count()) {
    await onboardingConfirm.first().click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(400)
  }
  const later = page.getByRole('button', { name: /Später|Later/i })
  if (await later.count()) {
    await later.first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(400)
  }
}

async function waitForApp(page: Page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissBlockingOverlays(page)
  await page.waitForSelector('.dashboard-page, .notion-preview-app', { timeout: 120_000 })
}

async function seedDemo(page: Page) {
  await page.goto(`${BASE_URL}/dev/demo-patient`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.getByRole('button', { name: 'Install / Reinstall' }).click()
  await page.waitForSelector('.demo-dev-msg--ok', { timeout: 120_000 })
}

async function openCaseTab(page: Page, tabLabel: string) {
  await page.goto(`${BASE_URL}/case/${encodeURIComponent(DEMO_CASE_ID)}`, {
    waitUntil: 'networkidle',
    timeout: 120_000,
  })
  await dismissBlockingOverlays(page)
  await page.waitForSelector('.case-sidebar-nav, .notion-preview-app', { timeout: 60_000 })
  const nav = page.locator('.case-sidebar-nav')
  await nav.getByRole('button', { name: tabLabel, exact: true }).click()
  await page.waitForTimeout(1200)
}

async function captureCaseScreenshot(page: Page, filename: string, tabLabel: string) {
  await openCaseTab(page, tabLabel)
  await page.waitForSelector('text=Nikolaos Demo', { timeout: 60_000 })
  await page.screenshot({ path: resolve(OUT_DIR, filename), fullPage: false })
}

async function captureDiscuss(page: Page) {
  await page.goto(`${BASE_URL}/case/${encodeURIComponent(DEMO_CASE_ID)}/discuss`, {
    waitUntil: 'networkidle',
    timeout: 120_000,
  })
  await dismissBlockingOverlays(page)
  await page.waitForSelector('text=Nikolaos Demo', { timeout: 60_000 })
  await page.getByRole('button', { name: /Neue Besprechung/i }).first().click()
  await page.waitForSelector('text=DiscussCase — Paket erstellen', { timeout: 60_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: resolve(OUT_DIR, 'demo-discuss.png'), fullPage: false })
}

async function captureKnowledgeBase(page: Page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissBlockingOverlays(page)
  await page.getByRole('button', { name: 'Wissensdatenbank' }).click()
  await page.waitForSelector('.kb-overlay', { timeout: 60_000 })
  await page.getByText('Psychopharmakologie', { exact: false }).first().click()
  await page.waitForTimeout(800)
  await page.getByText('Aripiprazol', { exact: false }).first().click()
  await page.waitForSelector('text=Aripiprazol', { timeout: 60_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: resolve(OUT_DIR, 'demo-knowledge-base.png'), fullPage: false })
}

async function captureLabor(page: Page) {
  await openCaseTab(page, 'Diagnostik')
  const sidebar = page.locator('.diagnostik-befunde-sidebar, .labor-sidebar, .therapy-link-list')
  const firstEntry = sidebar.locator('button, [role="button"], .diagnostik-befunde-sidebar__item').first()
  if (await firstEntry.count()) {
    await firstEntry.click()
    await page.waitForTimeout(600)
  }
  await page.waitForSelector('text=Nikolaos Demo', { timeout: 60_000 })
  await page.screenshot({ path: resolve(OUT_DIR, 'demo-labor.png'), fullPage: false })
}

async function captureMedPlan(page: Page) {
  await openCaseTab(page, 'Medikation')
  await page.waitForSelector('text=Nikolaos Demo', { timeout: 60_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: resolve(OUT_DIR, 'demo-interaction.png'), fullPage: false })
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  await ensureScreenshotUser()
  const session = await signInSession()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'de-DE' })
  const page = await context.newPage()
  await injectSession(page, session)

  try {
    await waitForApp(page)
    if (!ONLY || ONLY !== 'discuss') {
      await seedDemo(page)
    }

    const shots: Record<string, () => Promise<void>> = {
      intelligence: () => captureCaseScreenshot(page, 'demo-intelligence.png', 'Klinische Intelligenz'),
      'knowledge-base': () => captureKnowledgeBase(page),
      discuss: () => captureDiscuss(page),
      labor: () => captureLabor(page),
      interaction: () => captureMedPlan(page),
      isdm: () => captureCaseScreenshot(page, 'demo-isdm.png', 'Diagnose'),
    }

    if (ONLY) {
      const shot = shots[ONLY]
      if (!shot) throw new Error(`Unknown HOMEPAGE_SCREENSHOT_ONLY=${ONLY}`)
      await shot()
    } else {
      for (const shot of Object.values(shots)) {
        await shot()
      }
    }

    console.log('Captured homepage demo screenshots in', OUT_DIR)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
