# Supabase Consolidation Plan (Prisma Removal)

> **Goal:** make Supabase the single source of truth and remove Prisma entirely.
> **Status:** Phase 0 complete (investigation + plan + authored, not-yet-applied
> additive migrations). No call sites rewritten, no Prisma removed, nothing
> applied to prod, nothing deployed.
> **Branch:** `feat/supabase-consolidation` (off `master` @ `ffb1988`).

Companion docs: [`01-prisma-inventory.md`](./01-prisma-inventory.md),
[`02-schema-gap.md`](./02-schema-gap.md).

## 1. Why

Prisma's PascalCase models (`AiCreditAccount`, `AiCreditLedger`, …) were never
applied to the live prod DB (project `dxngbuinxutzirowbjgb`), which is managed by
Supabase CLI migrations using snake_case tables. Every Prisma-backed feature
except `GenerationLog` therefore **fails closed in production** (credits/ledger,
patient sync, snapshots, crypto backups, diagnosis search). Running two data
layers (Prisma + supabase-js) over the same database is the root cause.

## 2. Target data-access architecture

### 2.1 One server-side data layer (supabase-js, service role)

Replace the `server/db.ts` Prisma singleton with a small **typed data-access
layer** built on the existing service-role client pattern in
`server/services/kbSupabaseAdmin.ts` (`createClient(SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession:false }, global:{ fetch:
boundedFetch } })`).

- Introduce `server/services/supabaseAdmin.ts` (generalised from
  `kbSupabaseAdmin.ts`) exposing a single memoised service-role client + a
  `boundedFetch` timeout wrapper. KB admin keeps using it (or re-exports).
- Add **per-feature repository modules** that own the camelCase ↔ snake_case
  mapping and return the same shapes the routes already consume, e.g.
  `server/data/credits.ts`, `server/data/patientCases.ts`,
  `server/data/snapshots.ts`, `server/data/accountBackups.ts`,
  `server/data/publicKeys.ts`, `server/data/diagnosis.ts`, `server/data/aiUsage.ts`.
- Routes/services keep their current signatures; only their **bodies** swap from
  `prisma.*` to the repo functions. The `services/credits.ts` facade and the AI
  `creditGuard.ts` keep their exported API so the 5 indirect consumers
  (`account`, `credits`, `generationLog`, `transcribe`, `discussCase`) are
  untouched.
- Generate types via the MCP `generate_typescript_types` tool and commit a
  `server/types/database.ts` for compile-time safety.

### 2.2 Atomic ledger ops → Postgres RPCs

The credit logic in `server/ai/creditGuard.ts` currently relies on Prisma
`$transaction` + conditional `updateMany`. supabase-js has no multi-statement
transaction primitive, so those move into **SECURITY DEFINER RPCs** (authored in
`20260704000000_consolidation_credit_system.sql`):

| Prisma flow | Replacement RPC | Atomicity guarantee |
| --- | --- | --- |
| `ensureCreditAccount` (create + monthly grant) | `ai_credit_ensure_account(user_id, monthly_grant, next_reset)` | `insert … on conflict do nothing` + conditional `update` keyed on stale `monthly_reset_at` → exactly one monthly grant under concurrency |
| `deductCreditsTransactionally` | `ai_credit_debit(account_id, credits, feature_key, usage_log_id, note)` → `boolean ok` | single conditional `update` with `gte` guards (purchased-first, then monthly) + ledger insert; loser returns `false`, no ledger row |
| `refundCredits` | `ai_credit_refund(account_id, credits, feature_key, usage_log_id, note)` | update + ledger insert in one function call |
| `grantPurchasedCreditsWithinTx` (Stripe) | `ai_credit_grant_purchased(account_id, credits, note, feature_key)` | update + ledger insert; idempotency stays in the app via `app_settings` marker |

RPCs are `security definer`, `set search_path = ''`, fully schema-qualified, and
`execute` granted to `service_role` only (revoked from public). The data layer
calls them via `supabase.rpc('ai_credit_debit', { … })`.

