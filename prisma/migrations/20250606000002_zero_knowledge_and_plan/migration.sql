-- CreateTable
CREATE TABLE "UserPublicKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "publicKeyJwk" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EncryptedWorkspaceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "titleHint" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CreditBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "balance" INTEGER NOT NULL DEFAULT 200,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CreditBalance" ("balance", "id", "updatedAt") SELECT "balance", "id", "updatedAt" FROM "CreditBalance";
DROP TABLE "CreditBalance";
ALTER TABLE "new_CreditBalance" RENAME TO "CreditBalance";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserPublicKey_deviceId_key" ON "UserPublicKey"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "EncryptedWorkspaceSnapshot_userId_caseId_key" ON "EncryptedWorkspaceSnapshot"("userId", "caseId");
