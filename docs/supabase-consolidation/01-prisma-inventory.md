# Prisma Inventory

> Phase 0 deliverable for removing Prisma and consolidating on Supabase.
> Scope: investigation only. No call sites were rewritten and Prisma was not removed.
> Branch: `feat/supabase-consolidation`.

## 1. Prisma models (`prisma/schema.prisma`)

Prisma uses the model class name verbatim as the table name (no `@@map` is
declared anywhere in the schema). All models therefore resolve to **PascalCase**
table names in the database — which is why only `GenerationLog` (the one model
ever pushed) exists in prod, while every other model resolves to a table that
was never created.

| Model | Table name (implicit) | Primary key | Key fields | Relations |
| --- | --- | --- | --- | --- |
| `GenerationLog` | `GenerationLog` | `id` (cuid) | createdAt, completedAt?, userId?, organisationId?, documentType, aiMode, inputTextLength, estimatedInputTokens, estimatedCredits, provider?, model?, status, errorMessage?, tool?, scope?, schemaId?, resultTextLength?, creditsDeducted | — (index `[userId, createdAt]`) |
| `CreditBalance` | `CreditBalance` | `id` (text) | balance (default 200), plan (default 'free'), updatedAt | — |
| `AppSetting` | `AppSetting` | `key` (text) | value, updatedAt | — |
| `UserPublicKey` | `UserPublicKey` | `id` (cuid) | deviceId (unique), publicKeyJwk, countryCode, createdAt, updatedAt | — |
| `EncryptedWorkspaceSnapshot` | `EncryptedWorkspaceSnapshot` | `id` (cuid) | userId, caseId, deviceId, ciphertext, iv, wrappedKey, version, titleHint?, updatedAt, createdAt; unique `[userId, caseId]` | — |
| `AccountKeyBackup` | `AccountKeyBackup` | `userId` (text) | salt, iv, ciphertext, iterations (310000), version, updatedAt | — |
| `AccountRegistryBackup` | `AccountRegistryBackup` | `userId` (text) | salt, iv, ciphertext, version, updatedAt | — |
| `PatientCase` | `PatientCase` | `caseId` (text) | accountId, lastDocumentType?, lastOpened, createdAt, updatedAt; index `[accountId, lastOpened]` | — |
| `DiagnosisCode` | `DiagnosisCode` | composite `[system, code]` | labelDe, icd10Code, icd10Label, icd11Code, icd11Label, dsmCode, dsmLabel, searchText; indexes `[system, searchText]`, `[icd10Code]` | — |
| `DiagnosisCatalogue` | `DiagnosisCatalogue` | `id` (cuid) | system, version, language, source, active, importedAt, metadataJson; unique `[system, version, language]` | has-many `DiagnosisEntry` |
| `DiagnosisEntry` | `DiagnosisEntry` | `id` (cuid) | catalogueId, code, codeNormalized, title, shortTitle?, description?, chapterCode?, chapterTitle?, blockCode?, blockTitle?, parentCode?, hierarchyLevel, isCategory, isSelectable, isResidualCategory, isPsychiatric, isSomatic, searchText, sourceUri?, sourceVersion?, metadataJson, createdAt, updatedAt; unique `[catalogueId, codeNormalized]` | belongs-to `DiagnosisCatalogue`; has-many `DiagnosisSynonym`, `DiagnosisCriteriaLink` |
| `DiagnosisSynonym` | `DiagnosisSynonym` | `id` (cuid) | diagnosisEntryId, term, normalizedTerm, language, source, createdAt | belongs-to `DiagnosisEntry` |
| `DiagnosisCriteriaLink` | `DiagnosisCriteriaLink` | `id` (cuid) | diagnosisEntryId, criteriaTreeId, criteriaSystem, supportStatus, createdAt; unique `[diagnosisEntryId, criteriaTreeId, criteriaSystem]` | belongs-to `DiagnosisEntry` |
| `AiCreditAccount` | `AiCreditAccount` | `id` (cuid) | userId? (unique), organisationId? (unique), monthlyCredits (500), purchasedCredits (0), monthlyResetAt, createdAt, updatedAt | has-many `AiCreditLedger` |
| `AiCreditLedger` | `AiCreditLedger` | `id` (cuid) | accountId, type, credits, featureKey?, usageLogId?, note?, createdAt; index `[accountId, createdAt]` | belongs-to `AiCreditAccount` |
| `AiUsageLog` | `AiUsageLog` | `id` (cuid) | organisationId?, userId?, caseRef?, featureKey, mode, provider, model, inputTokens, outputTokens, totalTokens, creditsCharged, durationMs?, success, errorCode?, rawProviderUsage?, createdAt; indexes `[userId, createdAt]`, `[featureKey, createdAt]` | — |

