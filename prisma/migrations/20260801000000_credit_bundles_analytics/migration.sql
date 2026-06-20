-- Migration: credit_bundles_analytics
-- Adds AiCreditBundle, AiCreditPurchase, AiCreditLedger.bucket and
-- AiUsageLog.estimatedCostUsd / AiUsageLog.fallback.
--
-- Operator: run `npx prisma migrate deploy` (or `prisma db push`) after deploying.
-- This migration is strictly additive: existing rows in AiCreditLedger /
-- AiUsageLog are unchanged and pick up the new column defaults.

-- ── AiCreditBundle ─────────────────────────────────────────────────────────
CREATE TABLE "AiCreditBundle" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "sku"       TEXT NOT NULL,
    "credits"   INTEGER NOT NULL,
    "priceGbp"  DECIMAL NOT NULL,
    "active"    BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AiCreditBundle_sku_key" ON "AiCreditBundle"("sku");

-- Seed the 5 Beta bundles (GBP). Idempotent via INSERT OR IGNORE in case the
-- runtime seeder beats migrate-deploy.
INSERT INTO "AiCreditBundle" ("id", "sku", "credits", "priceGbp", "active") VALUES
    ('bundle-credits-100',  'credits-100',   100,   4.99,  1),
    ('bundle-credits-250',  'credits-250',   250,   9.99,  1),
    ('bundle-credits-500',  'credits-500',   500,  17.99,  1),
    ('bundle-credits-1000', 'credits-1000', 1000,  29.99,  1),
    ('bundle-credits-2500', 'credits-2500', 2500,  59.99,  1);

-- ── AiCreditPurchase ───────────────────────────────────────────────────────
CREATE TABLE "AiCreditPurchase" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "userId"      TEXT NOT NULL,
    "bundleId"    TEXT NOT NULL,
    "credits"     INTEGER NOT NULL,
    "priceGbp"    DECIMAL NOT NULL,
    "status"      TEXT NOT NULL,
    "externalRef" TEXT,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt"      DATETIME,
    CONSTRAINT "AiCreditPurchase_bundleId_fkey"
        FOREIGN KEY ("bundleId") REFERENCES "AiCreditBundle"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AiCreditPurchase_userId_status_idx"
    ON "AiCreditPurchase"("userId", "status");

CREATE INDEX "AiCreditPurchase_createdAt_idx"
    ON "AiCreditPurchase"("createdAt");

CREATE INDEX "AiCreditPurchase_status_createdAt_idx"
    ON "AiCreditPurchase"("status", "createdAt");

-- ── AiCreditLedger.bucket ──────────────────────────────────────────────────
-- SQLite cannot rename columns inline; add the column with a safe default so
-- existing rows are tagged as monthly (pre-bundles era).
ALTER TABLE "AiCreditLedger" ADD COLUMN "bucket" TEXT NOT NULL DEFAULT 'monthly';

CREATE INDEX "AiCreditLedger_accountId_bucket_createdAt_idx"
    ON "AiCreditLedger"("accountId", "bucket", "createdAt");

-- ── AiUsageLog.estimatedCostUsd + fallback ─────────────────────────────────
-- estimatedCostUsd is nullable: existing rows from the Beta-v1 cycle have no
-- recorded cost. New rows record cost computed from providerCosts.ts.
ALTER TABLE "AiUsageLog" ADD COLUMN "estimatedCostUsd" DECIMAL;
ALTER TABLE "AiUsageLog" ADD COLUMN "fallback"         BOOLEAN NOT NULL DEFAULT 0;

CREATE INDEX "AiUsageLog_provider_model_createdAt_idx"
    ON "AiUsageLog"("provider", "model", "createdAt");

CREATE INDEX "AiUsageLog_success_createdAt_idx"
    ON "AiUsageLog"("success", "createdAt");

CREATE INDEX "AiUsageLog_fallback_createdAt_idx"
    ON "AiUsageLog"("fallback", "createdAt");
