-- Zero-knowledge patient registry: server stores only opaque case codes.
-- PII columns and per-patient diagnoses are removed; mapping happens locally.

PRAGMA foreign_keys=OFF;

CREATE TABLE "PatientCase_new" (
    "caseId" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "lastDocumentType" TEXT,
    "lastOpened" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "PatientCase_new" ("caseId", "accountId", "lastDocumentType", "lastOpened", "createdAt", "updatedAt")
SELECT "caseId", "accountId", "lastDocumentType", "lastOpened", "createdAt", "updatedAt"
FROM "PatientCase";

DROP TABLE "PatientCase";
ALTER TABLE "PatientCase_new" RENAME TO "PatientCase";

CREATE INDEX "PatientCase_accountId_lastOpened_idx" ON "PatientCase"("accountId", "lastOpened");

DROP TABLE IF EXISTS "PatientDiagnosis";

PRAGMA foreign_keys=ON;
