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

    PRIMARY KEY ("system", "code")
);

-- CreateIndex
CREATE INDEX "DiagnosisCode_system_searchText_idx" ON "DiagnosisCode"("system", "searchText");

-- CreateIndex
CREATE INDEX "DiagnosisCode_icd10Code_idx" ON "DiagnosisCode"("icd10Code");
