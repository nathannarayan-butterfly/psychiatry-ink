/**
 * Stripe client singleton.
 *
 * Reads `STRIPE_SECRET_KEY` at first call so test code can mutate
 * `process.env.STRIPE_SECRET_KEY` between describe blocks without rebuilding
 * the module. Routes that need Stripe must call {@link getStripe} and handle
 * the `null` return (no key configured → checkout is disabled, the purchase
 * route returns a clear error).
 *
 * Why a singleton: the Stripe SDK opens an HTTP keep-alive agent and caches
 * compiled handlers — instantiating it per-request is measurable per-request
 * latency in benchmarks.
 *
 * Security:
 *   - Secret keys are read from `process.env` only — they are never logged,
 *     persisted, or included in error responses.
 *   - The webhook secret is loaded separately via {@link getStripeWebhookSecret}
 *     so checkout creation can succeed even when webhooks are not yet wired
 *     (e.g. before the first `stripe listen` in dev).
 */

import Stripe from 'stripe'

// API version is pinned to the OpenAPI version the bundled Stripe MCP server
// advertises (see `mcps/plugin-stripe-stripe/SERVER_METADATA.json`). When
// upgrading the SDK or rotating the MCP server, bump this in lockstep so
// MCP-issued and SDK-issued calls stay on the same schema.
const STRIPE_API_VERSION = '2026-05-27.dahlia' as Stripe.LatestApiVersion

let cachedClient: Stripe | null = null
let cachedKey: string | null = null

/**
 * Returns a memoised Stripe client, or `null` when no secret key is configured.
 * The client is rebuilt when the secret key env var changes between calls so
 * tests can swap keys via `process.env` mutation.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    cachedClient = null
    cachedKey = null
    return null
  }
  if (cachedClient && cachedKey === key) return cachedClient
  cachedClient = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: {
      name: 'psychiatry.ink',
      version: '0.1.0',
    },
  })
  cachedKey = key
  return cachedClient
}

/** Returns the webhook signing secret, or `null` when not configured. */
export function getStripeWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  return secret ? secret : null
}

/** Returns true when Stripe Checkout can be created (secret key present). */
export function isStripeCheckoutConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

/**
 * Resolve the configured Stripe Price ID for a credit-bundle SKU.
 *
 * Convention: `STRIPE_PRICE_CREDITS_<credits>` (e.g. `credits-100` →
 * `STRIPE_PRICE_CREDITS_100`). Returning `null` means the operator has not
 * yet pasted the sandbox Price ID — the purchase route surfaces a clear
 * 503 in that case instead of silently creating a session without a Price.
 */
export function resolvePriceIdForSku(sku: string): string | null {
  const credits = sku.replace(/^credits-/, '')
  if (!/^\d+$/.test(credits)) return null
  const envKey = `STRIPE_PRICE_CREDITS_${credits}`
  const value = process.env[envKey]?.trim()
  return value && value.startsWith('price_') ? value : null
}

/**
 * Best-effort origin extraction for Checkout return URLs. When
 * `PUBLIC_APP_URL` is set we use it verbatim (canonical for production);
 * otherwise we fall back to the inbound request's `Origin` header so dev
 * flows on `http://localhost:5173` Just Work.
 */
export function resolvePublicAppOrigin(requestOrigin: string | undefined): string {
  const env = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, '')
  if (env) return env
  const fromHeader = requestOrigin?.trim().replace(/\/+$/, '')
  if (fromHeader) return fromHeader
  // Final fallback — local dev with no Origin header (e.g. curl) should still
  // produce a parseable URL, even if the user will then be redirected to a
  // page that does not exist locally.
  return 'http://localhost:5173'
}

export { Stripe }