**16 models total.**

## 2. Prisma call sites

The Prisma singleton is defined in `server/db.ts`. `server/routes/criteriaGenerateDraft.ts`
instantiates its own `new PrismaClient()` (a second client — to be removed).

"Refs" below counts on-the-same-line `prisma.<member>` references (ripgrep
match-line count). `server/lifecycle.ts` adds 2 cross-line `prisma.$disconnect()`
calls not captured by that line count.

### 2a. Direct Prisma users (runtime — `server/`)

| File | Refs | Models / operations | Feature |
| --- | --- | --- | --- |
| `server/db.ts` | (singleton) | `new PrismaClient()` export | Infra — the singleton imported everywhere |
| `server/ai/creditGuard.ts` | 11 | `aiCreditAccount` find/create/update/updateMany, `aiCreditLedger` create/findMany, `$transaction` | **Credits / ledger** (atomic debit, refund, monthly grant, balance read) |
| `server/services/credits.ts` | 7 | `creditBalance` upsert/update/updateMany/findUnique | **Credits** (legacy balance + plan facade) |
| `server/services/creditMigration.ts` | 5 | `creditBalance` findUnique/update, `aiCreditAccount` findUnique/create, `aiCreditLedger` findFirst/create, `$transaction` | **Credits** (one-time legacy → AiCreditAccount migration) |
| `server/services/stripeCredits.ts` | 1 (+`Prisma` enum/types) | `$transaction` (Serializable), `appSetting.create`, `grantPurchasedCreditsWithinTx`; `Prisma.TransactionIsolationLevel`, `Prisma.PrismaClientKnownRequestError` (P2002/P2034) | **Billing / Stripe** (idempotent webhook credit grant) |
| `server/ai/usageLogger.ts` | 2 | `aiUsageLog` create/findMany | **AI usage logging** (metadata only) |
| `server/routes/patients.ts` | 9 | `patientCase` find/findMany/upsert/delete, `encryptedWorkspaceSnapshot.deleteMany`, `$transaction` | **Patient sync** (opaque case registry) |
| `server/routes/workspaceVault.ts` | 3 | `encryptedWorkspaceSnapshot` upsert/findUnique/findMany | **Snapshots** (zero-knowledge sync) |
| `server/routes/accountBackup.ts` | 7 | `accountKeyBackup` find/upsert, `accountRegistryBackup` find/upsert/deleteMany | **Crypto/keys** (encrypted backups) |
| `server/routes/crypto.ts` | 2 | `userPublicKey` upsert/findUnique | **Crypto/keys** (public key registry) |
| `server/routes/diagnosisCodes.ts` | 3 | `diagnosisCode` findMany/findFirst/groupBy | **Diagnosis** (legacy crosswalk search) |
| `server/services/icdTitleResolver.ts` | 4 | `diagnosisCode.findFirst` (×4) | **Diagnosis** (ICD title resolution) |
| `server/services/diagnosisCatalogueStore.ts` | 8 | `diagnosisCatalogue` findMany/count, `diagnosisEntry` findMany/count | **Diagnosis** (catalogue search + coverage) |
| `server/routes/criteriaGenerateDraft.ts` | 0 (own `new PrismaClient()`) | passes client to `summarizeCriteriaGaps(prisma)` | **Diagnosis / criteria** (dev/admin draft tooling) |
| `server/index.ts` | 2 | `prisma.$queryRaw\`SELECT 1\`` (readiness), `prisma.diagnosisCode.count()` (startup check) | **Infra / health** |
| `server/lifecycle.ts` | 2 (cross-line) | `prisma.$disconnect()` (uncaughtException + graceful shutdown) | **Infra / lifecycle** |

### 2b. Indirect consumers (import credit-service functions, not `prisma.` directly)

These call `server/services/credits.ts` and will be unaffected by the data-layer
swap as long as the service keeps its function signatures:

| File | Imports | Feature |
| --- | --- | --- |
| `server/routes/account.ts` | `getCreditBalance, getUserPlan, setUserPlan` | Credits |
| `server/routes/credits.ts` | `canAfford, getCreditBalance` | Credits |
| `server/routes/generationLog.ts` | `getCreditBalance, refundCredits, reserveCredits` | Credits / generation log |
| `server/routes/transcribe.ts` | `canAfford, deductCredits` | Credits |
| `server/routes/discussCase.ts` | `canAfford, deductCredits` | Credits |

### 2c. Direct Prisma users (scripts / tooling — `scripts/`)

Not part of the request/response runtime, but must be migrated or retired so the
`@prisma/client` dependency can be dropped:

