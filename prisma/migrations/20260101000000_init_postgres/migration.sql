-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
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
    "creditsDeducted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 200,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "UserPublicKey" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKeyJwk" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPublicKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncryptedWorkspaceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "titleHint" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncryptedWorkspaceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountKeyBackup" (
    "userId" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL DEFAULT 310000,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountKeyBackup_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AccountRegistryBackup" (
    "userId" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountRegistryBackup_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PatientCase" (
    "caseId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lastDocumentType" TEXT,
    "lastOpened" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientCase_pkey" PRIMARY KEY ("caseId")
);

-- CreateTable
CREATE TABLE "DiagnosisCode" (
    "system" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelDe" TEXT NOT NULL,
    "icd10Code" TEXT NOT NULL,
    "icd10Label" TEXT NOT NULL,
    "icd11Code" TEXT NOT NULL DEFAULT '',
    "icd11Label" TEXT NOT NULL DEFAULT '',
    "dsmCode" TEXT NOT NULL DEFAULT '',
    "dsmLabel" TEXT NOT NULL DEFAULT '',
    "searchText" TEXT NOT NULL,

    CONSTRAINT "DiagnosisCode_pkey" PRIMARY KEY ("system","code")
);

-- CreateTable
CREATE TABLE "DiagnosisCatalogue" (
    "id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "source" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "DiagnosisCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisEntry" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeNormalized" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "description" TEXT,
    "chapterCode" TEXT,
    "chapterTitle" TEXT,
    "blockCode" TEXT,
    "blockTitle" TEXT,
    "parentCode" TEXT,
    "hierarchyLevel" INTEGER NOT NULL DEFAULT 0,
    "isCategory" BOOLEAN NOT NULL DEFAULT false,
    "isSelectable" BOOLEAN NOT NULL DEFAULT true,
    "isResidualCategory" BOOLEAN NOT NULL DEFAULT false,
    "isPsychiatric" BOOLEAN NOT NULL DEFAULT false,
    "isSomatic" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT NOT NULL,
    "sourceUri" TEXT,
    "sourceVersion" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosisEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisSynonym" (
    "id" TEXT NOT NULL,
    "diagnosisEntryId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "source" TEXT NOT NULL DEFAULT 'import',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosisSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCreditAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organisationId" TEXT,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 500,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "monthlyResetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCreditLedger" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "featureKey" TEXT,
    "usageLogId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT,
    "userId" TEXT,
    "caseRef" TEXT,
    "featureKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "rawProviderUsage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisCriteriaLink" (
    "id" TEXT NOT NULL,
    "diagnosisEntryId" TEXT NOT NULL,
    "criteriaTreeId" TEXT NOT NULL,
    "criteriaSystem" TEXT NOT NULL,
    "supportStatus" TEXT NOT NULL DEFAULT 'native',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosisCriteriaLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationLog_userId_createdAt_idx" ON "GenerationLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPublicKey_deviceId_key" ON "UserPublicKey"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "EncryptedWorkspaceSnapshot_userId_caseId_key" ON "EncryptedWorkspaceSnapshot"("userId", "caseId");

-- CreateIndex
CREATE INDEX "PatientCase_accountId_lastOpened_idx" ON "PatientCase"("accountId", "lastOpened");

-- CreateIndex
CREATE INDEX "DiagnosisCode_system_searchText_idx" ON "DiagnosisCode"("system", "searchText");

-- CreateIndex
CREATE INDEX "DiagnosisCode_icd10Code_idx" ON "DiagnosisCode"("icd10Code");

-- CreateIndex
CREATE INDEX "DiagnosisCatalogue_active_system_idx" ON "DiagnosisCatalogue"("active", "system");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCatalogue_system_version_language_key" ON "DiagnosisCatalogue"("system", "version", "language");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_idx" ON "DiagnosisEntry"("catalogueId");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_searchText_idx" ON "DiagnosisEntry"("catalogueId", "searchText");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_codeNormalized_idx" ON "DiagnosisEntry"("catalogueId", "codeNormalized");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_isPsychiatric_isSelectable_idx" ON "DiagnosisEntry"("catalogueId", "isPsychiatric", "isSelectable");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisEntry_catalogueId_codeNormalized_key" ON "DiagnosisEntry"("catalogueId", "codeNormalized");

-- CreateIndex
CREATE INDEX "DiagnosisSynonym_diagnosisEntryId_idx" ON "DiagnosisSynonym"("diagnosisEntryId");

-- CreateIndex
CREATE INDEX "DiagnosisSynonym_normalizedTerm_idx" ON "DiagnosisSynonym"("normalizedTerm");

-- CreateIndex
CREATE UNIQUE INDEX "AiCreditAccount_userId_key" ON "AiCreditAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiCreditAccount_organisationId_key" ON "AiCreditAccount"("organisationId");

-- CreateIndex
CREATE INDEX "AiCreditLedger_accountId_createdAt_idx" ON "AiCreditLedger"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_createdAt_idx" ON "AiUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_featureKey_createdAt_idx" ON "AiUsageLog"("featureKey", "createdAt");

-- CreateIndex
CREATE INDEX "DiagnosisCriteriaLink_diagnosisEntryId_idx" ON "DiagnosisCriteriaLink"("diagnosisEntryId");

-- CreateIndex
CREATE INDEX "DiagnosisCriteriaLink_criteriaTreeId_idx" ON "DiagnosisCriteriaLink"("criteriaTreeId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCriteriaLink_diagnosisEntryId_criteriaTreeId_crite_key" ON "DiagnosisCriteriaLink"("diagnosisEntryId", "criteriaTreeId", "criteriaSystem");

-- AddForeignKey
ALTER TABLE "DiagnosisEntry" ADD CONSTRAINT "DiagnosisEntry_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "DiagnosisCatalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisSynonym" ADD CONSTRAINT "DiagnosisSynonym_diagnosisEntryId_fkey" FOREIGN KEY ("diagnosisEntryId") REFERENCES "DiagnosisEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCreditLedger" ADD CONSTRAINT "AiCreditLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AiCreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisCriteriaLink" ADD CONSTRAINT "DiagnosisCriteriaLink_diagnosisEntryId_fkey" FOREIGN KEY ("diagnosisEntryId") REFERENCES "DiagnosisEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

