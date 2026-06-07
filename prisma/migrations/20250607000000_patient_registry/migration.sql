-- CreateTable
CREATE TABLE "PatientCase" (
    "caseId" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "localName" TEXT,
    "localVorname" TEXT,
    "localNachname" TEXT,
    "localGeburtsdatum" TEXT,
    "localGeschlecht" TEXT,
    "localAge" TEXT,
    "pageHeading" TEXT,
    "lastDocumentType" TEXT,
    "lastOpened" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PatientDiagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "icd10Code" TEXT NOT NULL DEFAULT '',
    "icd10Label" TEXT NOT NULL DEFAULT '',
    "icd10Overridden" BOOLEAN NOT NULL DEFAULT false,
    "icd11Code" TEXT NOT NULL DEFAULT '',
    "icd11Label" TEXT NOT NULL DEFAULT '',
    "icd11Overridden" BOOLEAN NOT NULL DEFAULT false,
    "dsmCode" TEXT NOT NULL DEFAULT '',
    "dsmLabel" TEXT NOT NULL DEFAULT '',
    "dsmOverridden" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PatientDiagnosis_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PatientCase" ("caseId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PatientCase_accountId_lastOpened_idx" ON "PatientCase"("accountId", "lastOpened");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_accountId_caseId_idx" ON "PatientDiagnosis"("accountId", "caseId");