| File | Refs | Models / operations | Feature |
| --- | --- | --- | --- |
| `scripts/seed-diagnosis-catalogue.ts` | 9 | `diagnosisCatalogue`, `diagnosisEntry`, `diagnosisSynonym`, `diagnosisCriteriaLink` create/createMany/deleteMany/findMany | Diagnosis catalogue seed |
| `scripts/seed-diagnosis-codes.ts` | 4 | `diagnosisCode` deleteMany/createMany/groupBy | Diagnosis crosswalk seed |
| `scripts/seed-diagnosis-criteria-links.ts` | 4 | `diagnosisEntry.findMany`, `diagnosisCriteriaLink` deleteMany/createMany | Criteria links seed |
| `scripts/lib/criteriaDraftGaps.ts` | 2 | `diagnosisEntry.findMany` (×2); typed by `PrismaClient` | Criteria gap analysis (used by route 2a) |
| `scripts/generate-criteria-drafts.ts` | 1 | `new PrismaClient()` + gap helpers | Criteria draft generation |
| `scripts/db-smoke.ts` | 2 | `generationLog.count()` | DB smoke test |

### 2d. Tests referencing Prisma

| File | Usage |
| --- | --- |
| `server/ai/__tests__/creditSystem.test.ts` | imports `prisma` from `../../db` |
| `server/routes/icdTitle.test.ts` | imports `prisma`; 2 refs |
| `server/services/labMedicationCorrelationAi.test.ts` | imports `prisma`; 1 ref |

### Totals

- **Direct `prisma.<member>` references: 89** (same-line) across **21 `.ts` files**,
  plus **2** cross-line `prisma.$disconnect()` calls in `server/lifecycle.ts`
  → **≈91 references**.
- Files importing `@prisma/client` or the `prisma` singleton (incl. tests &
  scripts): **27** (`server/db.ts` defines it; `criteriaGenerateDraft.ts` makes a
  2nd client).
- Indirect feature consumers via `services/credits.ts`: **5** route files.

By feature area (direct runtime call sites):

| Feature | Files | Notes |
| --- | --- | --- |
| Credits / ledger / billing | creditGuard, credits, creditMigration, stripeCredits | Highest risk — atomic money/credit logic + Stripe idempotency |
| Patient sync | patients | Opaque case registry; touches snapshots on delete |
| Snapshots (zero-knowledge) | workspaceVault | Ciphertext only |
| Crypto / keys | accountBackup, crypto | Encrypted key/registry backups + public keys |
| Diagnosis | diagnosisCodes, icdTitleResolver, diagnosisCatalogueStore, criteriaGenerateDraft | Reference data, read-heavy |
| AI usage logging | usageLogger | Metadata only |
| Infra / health / lifecycle | index, lifecycle, db | Readiness probe, startup check, disconnect |

## 3. Build / runtime touchpoints

| Location | Reference | Notes |
| --- | --- | --- |
| `package.json` → `dependencies` | `"@prisma/client": "^6.19.3"`, `"prisma": "^6.19.3"` | Both are runtime deps (prisma CLI used at boot) |
| `package.json` → `scripts.postinstall` | `prisma generate` | Runs on every `npm install` / `npm ci` |
| `package.json` → `scripts` | `migrate:deploy` (`prisma migrate deploy`), `db:generate`, `db:push`, `db:migrate`, `db:studio` | Prisma CLI wrappers |
| `package.json` → seed scripts | `db:seed-diagnoses`, `db:seed-catalogue`, `db:seed-criteria-links`, `criteria:generate-drafts`, `db:smoke` | Invoke Prisma-backed scripts (2c) |
| `Dockerfile` (deps stage) | `COPY prisma ./prisma` | Schema copied for generate |
| `Dockerfile` (builder stage) | `RUN npx prisma generate` | Before `npm run build` |
| `Dockerfile` (runner stage) | `COPY prisma ./prisma` + `RUN npm ci --omit=dev && npx prisma generate` | Generates client in prod image |
| `docker-entrypoint.sh` | `npx prisma migrate deploy` (guarded by `RUN_DB_MIGRATIONS=true`, best-effort) | Boot-time migration runner |
| `prisma/` directory | `schema.prisma`, `migrations/20260101000000_init_postgres/`, `migrations/migration_lock.toml`, `data/*` | Schema, migration history, diagnosis source JSON |
| `.env.local` / `.env.example` | `DATABASE_URL`, `DIRECT_URL` | Pooled (6543) + direct (5432) connection strings used only by Prisma |
| `server/db.ts` | `warnIfDatabaseUrlMisconfigured()` | Startup warnings tied to Prisma URLs |

Docs that reference Prisma (informational; update during cleanup):
`docs/DATABASE.md`, `docs/cloud-deployment.md`, `docs/PRODUCT_OVERVIEW.md`,
`docs/database-migration-policy.md`, `docs/audit/audit-2026-06-06.md`.
