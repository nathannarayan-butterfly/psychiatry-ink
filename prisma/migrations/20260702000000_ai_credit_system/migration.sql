-- Migration: ai_credit_system
-- Adds AiCreditAccount, AiCreditLedger, and AiUsageLog models.
-- Operator: run `npx prisma migrate deploy` (or `prisma db push`) after deploying.

-- AiCreditAccount: per-user or per-org credit balance
CREATE TABLE "AiCreditAccount" (
    "id"               TEXT NOT NULL PRIMARY KEY,
    "userId"           TEXT UNIQUE,
    "organisationId"   TEXT UNIQUE,
    "monthlyCredits"   INTEGER NOT NULL DEFAULT 500,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "monthlyResetAt"   DATETIME NOT NULL,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        DATETIME NOT NULL
);

-- AiCreditLedger: append-only ledger for all credit movements
CREATE TABLE "AiCreditLedger" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "accountId"   TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "credits"     INTEGER NOT NULL,
    "featureKey"  TEXT,
    "usageLogId"  TEXT,
    "note"        TEXT,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiCreditLedger_accountId_fkey"
        FOREIGN KEY ("accountId") REFERENCES "AiCreditAccount"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AiCreditLedger_accountId_createdAt_idx"
    ON "AiCreditLedger"("accountId", "createdAt");

-- AiUsageLog: metadata-only AI call log (no patient text, no raw prompts)
CREATE TABLE "AiUsageLog" (
    "id"               TEXT NOT NULL PRIMARY KEY,
    "organisationId"   TEXT,
    "userId"           TEXT,
    "caseRef"          TEXT,
    "featureKey"       TEXT NOT NULL,
    "mode"             TEXT NOT NULL,
    "provider"         TEXT NOT NULL,
    "model"            TEXT NOT NULL,
    "inputTokens"      INTEGER NOT NULL DEFAULT 0,
    "outputTokens"     INTEGER NOT NULL DEFAULT 0,
    "totalTokens"      INTEGER NOT NULL DEFAULT 0,
    "creditsCharged"   INTEGER NOT NULL DEFAULT 0,
    "durationMs"       INTEGER,
    "success"          BOOLEAN NOT NULL DEFAULT 1,
    "errorCode"        TEXT,
    "rawProviderUsage" TEXT,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AiUsageLog_userId_createdAt_idx"
    ON "AiUsageLog"("userId", "createdAt");

CREATE INDEX "AiUsageLog_featureKey_createdAt_idx"
    ON "AiUsageLog"("featureKey", "createdAt");
