/**
 * scripts/stripe-webhook-trial-run.ts
 * --------------------------------------------------------------------------
 * Programmatic end-to-end trial run for the Stripe Checkout → webhook →
 * credit-ledger pipeline. Runs against the local dev SQLite database.
 *
 * What it exercises (in order, against the real `aiCreditsWebhookRouter`):
 *
 *   1. Seeds a real AiCreditPurchase row (status = 'pending') so the
 *      webhook has a deterministic `client_reference_id` to join on.
 *   2. Snapshots the user's AiCreditAccount.purchasedCredits BEFORE.
 *   3. Fires a `checkout.session.completed` event (real Stripe-signed
 *      payload constructed via `stripe.webhooks.generateTestHeaderString`)
 *      against a locally-mounted webhook router → expects the row to flip
 *      to 'paid', `purchasedCredits` to increment by the bundle size, and
 *      a `purchase_credit` ledger row to be emitted.
 *   4. Re-fires the SAME event id → expects idempotent no-op (the
 *      ProcessedWebhookEvent dedupe row should short-circuit at the head
 *      of the handler; credits must NOT double-increment).
 *   5. Fires a `charge.refunded` event with metadata.purchaseId pointing at
 *      the same row → expects 'refunded' status, decrement on
 *      purchasedCredits (clamped at 0), and a compensating ledger row.
 *
 * After every step we print the before/after rows so the audit trail is
 * inline with the run.
 *
 * Why this script and not Stripe MCP / stripe CLI:
 *   - The bundled Stripe MCP server is configured with a LIVE key; firing
 *     events through it would create real Stripe activity (already caused
 *     one accidental live product creation, since deactivated).
 *   - The `stripe` CLI is not installed in this environment.
 *   - `stripe.webhooks.generateTestHeaderString` produces the EXACT same
 *     signature the real Stripe webhook signer produces, so the
 *     constructEvent path in the handler is fully exercised.
 *
 * Usage:
 *   npx tsx scripts/stripe-webhook-trial-run.ts
 *
 * The script sets STRIPE_WEBHOOK_SECRET to a deterministic fixture for the
 * duration of its own process (so it can sign events) — it does NOT touch
 * .env.local. The Stripe SDK never makes a network call in this script.
 */

import { randomUUID } from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import Stripe from 'stripe'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envLocalPath = path.resolve(__dirname, '../.env.local')
if (existsSync(envLocalPath)) loadEnv({ path: envLocalPath })

// Use the dev DB unless caller already set DATABASE_URL.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.resolve(__dirname, '../dev.db')}`
}
// Fixture signing secret — only used inside this process. The real
// .env.local STRIPE_WEBHOOK_SECRET (whsec_…) is what `stripe listen`
// produces in real dev/staging.
const TRIAL_WEBHOOK_SECRET = 'whsec_trial_run_fixture_secret'
process.env.STRIPE_WEBHOOK_SECRET = TRIAL_WEBHOOK_SECRET

// Stripe SDK API version must match server/services/stripeClient.ts.
const STRIPE_API_VERSION = '2026-05-27.dahlia' as Stripe.LatestApiVersion

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
if (!stripeSecret) {
  console.error(
    '✗ STRIPE_SECRET_KEY missing. Add it to .env.local (test mode, sk_test_…) before running the trial.',
  )
  process.exit(1)
}

// We do not make Stripe API calls — but constructing a Stripe instance is
// the cleanest way to call `webhooks.generateTestHeaderString` and
// `webhooks.constructEvent` consistently.
const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION })

const { prisma } = await import('../server/db')
const { aiCreditsWebhookRouter } = await import('../server/routes/aiCreditsWebhook')

interface PurchaseSnapshot {
  purchase: { id: string; status: string; externalRef: string | null; credits: number } | null
  account: { id: string; purchasedCredits: number; monthlyCredits: number } | null
  ledger: Array<{ id: string; type: string; bucket: string | null; credits: number; note: string | null }>
  processedEvents: number
}

