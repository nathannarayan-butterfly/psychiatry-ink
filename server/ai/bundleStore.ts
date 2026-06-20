/**
 * Bundle catalogue store + purchase recorder.
 *
 * The migration seeds the 5 Beta SKUs at deploy time; this module also
 * re-asserts them at first read so a dev DB created via `prisma db push`
 * (which skips manual migrations) still has a populated catalogue.
 */

import { prisma } from '../db'
import { CREDIT_BUNDLE_SKUS } from './aiPricingConfig'

export interface BundleRow {
  id: string
  sku: string
  credits: number
  priceGbp: number
  active: boolean
}

let seedPromise: Promise<BundleRow[]> | null = null

/** Idempotent seed: inserts any missing SKUs and returns the active catalogue. */
export async function ensureBundlesSeeded(): Promise<BundleRow[]> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const existing = await prisma.aiCreditBundle.findMany()
        const existingSkus = new Set(existing.map((b) => b.sku))

        for (const seed of CREDIT_BUNDLE_SKUS) {
          if (!existingSkus.has(seed.sku)) {
            await prisma.aiCreditBundle.create({
              data: {
                sku: seed.sku,
                credits: seed.credits,
                priceGbp: seed.priceGbp.toFixed(2),
                active: true,
              },
            })
          }
        }
      } catch (error) {
        console.warn('[bundleStore] seeding skipped (DB unavailable):', error)
      }

      try {
        const rows = await prisma.aiCreditBundle.findMany({
          where: { active: true },
          orderBy: { credits: 'asc' },
        })
        return rows.map(toBundleRow)
      } catch (error) {
        console.warn('[bundleStore] catalogue read skipped (DB unavailable):', error)
        // Static fallback so the UI never sees an empty catalogue.
        return CREDIT_BUNDLE_SKUS.map((b) => ({
          id: `static-${b.sku}`,
          sku: b.sku,
          credits: b.credits,
          priceGbp: b.priceGbp,
          active: true,
        }))
      }
    })()
  }
  return seedPromise
}

function toBundleRow(row: {
  id: string
  sku: string
  credits: number
  priceGbp: { toString(): string } | number | string
  active: boolean
}): BundleRow {
  const raw =
    typeof row.priceGbp === 'number'
      ? row.priceGbp
      : Number.parseFloat(row.priceGbp.toString())
  return {
    id: row.id,
    sku: row.sku,
    credits: row.credits,
    priceGbp: Number.isFinite(raw) ? raw : 0,
    active: row.active,
  }
}

/**
 * Record a pending purchase row. The bundle row is looked up by SKU; if the
 * row is missing we seed it on the fly (best-effort).
 */
export async function recordPendingPurchase(params: {
  userId: string
  sku: string
  credits: number
  priceGbp: number
}): Promise<{ id: string; status: string; createdAt: Date }> {
  await ensureBundlesSeeded()
  const bundle = await prisma.aiCreditBundle.findUnique({ where: { sku: params.sku } })
  if (!bundle) {
    throw new Error(`Bundle SKU ${params.sku} is not present in AiCreditBundle`)
  }

  const created = await prisma.aiCreditPurchase.create({
    data: {
      userId: params.userId,
      bundleId: bundle.id,
      credits: params.credits,
      priceGbp: params.priceGbp.toFixed(2),
      status: 'pending',
    },
  })
  return { id: created.id, status: created.status, createdAt: created.createdAt }
}

export interface UserPurchaseSummary {
  id: string
  sku: string
  credits: number
  priceGbp: number
  status: string
  createdAt: string
  paidAt: string | null
}

export async function listUserPurchases(userId: string): Promise<UserPurchaseSummary[]> {
  const rows = await prisma.aiCreditPurchase.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { bundle: true },
  })
  return rows.map((row) => ({
    id: row.id,
    sku: row.bundle?.sku ?? 'unknown',
    credits: row.credits,
    priceGbp: Number.parseFloat(row.priceGbp.toString()),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  }))
}
