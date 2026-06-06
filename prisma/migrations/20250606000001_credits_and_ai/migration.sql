-- CreateTable
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "balance" INTEGER NOT NULL DEFAULT 500,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GenerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
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
INSERT INTO "new_GenerationLog" ("completedAt", "createdAt", "documentType", "aiMode", "errorMessage", "estimatedCredits", "estimatedInputTokens", "id", "inputTextLength", "model", "provider", "resultTextLength", "schemaId", "scope", "status", "tool") SELECT "completedAt", "createdAt", "documentType", "aiMode", "errorMessage", "estimatedCredits", "estimatedInputTokens", "id", "inputTextLength", "model", "provider", "resultTextLength", "schemaId", "scope", "status", "tool" FROM "GenerationLog";
DROP TABLE "GenerationLog";
ALTER TABLE "new_GenerationLog" RENAME TO "GenerationLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Seed default credit balance
INSERT INTO "CreditBalance" ("id", "balance", "updatedAt") VALUES ('default', 500, CURRENT_TIMESTAMP);
