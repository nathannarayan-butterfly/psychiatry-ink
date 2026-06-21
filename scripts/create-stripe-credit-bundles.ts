/**
 * Create the 5 AI credit-bundle Products + Prices in Stripe (test mode).
 *
 * Usage:
 *   tsx scripts/create-stripe-credit-bundles.ts
 *
 * Reads `STRIPE_SECRET_KEY` from `.env.local`. Bails with a clear error if the
 * key is missing or is not a test/sandbox key (`sk_test_…` prefix).
 *
 * Idempotency:
 *   - Searches existing Products by `metadata.sku=credits-XXX` before creating.
 *   - Reuses existing matching Products + Prices when found, so re-running
 *     the script never duplicates Stripe objects.
 *
 * Output:
 *   - Prints a `.env.local` snippet to stdout with the resolved Price IDs
 *     under the `STRIPE_PRICE_CREDITS_*` keys.
 *   - Optional: with `--write-env-local` flag, appends the new lines to
 *     `.env.local` in-place (replacing existing keys with the same name).
 */

import '../server/loadEnv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'
import { CREDIT_BUNDLE_SKUS } from '../server/ai/aiPricingConfig'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

interface BundleSeed {
  sku: string
  credits: number
  priceGbp: number
}

const STRIPE_API_VERSION = '2026-05-27.dahlia' as Stripe.LatestApiVersion

function bundleProductName(seed: BundleSeed): string {
  return `Psychiatry.Ink — ${seed.credits.toLocaleString('en-GB')} AI credits`
}

function bundleProductDescription(seed: BundleSeed): string {
  return `${seed.credits.toLocaleString('en-GB')} non-expiring AI credits for Psychiatry.Ink — added on top of your monthly grant. Used only after monthly credits are exhausted.`
}

function envKeyForSku(sku: string): string {
  return `STRIPE_PRICE_CREDITS_${sku.replace(/^credits-/, '')}`
}

async function findExistingProductBySku(
  stripe: Stripe,
  sku: string,
): Promise<Stripe.Product | null> {
  // Stripe Search is the canonical way to look up by metadata; the API
  // requires the `metadata['key']:'value'` syntax.
  const result = await stripe.products.search({
    query: `active:'true' AND metadata['sku']:'${sku}'`,
    limit: 1,
  })
  return result.data[0] ?? null
}

async function findExistingPriceForProduct(
  stripe: Stripe,
  productId: string,
  expectedUnitAmount: number,
  expectedCurrency: string,
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  return (
    prices.data.find(
      (price) =>
        price.unit_amount === expectedUnitAmount &&
        price.currency === expectedCurrency.toLowerCase() &&
        price.type === 'one_time',
    ) ?? null
  )
}

async function ensureProductForSku(
  stripe: Stripe,
  seed: BundleSeed,
): Promise<Stripe.Product> {
  const existing = await findExistingProductBySku(stripe, seed.sku)
  if (existing) {
    console.log(`  · Product ${seed.sku} already exists: ${existing.id}`)
    return existing
  }
  const product = await stripe.products.create({
    name: bundleProductName(seed),
    description: bundleProductDescription(seed),
    metadata: {
      sku: seed.sku,
      credits: String(seed.credits),
      bundle: 'psychiatry_ink_credit_bundle',
    },
  })
  console.log(`  · Created product ${seed.sku}: ${product.id}`)
  return product
}

async function ensurePriceForProduct(
  stripe: Stripe,
  product: Stripe.Product,
  seed: BundleSeed,
): Promise<Stripe.Price> {
  // GBP minor units (pence). Stripe is integer-pence — 4.99 → 499.
  const unitAmount = Math.round(seed.priceGbp * 100)
  const existing = await findExistingPriceForProduct(stripe, product.id, unitAmount, 'gbp')
  if (existing) {
    console.log(`  · Price for ${seed.sku} already exists: ${existing.id} (£${seed.priceGbp})`)
    return existing
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'gbp',
    nickname: `${seed.sku} (£${seed.priceGbp.toFixed(2)})`,
    metadata: {
      sku: seed.sku,
      credits: String(seed.credits),
    },
  })
  console.log(`  · Created price for ${seed.sku}: ${price.id} (£${seed.priceGbp})`)
  return price
}

function maybeWriteEnvLocal(snippet: string, write: boolean): void {
  if (!write) return
  const envLocalPath = path.resolve(SCRIPT_DIR, '..', '.env.local')
  let existing = ''
  try {
    existing = fs.readFileSync(envLocalPath, 'utf8')
  } catch {
    console.warn('  · .env.local not found — printing snippet only.')
    return
  }
  const newKeys = new Set(
    snippet
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=', 1)[0]),
  )
  // Strip any pre-existing STRIPE_PRICE_CREDITS_* lines so we don't end up
  // with duplicates after re-runs.
  const filtered = existing
    .split('\n')
    .filter((line) => {
      const key = line.split('=', 1)[0].trim()
      return !newKeys.has(key)
    })
    .join('\n')
    .replace(/\n+$/, '')
  const next = `${filtered}\n\n# Stripe price IDs (sandbox) — generated ${new Date().toISOString()}\n${snippet}\n`
  fs.writeFileSync(envLocalPath, next, 'utf8')
  console.log(`  · Updated ${envLocalPath} in-place with ${newKeys.size} Price ID lines.`)
}

async function main(): Promise<void> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? ''
  if (!secret) {
    console.error('STRIPE_SECRET_KEY is missing in .env.local — aborting.')
    process.exit(1)
  }
  if (!secret.startsWith('sk_test_') && !secret.startsWith('rk_test_')) {
    console.error(
      'Refusing to run: STRIPE_SECRET_KEY does not look like a TEST key.\n' +
        'Expected sk_test_… or rk_test_…; got a different prefix.\n' +
        'This script is destructive in live mode — paste a test-mode key into .env.local first.',
    )
    process.exit(1)
  }

  const stripe = new Stripe(secret, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: { name: 'psychiatry.ink-bundle-seed', version: '0.1.0' },
  })

  console.log(`Creating ${CREDIT_BUNDLE_SKUS.length} credit-bundle products + prices in Stripe TEST mode…`)
  const seeded: { sku: string; productId: string; priceId: string; priceGbp: number }[] = []

  for (const seed of CREDIT_BUNDLE_SKUS) {
    console.log(`SKU ${seed.sku} (${seed.credits} credits, £${seed.priceGbp}):`)
    const product = await ensureProductForSku(stripe, seed)
    const price = await ensurePriceForProduct(stripe, product, seed)
    seeded.push({
      sku: seed.sku,
      productId: product.id,
      priceId: price.id,
      priceGbp: seed.priceGbp,
    })
  }

  console.log('\n── Summary ────────────────────────────────────────────────────')
  for (const row of seeded) {
    console.log(`${row.sku}: product=${row.productId}  price=${row.priceId}`)
  }

  const envSnippet = seeded
    .map((row) => `${envKeyForSku(row.sku)}=${row.priceId}`)
    .join('\n')

  console.log('\n── .env.local snippet ─────────────────────────────────────────')
  console.log(envSnippet)
  console.log('───────────────────────────────────────────────────────────────')

  const shouldWrite = process.argv.includes('--write-env-local')
  maybeWriteEnvLocal(envSnippet, shouldWrite)
  if (!shouldWrite) {
    console.log('\n(Re-run with --write-env-local to append/update these lines in .env.local.)')
  }
}

void main().catch((err) => {
  console.error('Bundle seed failed:', err)
  process.exit(1)
})