**Stripe idempotency note:** Prisma wrapped the `app_settings` marker insert and
the credit grant in one Serializable transaction (P2002/P2034 → "already
processed"). Replacement: call a single RPC that does *both* the marker insert
(unique-violation = already processed) and the grant, OR keep the two-step app
flow but make the marker insert the idempotency gate (insert marker first; on
unique violation, return received). This is captured as **OQ-2**.

### 2.3 RLS + service role

- All authored tables `enable row level security`.
- **Writes:** service role only (the Express API), consistent with existing
  tables (`ai_usage_logs`, `int_*`, `diagnosis_catalogues`). No write policies
  for `authenticated`.
- **Reads:** owner `select` policies (`auth.uid()::text = user_id` /
  `= account_id` / `= id`) for user-owned tables; `using (true)` for reference
  data (`diagnosis_codes`); service-role-only for device-keyed
  (`user_public_keys`) and server-only (`app_settings`) tables.
- The server already binds `userId`/`accountId` from verified auth
  (`requireRouteAuth`) before writing, so service-role writes remain safe.

## 3. Partitioned execution plan (post Phase 0)

Each workstream = author repo module → rewrite that feature's call sites →
verify. **INDEPENDENT** streams touch disjoint tables/files and can be done in
parallel by different agents; **DEPENDENT** streams must follow their prerequisite.

### Prerequisite P (DEPENDENT — must land first)
**Data-layer foundation.** Create `server/services/supabaseAdmin.ts`, generate
DB types, add the repo-module skeleton. Apply the additive migrations to prod
(see §4). Nothing else can rewrite call sites until the client + tables exist.
- Risk: **Low** (additive infra). Verify: typecheck + a read smoke test per new table.

### Stream A — Diagnosis (INDEPENDENT) · Risk: Low
Files: `routes/diagnosisCodes.ts`, `services/icdTitleResolver.ts`,
`services/diagnosisCatalogueStore.ts`, `routes/criteriaGenerateDraft.ts`,
`server/index.ts` startup `diagnosisCode.count()`.
Tables: `diagnosis_codes` (+ `diagnosis_catalogues` family). Read-only, reference
data, no money/PHI. Also migrate the 4 seed scripts (`scripts/seed-diagnosis-*`,
`criteriaDraftGaps.ts`) and re-seed catalogue data into prod.
Verify: search/crosswalk/coverage endpoints return same results; ICD title
resolver unit tests (`icdTitle.test.ts`) rewritten off Prisma.

### Stream B — Patient sync + Snapshots (INDEPENDENT) · Risk: **High (patient data)**
Files: `routes/patients.ts`, `routes/workspaceVault.ts`.
Tables: `patient_cases`, `encrypted_workspace_snapshots`.
The `DELETE /patients/:caseId` flow does a Prisma `$transaction([deleteMany
snapshot, delete case])` — replace with either a small RPC or two ordered
service-role deletes (snapshot first, then case) with error handling.
Risk is data-integrity/privacy (opaque case ownership checks), not money.
Verify: list/create/patch/delete + cross-account 403 checks; snapshot
put/get/list with region-tier gating; zero plaintext PHI assertions.

### Stream C — Crypto / key backups (INDEPENDENT) · Risk: Medium
Files: `routes/accountBackup.ts`, `routes/crypto.ts`.
Tables: `account_key_backups`, `account_registry_backups`, `user_public_keys`.
Pure upsert/find/delete by `user_id`/`device_id`. Verify: status/key/registry
round-trips; ciphertext-only invariant; region gating for public-key reg.

### Stream D — Credits / ledger / billing (DEPENDENT on P) · Risk: **Highest (money)**
Files: `ai/creditGuard.ts`, `services/credits.ts`, `services/creditMigration.ts`,
`services/stripeCredits.ts`, plus the credit unit test
(`creditSystem.test.ts`). Tables: `ai_credit_accounts`, `ai_credit_ledger`,
`credit_balances`, `app_settings`. Uses the §2.2 RPCs.
Do this **single-threaded** (one agent), last among the high-risk streams, with
the most testing. Concurrency correctness (no double-grant, no negative bucket,
Stripe idempotency) must be re-proven against the RPCs.
Verify: port `creditSystem.test.ts` to hit RPCs; concurrency tests (parallel
debits, parallel monthly-grant, duplicate Stripe webhook); manual ledger
reconciliation; staging Stripe webhook replay.

### Stream E — AI usage logging (INDEPENDENT, but see OQ-1) · Risk: Low
File: `ai/usageLogger.ts`. Blocked on the OQ-1 decision (converge onto
`ai_usage_logs` vs dedicated table). Once decided, additive `ALTER` (add `mode`,
`credits_charged`) or new table, then rewrite the two queries.

### Stream F — Infra / lifecycle (DEPENDENT, last) · Risk: Low
Files: `server/db.ts` (delete), `server/lifecycle.ts` (drop `prisma.$disconnect`),
`server/index.ts` readiness probe (replace `prisma.$queryRaw` with a supabase
ping or a trivial `select 1` via the admin client). Only after A–E no longer
import `prisma`.

### Stream G — Prisma removal + build cleanup (DEPENDENT, final) · Risk: Medium
Only when **zero** `@prisma/client` / `prisma` imports remain (verify with grep):
- `package.json`: remove `@prisma/client`, `prisma` deps; delete `postinstall`
  `prisma generate`, `migrate:deploy`, `db:generate/push/migrate/studio`; repoint
  or drop the Prisma-backed `db:*` / `criteria:*` scripts.
- `Dockerfile`: remove both `COPY prisma`, both `npx prisma generate`.
- `docker-entrypoint.sh`: remove the `prisma migrate deploy` block (migrations
  now run via Supabase CLI in CI/deploy).
- Delete `prisma/` (after porting `prisma/data/*` JSON used by seed scripts) and
  the `DATABASE_URL`/`DIRECT_URL` env wiring + `server/db.ts` warnings.
- Update docs (`DATABASE.md`, `cloud-deployment.md`, `PRODUCT_OVERVIEW.md`,
  `database-migration-policy.md`).
Verify: clean `npm ci` (no Prisma), Docker build, full test suite, typecheck.

### Parallelisation summary
- **Parallel now (after P):** A, B, C, E (disjoint files/tables).
- **Serial / gated:** P → (A|B|C|E in parallel) and P → D (alone) → then F → then G.
- D should not share an agent with anything else due to money risk.

## 4. Migration apply strategy

1. **Backup first.** Take a fresh prod backup / PITR checkpoint before any DDL.
2. **Reconcile history (critical).** Remote migration versions diverge from repo
   filenames, and some remote migrations are absent from the repo (see
   `02-schema-gap.md` §4). Do **not** blindly `supabase db push`. Options:
   pull/repair the migration history (`supabase migration repair` / `db pull`)
   so repo and remote agree, **or** apply the four consolidation files
   explicitly via the MCP `apply_migration` tool one at a time.
3. **Apply order:** `20260701000000_diagnosis_catalogue.sql` (already authored) →
   `20260704000000_consolidation_credit_system.sql` →
   `20260704000100_consolidation_patient_crypto_backup.sql` →
   `20260704000200_consolidation_diagnosis_codes.sql`. (000100 depends on the
   `psy_set_updated_at()` function created in 000000.)
4. **Verify each:** re-run the `list_tables` / `information_schema` checks; run
   `get_advisors` (security + performance) to confirm RLS is enabled and no new
   lint; confirm RPC `execute` grants are service-role only.
5. **Seed:** run the (migrated) diagnosis seed scripts to populate
   `diagnosis_codes` + catalogue tables.
6. **Then** deploy the rewritten server. Migrations are additive, so the old
   (Prisma) and new (supabase-js) code can coexist on the same tables during
   rollout if needed — but Prisma still can't see these snake_case tables, so the
   cutover is per-feature at deploy time.

## 5. Open questions / risks (resolve before execution)

- **OQ-1 — AiUsageLog convergence.** Adopt the existing org/cost-centric
  `ai_usage_logs` (additive `ALTER` to add `mode`, `credits_charged`; note
  `organisation_id` is `uuid` there vs `text` in Prisma) or create a dedicated
  per-user metadata table? Recommendation: converge on `ai_usage_logs`.
- **OQ-2 — Stripe idempotency shape.** Keep app-level two-step (marker insert
  gate + grant RPC) or fold both into one RPC for true single-statement
  atomicity? Recommendation: one RPC that inserts the marker and grants, relying
  on the `app_settings` PK unique violation for idempotency.
- **OQ-3 — ID type change (cuid → uuid).** New surrogate keys use
  `gen_random_uuid()` instead of Prisma cuids. Safe because these tables hold no
  prod data, but any client code/tests that assumed cuid string ids must be
  checked (notably `usageLogId` linkage between usage logs and ledger, and any
  fixtures).
- **OQ-4 — Migration history reconciliation.** Confirm the preferred mechanism
  (repair vs explicit `apply_migration`) and who owns the remote-only migrations
  missing from the repo — these should be back-filled into `supabase/migrations/`
  for reproducibility.
- **OQ-5 — `credit_balances` default drift.** Prisma schema default is `200`,
  but `services/credits.ts` seeds the legacy `'default'` account with `500`.
  Migration uses `200` (schema-faithful); confirm intended legacy seed value.
- **Risk — credits/billing (Stream D).** Money-affecting; requires concurrency +
  Stripe-replay testing on staging before prod cutover.
- **Risk — patient data (Stream B).** Ownership checks and region-tier gating
  must be preserved exactly; verify no plaintext PHI ever reaches the server.
- **Risk — seed scripts + diagnosis data.** `diagnosis_*` tables ship empty;
  search/crosswalk silently returns nothing until re-seeded post-apply.
