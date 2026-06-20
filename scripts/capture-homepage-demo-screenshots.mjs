#!/usr/bin/env node
/**
 * Capture synthetic demo patient screenshots for the public homepage.
 *
 * Prerequisites:
 *   - Dev server running: npm run dev
 *   - Auth: set DEMO_SCREENSHOT_EMAIL + DEMO_SCREENSHOT_PASSWORD in .env.local
 *
 * Usage:
 *   npx playwright install chromium   # first time only
 *   node scripts/capture-homepage-demo-screenshots.mjs
 */

import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'public/homepage')
const BASE_URL = process.env.DEMO_SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:5173'
const CASE_ID = 'DEMO-CASE-0001'
const VIEWPORT = { width: 1440, height: 900 }

function loadEnvLocal() {
  const path = resolve(ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const email = process.env.DEMO_SCREENSHOT_EMAIL?.trim() ?? 'demo-screenshots@butterflyproject.eu'
const password = process.env.DEMO_SCREENSHOT_PASSWORD?.trim() ?? 'DemoScreenshot!2026'

async function ensureSupabaseSession(page) {
  const url = process.env.VITE_SUPABASE_URL?.trim()
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required in .env.local for screenshot auth.')
  }

  async function signInWithPassword() {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    const body = await response.json().catch(() => ({}))
    return { ok: response.ok, body }
  }

  async function ensureConfirmedUser() {
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!serviceRole) return false

    const listResponse = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    })
    const listBody = await listResponse.json().catch(() => ({}))
    const existing = listBody?.users?.[0]

    if (existing?.id) {
      await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_confirm: true, password }),
      })
      return true
    }

    const createResponse = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    return createResponse.ok
  }

  let auth = await signInWithPassword()
  if (!auth.ok) {
    await ensureConfirmedUser()
    auth = await signInWithPassword()
  }
  if (!auth.ok || !auth.body?.access_token) {
    throw new Error(`Supabase sign-in failed: ${auth.body?.error_description ?? auth.body?.msg ?? 'no token'}`)
  }

  const projectRef = new URL(url).hostname.split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`
  const sessionPayload = JSON.stringify({
    access_token: auth.body.access_token,
    refresh_token: auth.body.refresh_token,
    expires_at: auth.body.expires_at,
    expires_in: auth.body.expires_in,
    token_type: auth.body.token_type,
    user: auth.body.user,
  })

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value)
    },
    { key: storageKey, value: sessionPayload },
  )
  await page.reload({ waitUntil: 'networkidle' })
}

async function dismissOnboardingModals(page) {
  await page.evaluate(() => {
    localStorage.setItem('psychiatry-ink:identifier-storage-acknowledged', 'true')
  })
  const confirm = page.locator('.identifier-onboarding-dialog__actions .landing-btn--primary')
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click()
    await page.waitForTimeout(500)
  }
}

async function loginIfNeeded(page) {
  await ensureSupabaseSession(page)
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissOnboardingModals(page)
  if (page.url().includes('/login')) {
    throw new Error('Auth session injection failed — still redirected to login.')
  }
}

async function hideClutter(page) {
  await page.addStyleTag({
    content: `
      .demo-readonly-banner { opacity: 0.95; }
      .ask-butterfly-fab, .dictation-strip, .dev-only-badge { display: none !important; }
    `,
  })
}

async function ensureDemoSeeded(page) {
  await page.goto(`${BASE_URL}/dev/demo-patient`, { waitUntil: 'networkidle', timeout: 120_000 })
  const resetBtn = page.getByRole('button', { name: /reset demo patient/i })
  if (await resetBtn.isVisible().catch(() => false)) {
    await resetBtn.click()
    await page.waitForTimeout(2000)
  } else {
    const installBtn = page.getByRole('button', { name: /install demo patient|ensure demo/i })
    if (await installBtn.isVisible().catch(() => false)) {
      await installBtn.click()
      await page.waitForTimeout(2000)
    }
  }
}

async function openCaseTab(page, areaId) {
  const tab = page.locator(`.case-sidebar-nav__link[data-area="${areaId}"]`)
  await tab.first().click({ timeout: 30_000 })
  await page.waitForTimeout(1200)
}

async function capture(page, filename) {
  mkdirSync(OUT_DIR, { recursive: true })
  const path = resolve(OUT_DIR, filename)
  await page.screenshot({ path, fullPage: false })
  console.log(`Saved ${path}`)
}

async function captureClinicalIntelligence(page, caseBase) {
  await page.goto(caseBase, { waitUntil: 'networkidle', timeout: 120_000 })
  await openCaseTab(page, 'ci')
  await page.waitForSelector('.ci-panel', { timeout: 30_000 })
  await page.waitForTimeout(1500)
  await capture(page, 'demo-intelligence.png')
}

async function captureKnowledgeBase(page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissOnboardingModals(page)
  const kbTile = page.locator('.dashboard-kb-tile, [class*="kb-tile"]').first()
  const kbButton = page.getByRole('button', { name: /knowledge base|wissensdatenbank|kb/i }).first()
  if (await kbButton.isVisible().catch(() => false)) {
    await kbButton.click()
  } else if (await kbTile.isVisible().catch(() => false)) {
    await kbTile.click()
  } else {
    await page.locator('text=Wissensdatenbank').first().click({ timeout: 15_000 })
  }
  await page.waitForTimeout(1000)
  const psychCollection = page.getByRole('button', { name: /psychopharm|medication|arzneimittel/i }).first()
  if (await psychCollection.isVisible().catch(() => false)) {
    await psychCollection.click()
    await page.waitForTimeout(1000)
  }
  const aripiprazole = page.getByText(/aripiprazole|aripiprazol/i).first()
  if (await aripiprazole.isVisible().catch(() => false)) {
    await aripiprazole.click()
    await page.waitForTimeout(1500)
    const receptorNav = page.locator('#kb-receptor-profile, [id*="rezeptor"], text=/receptor/i').first()
    if (await receptorNav.isVisible().catch(() => false)) {
      await receptorNav.click().catch(() => {})
      await page.waitForTimeout(800)
    }
  }
  await capture(page, 'demo-knowledge-base.png')
}

async function captureDiscuss(page, caseBase) {
  await page.goto(`${caseBase}/discuss`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.waitForTimeout(1500)
  const sidebarItem = page.locator('.discuss-section-nav__item').first()
  if (await sidebarItem.isVisible().catch(() => false)) {
    await sidebarItem.click()
    await page.waitForTimeout(2000)
  } else {
    const heroCta = page.locator('.discuss-case-hero__cta').first()
    if (await heroCta.isVisible().catch(() => false)) {
      await heroCta.click()
      await page.waitForTimeout(1000)
      const continueBtn = page.getByRole('button', { name: /^preview$|^vorschau$|^weiter$|^continue$/i }).first()
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click()
        await page.waitForTimeout(1000)
      }
    }
  }
  await capture(page, 'demo-discuss.png')
}

async function captureLabor(page, caseBase) {
  await page.goto(`${caseBase}?view=overview`, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.waitForTimeout(1500)
  const labWidget = page.locator('.overview-lab-graph, .lab-graph, [class*="lab-graph"]').first()
  if (await labWidget.isVisible().catch(() => false)) {
    await labWidget.scrollIntoViewIfNeeded()
  } else {
    await openCaseTab(page, 'labor')
  }
  await page.waitForTimeout(1500)
  await capture(page, 'demo-labor.png')
}

async function captureInteraction(page, caseBase) {
  await page.goto(caseBase, { waitUntil: 'networkidle', timeout: 120_000 })
  await openCaseTab(page, 'medikation')
  await page.waitForTimeout(1000)
  const comboSection = page.locator('.combination-check-panel, .interaction-matrix, text=/interaction|wechselwirkung/i').first()
  if (await comboSection.isVisible().catch(() => false)) {
    await comboSection.scrollIntoViewIfNeeded()
  }
  await page.waitForTimeout(1500)
  await capture(page, 'demo-interaction.png')
}

async function captureIsdm(page, caseBase) {
  await page.goto(caseBase, { waitUntil: 'networkidle', timeout: 120_000 })
  await openCaseTab(page, 'diagnose')
  await page.waitForTimeout(1000)
  const isdmPanel = page.locator('.isdm-analysis-panel, .isdm-panel, [class*="isdm"]').first()
  if (await isdmPanel.isVisible().catch(() => false)) {
    await isdmPanel.scrollIntoViewIfNeeded()
  }
  await page.waitForTimeout(1500)
  await capture(page, 'demo-isdm.png')
}

async function main() {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  const page = await context.newPage()

  try {
    await loginIfNeeded(page)
    await ensureDemoSeeded(page)
    await hideClutter(page)

    const caseBase = `${BASE_URL}/case/${encodeURIComponent(CASE_ID)}`

    await captureClinicalIntelligence(page, caseBase)
    await captureKnowledgeBase(page)
    await captureDiscuss(page, caseBase)
    await captureLabor(page, caseBase)
    await captureInteraction(page, caseBase)
    await captureIsdm(page, caseBase)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
