-- Add owner attribution to GenerationLog so credits are reserved/deducted
-- against the correct account and PATCH cannot mutate another user's log.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GenerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "userId" TEXT,
    "organisationId" TEXT,
    "documentType" TEXT NOT NULL,
    "aiMode" TEXT NOT NULL,
    "inputTextLength" INTEGER NOT NULL,
    "estimatedInputTokens" INTEGER NOT NULL,
    "estimatedCredits" INTEGER NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "tool" TEXT,
    "scope" TEXT,
    "schemaId" TEXT,
    "resultTextLength" INTEGER,
    "creditsDeducted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_GenerationLog" ("completedAt", "createdAt", "creditsDeducted", "documentType", "aiMode", "errorMessage", "estimatedCredits", "estimatedInputTokens", "id", "inputTextLength", "model", "provider", "resultTextLength", "schemaId", "scope", "status", "tool") SELECT "completedAt", "createdAt", "creditsDeducted", "documentType", "aiMode", "errorMessage", "estimatedCredits", "estimatedInputTokens", "id", "inputTextLength", "model", "provider", "resultTextLength", "schemaId", "scope", "status", "tool" FROM "GenerationLog";
DROP TABLE "GenerationLog";
ALTER TABLE "new_GenerationLog" RENAME TO "GenerationLog";
CREATE INDEX "GenerationLog_userId_createdAt_idx" ON "GenerationLog"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