async function snapshot(userId: string, purchaseId: string): Promise<PurchaseSnapshot> {
  const purchase = await prisma.aiCreditPurchase.findUnique({ where: { id: purchaseId } })
  const account = await prisma.aiCreditAccount.findUnique({ where: { userId } })
  const ledger = account
    ? await prisma.aiCreditLedger.findMany({
        where: { accountId: account.id, note: { contains: purchaseId } },
        orderBy: { createdAt: 'asc' },
      })
    : []
  const processedEvents = await prisma.processedWebhookEvent.count()
  return {
    purchase: purchase
      ? {
          id: purchase.id,
          status: purchase.status,
          externalRef: purchase.externalRef,
          credits: purchase.credits,
        }
      : null,
    account: account
      ? {
          id: account.id,
          purchasedCredits: account.purchasedCredits,
          monthlyCredits: account.monthlyCredits,
        }
      : null,
    ledger: ledger.map((row) => ({
      id: row.id,
      type: row.type,
      bucket: row.bucket,
      credits: row.credits,
      note: row.note,
    })),
    processedEvents,
  }
}

function printSnapshot(label: string, snap: PurchaseSnapshot): void {
  console.log(`\n──── ${label} ────`)
  console.log(JSON.stringify(snap, null, 2))
}

function signedRequest(payload: object): { body: string; signature: string } {
  const body = JSON.stringify(payload)
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: TRIAL_WEBHOOK_SECRET,
  })
  return { body, signature }
}

