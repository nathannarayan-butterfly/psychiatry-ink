-- CreateTable
CREATE TABLE "DiagnosisCatalogue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "system" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "source" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "DiagnosisEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiagnosisEntry_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "DiagnosisCatalogue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagnosisSynonym" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diagnosisEntryId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "source" TEXT NOT NULL DEFAULT 'import',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosisSynonym_diagnosisEntryId_fkey" FOREIGN KEY ("diagnosisEntryId") REFERENCES "DiagnosisEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagnosisCriteriaLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diagnosisEntryId" TEXT NOT NULL,
    "criteriaTreeId" TEXT NOT NULL,
    "criteriaSystem" TEXT NOT NULL,
    "supportStatus" TEXT NOT NULL DEFAULT 'native',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosisCriteriaLink_diagnosisEntryId_fkey" FOREIGN KEY ("diagnosisEntryId") REFERENCES "DiagnosisEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCatalogue_system_version_language_key" ON "DiagnosisCatalogue"("system", "version", "language");

-- CreateIndex
CREATE INDEX "DiagnosisCatalogue_active_system_idx" ON "DiagnosisCatalogue"("active", "system");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisEntry_catalogueId_codeNormalized_key" ON "DiagnosisEntry"("catalogueId", "codeNormalized");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_idx" ON "DiagnosisEntry"("catalogueId");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_searchText_idx" ON "DiagnosisEntry"("catalogueId", "searchText");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_codeNormalized_idx" ON "DiagnosisEntry"("catalogueId", "codeNormalized");

-- CreateIndex
CREATE INDEX "DiagnosisEntry_catalogueId_isPsychiatric_isSelectable_idx" ON "DiagnosisEntry"("catalogueId", "isPsychiatric", "isSelectable");

-- CreateIndex
CREATE INDEX "DiagnosisSynonym_diagnosisEntryId_idx" ON "DiagnosisSynonym"("diagnosisEntryId");

-- CreateIndex
CREATE INDEX "DiagnosisSynonym_normalizedTerm_idx" ON "DiagnosisSynonym"("normalizedTerm");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCriteriaLink_diagnosisEntryId_criteriaTreeId_criteriaSystem_key" ON "DiagnosisCriteriaLink"("diagnosisEntryId", "criteriaTreeId", "criteriaSystem");

-- CreateIndex
CREATE INDEX "DiagnosisCriteriaLink_diagnosisEntryId_idx" ON "DiagnosisCriteriaLink"("diagnosisEntryId");

-- CreateIndex
CREATE INDEX "DiagnosisCriteriaLink_criteriaTreeId_idx" ON "DiagnosisCriteriaLink"("criteriaTreeId");
