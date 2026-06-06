-- CreateTable
CREATE TABLE "GenerationLog" (
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
    "resultTextLength" INTEGER
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