async function postEvent(
  baseUrl: string,
  payload: object,
): Promise<{ status: number; body: unknown }> {
  const { body, signature } = signedRequest(payload)
  const res = await fetch(`${baseUrl}/api/ai-credits/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body,
  })
  let parsed: unknown = null
  const text = await res.text()
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }
  return { status: res.status, body: parsed }
}

async function ensureUser(userId: string): Promise<void> {
  await prisma.aiCreditAccount
    .upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        monthlyCredits: 500,
        purchasedCredits: 0,
        monthlyResetAt: nextMonthlyReset(),
      },
    })
    .catch(() => {
      // Older schemas without account upsert support fail gracefully — the
      // webhook handler will create the account row on first credit.
    })
}

function nextMonthlyReset(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

async function seedBundleAndPurchase(userId: string, sku: string, credits: number, priceGbp: number): Promise<string> {
  const bundle = await prisma.aiCreditBundle.upsert({
    where: { sku },
    update: { credits, priceGbp: priceGbp.toFixed(2), active: true },
    create: { sku, credits, priceGbp: priceGbp.toFixed(2), active: true },
  })
  const purchase = await prisma.aiCreditPurchase.create({
    data: {
      userId,
      bundleId: bundle.id,
      credits,
      priceGbp: priceGbp.toFixed(2),
      status: 'pending',
    },
  })
  return purchase.id
}

async function cleanupTrialArtifacts(userId: string, purchaseId: string): Promise<void> {
  const account = await prisma.aiCreditAccount.findUnique({ where: { userId } })
  if (account) {
    await prisma.aiCreditLedger.deleteMany({
      where: { accountId: account.id, note: { contains: purchaseId } },
    })
    await prisma.aiCreditAccount.delete({ where: { userId } }).catch(() => undefined)
  }
  await prisma.aiCreditPurchase
    .delete({ where: { id: purchaseId } })
    .catch(() => undefined)
  await prisma.processedWebhookEvent
    .deleteMany({ where: { eventId: { startsWith: 'evt_trial_' } } })
    .catch(() => undefined)
}

async function main(): Promise<void> {
  const app = express()
  app.use(
    '/api/ai-credits/webhook',
    express.raw({ type: 'application/json' }),
    aiCreditsWebhookRouter,
  )
  const server = app.listen(0)
  const port = (server.address() as { port: number }).port
  const baseUrl = `http://127.0.0.1:${port}`

  const userId = `trial_user_${randomUUID().slice(0, 8)}`
  const sessionId = `cs_test_trial_${randomUUID().slice(0, 8)}`
  const eventId = `evt_trial_${randomUUID().slice(0, 8)}`
  const refundEventId = `evt_trial_refund_${randomUUID().slice(0, 8)}`

  let purchaseId: string | null = null
  try {
    console.log('▶ Seeding fixture user, bundle, and pending purchase…')
    await ensureUser(userId)
    purchaseId = await seedBundleAndPurchase(userId, 'credits-250', 250, 9.99)
    await prisma.aiCreditPurchase.update({
      where: { id: purchaseId },
      data: { externalRef: sessionId },
    })
    console.log(`  userId      = ${userId}`)
    console.log(`  purchaseId  = ${purchaseId}`)
    console.log(`  sessionId   = ${sessionId}`)
    console.log(`  webhookPort = ${port}`)

    const before = await snapshot(userId, purchaseId)
    printSnapshot('BEFORE — pending purchase, no credits applied', before)

    // ── Step 1: fire checkout.session.completed ────────────────────────
    console.log('\n▶ Step 1: POST checkout.session.completed (signed)')
    const completedEvent = {
      id: eventId,
      object: 'event',
      api_version: STRIPE_API_VERSION,
      created: Math.floor(Date.now() / 1000),
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          mode: 'payment',
          payment_status: 'paid',
          client_reference_id: purchaseId,
          metadata: {
            purchaseId,
            userId,
            bundleSku: 'credits-250',
            credits: '250',
          },
          amount_total: 999,
          currency: 'gbp',
        },
      },
    }
    const r1 = await postEvent(baseUrl, completedEvent)
    console.log(`  → status=${r1.status} body=${JSON.stringify(r1.body)}`)
    const afterPaid = await snapshot(userId, purchaseId)
    printSnapshot('AFTER  — checkout.session.completed', afterPaid)
    assert(afterPaid.purchase?.status === 'paid', 'expected purchase.status to be "paid"')
    assert(
      (afterPaid.account?.purchasedCredits ?? 0) - (before.account?.purchasedCredits ?? 0) === 250,
      'expected purchasedCredits to increase by 250',
    )
    assert(
      afterPaid.ledger.some((l) => l.type === 'purchase_credit' && l.credits === 250),
      'expected a purchase_credit ledger row of +250',
    )

    // ── Step 2: idempotent re-delivery ─────────────────────────────────
    console.log('\n▶ Step 2: POST checkout.session.completed AGAIN (same event id → dedupe)')
    const r2 = await postEvent(baseUrl, completedEvent)
    console.log(`  → status=${r2.status} body=${JSON.stringify(r2.body)}`)
    const afterDup = await snapshot(userId, purchaseId)
    printSnapshot('AFTER  — duplicate delivery (no double-credit)', afterDup)
    assert(
      afterDup.account?.purchasedCredits === afterPaid.account?.purchasedCredits,
      'duplicate delivery must NOT double-credit',
    )
    assert(
      afterDup.ledger.length === afterPaid.ledger.length,
      'duplicate delivery must NOT add a second ledger row',
    )
    assert(
      typeof r2.body === 'object' && r2.body !== null && (r2.body as { duplicate?: boolean }).duplicate === true,
      'duplicate delivery must report { duplicate: true }',
    )

    // ── Step 3: fire charge.refunded ───────────────────────────────────
    console.log('\n▶ Step 3: POST charge.refunded for the paid purchase')
    const refundEvent = {
      id: refundEventId,
      object: 'event',
      api_version: STRIPE_API_VERSION,
      created: Math.floor(Date.now() / 1000),
      type: 'charge.refunded',
      livemode: false,
      data: {
        object: {
          id: `ch_test_trial_${randomUUID().slice(0, 8)}`,
          object: 'charge',
          amount: 999,
          amount_refunded: 999,
          currency: 'gbp',
          metadata: { purchaseId },
          payment_intent: `pi_test_trial_${randomUUID().slice(0, 8)}`,
          status: 'succeeded',
        },
      },
    }
    const r3 = await postEvent(baseUrl, refundEvent)
    console.log(`  → status=${r3.status} body=${JSON.stringify(r3.body)}`)
    const afterRefund = await snapshot(userId, purchaseId)
    printSnapshot('AFTER  — charge.refunded', afterRefund)
    assert(afterRefund.purchase?.status === 'refunded', 'expected purchase.status to be "refunded"')
    assert(
      (afterRefund.account?.purchasedCredits ?? 0) === (afterPaid.account?.purchasedCredits ?? 0) - 250,
      'expected purchasedCredits to decrement by 250 (clamped at 0)',
    )
    assert(
      afterRefund.ledger.some((l) => l.type === 'refund' && l.credits === -250),
      'expected a refund ledger row of -250',
    )

    console.log('\n✓ TRIAL RUN PASSED — paid → idempotent → refunded all verified at the DB level.')
  } finally {
    if (purchaseId) {
      await cleanupTrialArtifacts(userId, purchaseId).catch((err) =>
        console.warn('cleanup failed (ignored):', err),
      )
    }
    server.close()
    await prisma.$disconnect()
  }
}

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error(`✗ ASSERT FAILED: ${msg}`)
    process.exit(1)
  } else {
    console.log(`  ✓ ${msg}`)
  }
}

main().catch((err) => {
  console.error('trial run failed:', err)
  process.exit(1)
})
