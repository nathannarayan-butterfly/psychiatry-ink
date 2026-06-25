# Consolidation Apply Log (Prerequisite P)

> Execution record for applying the Phase-0 additive migrations to the live
> Supabase prod project (`dxngbuinxutzirowbjgb`) on branch
> `feat/supabase-consolidation`. Companion to `00-plan.md` §4.

## 0. Environment constraints

`pg_dump`, `psql`, and the Supabase CLI are **not** available in this execution
environment, and `npx supabase` cannot download (network is allowlist-only and
the call hangs). All DB work was therefore done through the **Supabase MCP**
(`execute_sql` / `apply_migration`) per OQ-4.

## 1. Backup (taken BEFORE any DDL)

| Item | Value |
| --- | --- |
| Structural backup file | `scripts/output/consolidation-backups/preP-20260625T183639Z.sql` (~97 KB; gitignored via `scripts/output/`) |
| Backup method | MCP `pg_catalog` introspection — reconstructed DDL for all **65** public tables: tables, constraints, indexes, RLS flags, policies, triggers, and all 12 functions |
| ALTER target | `public.ai_usage_logs` — **3759 rows** at capture time (~3.5 MB) |
| Data backup of ALTER target | Server-side full copy → `consolidation_backup.ai_usage_logs_prep_20260625` (**3759 rows**, verified == source; RLS enabled, schema not API-exposed) |
| Restore of ALTER target | `insert into public.ai_usage_logs select * from consolidation_backup.ai_usage_logs_prep_20260625;` |

Row data for `ai_usage_logs` is intentionally **not** inlined in the `.sql` file
(too large to route through the agent context, and broad row dumps are blocked);
the in-DB snapshot is the authoritative, instantly-restorable data backup. All
consolidation migrations are additive (CREATE new objects + `ADD COLUMN IF NOT
EXISTS` on `ai_usage_logs`), so rollback = drop the new objects/columns; no
existing object is altered or dropped.

## 2. Pre-apply live state (verified via MCP)

- **Target tables absent (14):** `ai_credit_accounts`, `ai_credit_ledger`,
  `credit_balances`, `app_settings`, `patient_cases`, `user_public_keys`,
  `encrypted_workspace_snapshots`, `account_key_backups`,
  `account_registry_backups`, `diagnosis_codes`, `diagnosis_catalogues`,
  `diagnosis_entries`, `diagnosis_synonyms`, `diagnosis_criteria_links`
  (`information_schema.tables` returned none of them).
- **Functions present (12):** `dc_is_participant`, `dc_purge_abandoned`,
  `is_kb_editor`, `kb_substance_is_public`, `ks_is_participant`,
  `ks_purge_abandoned`, `org_is_member`, `org_provision_personal_org`,
  `purge_abandoned_shared_material`, `set_kb_updated_at`,
  `set_knowledge_base_drugs_updated_at`,
  `set_knowledge_base_preparations_updated_at`. None of the consolidation RPCs
  (`psy_set_updated_at`, `ai_credit_*`) exist yet.
- **`ai_usage_logs` (OQ-1 target):** exists, uuid PK, `organisation_id` is
  **uuid** (Prisma modelled it as text — accommodated in the data layer, not by
  altering the column). Columns `mode` and `credits_charged` are **absent** →
  the additive ALTER will add them.

## 3. Migrations applied

Applied via Supabase MCP `apply_migration` (one at a time, OQ-4). Recorded remote
versions differ from repo filenames — this is the **pre-existing** divergence
pattern (e.g. repo `…_integration_hub` ↔ remote `20260614101224`); the existing
43 remote migrations were **not** disturbed, only appended to.

| Order | Repo file | Recorded remote version / name | Result |
| --- | --- | --- | --- |
| 1 | `20260701000000_diagnosis_catalogue.sql` | `20260625183856` `consolidation_diagnosis_catalogue` | ✅ |
| 2 | `20260704000000_consolidation_credit_system.sql` | `20260625184038` `consolidation_credit_system` | ✅ |
| 3 | `20260704000100_consolidation_patient_crypto_backup.sql` | `20260625184137` `consolidation_patient_crypto_backup` | ✅ |
| 4 | `20260704000200_consolidation_diagnosis_codes.sql` | `20260625184150` `consolidation_diagnosis_codes` | ✅ |
| 5 | (security follow-up, see §3.2) | `consolidation_credit_rpcs_lock_execute` | ✅ |

### 3.1 Verification (all via MCP after each apply)

**Tables (15 created, all `relrowsecurity = true`):**

| Table | RLS | Policies | Notes |
| --- | --- | --- | --- |
| `diagnosis_catalogues` / `diagnosis_entries` / `diagnosis_synonyms` / `diagnosis_criteria_links` | ✅ | 1 each | reference read policies |
| `ai_credit_accounts` / `ai_credit_ledger` / `credit_balances` | ✅ | 1 each | owner-read |
| `app_settings` | ✅ | 0 | service-role only (intentional) |
| `patient_cases` / `encrypted_workspace_snapshots` / `account_key_backups` / `account_registry_backups` | ✅ | 1 each | owner-read |
| `user_public_keys` | ✅ | 0 | device-keyed, service-role only (intentional) |
| `diagnosis_codes` | ✅ | 1 | reference read |

**RPCs (5 created):** `psy_set_updated_at`, `ai_credit_ensure_account`,
`ai_credit_debit`, `ai_credit_refund`, `ai_credit_grant_purchased` — all present.

**OQ-1:** `ai_usage_logs.mode` (text, nullable) and `ai_usage_logs.credits_charged`
(integer NOT NULL default 0) added; existing 25 columns untouched (`organisation_id`
remains uuid).

**OQ-5:** `credit_balances.balance` default = **500**;
`ai_credit_accounts.monthly_credits` default = **500**.

### 3.2 Security follow-up (important)

`get_advisors(security)` after step 4 flagged the 5 new functions as executable by
`anon` **and** `authenticated` via `/rest/v1/rpc/*`. Root cause: Supabase default
privileges grant EXECUTE on new `public` functions to `anon`/`authenticated`
explicitly, and `revoke … from public` (as authored) does **not** remove those.
For the SECURITY DEFINER, money-affecting credit RPCs this was a
privilege-escalation hole (e.g. anyone could call `ai_credit_grant_purchased`).

**Fix applied** (migration `consolidation_credit_rpcs_lock_execute`):
`revoke all … from anon, authenticated, public` on all 5 functions; re-`grant
execute … to service_role`. Re-verified: `anon_exec = false`,
`auth_exec = false`, `service_exec = true` for every function. The source file
`20260704000000_consolidation_credit_system.sql` was updated to revoke from
`public, anon, authenticated` so the repo matches prod.

### 3.3 Remaining advisor notes (accepted / out of scope)

- `rls_enabled_no_policy` (INFO) on `app_settings`, `user_public_keys`, and the
  backup table `consolidation_backup.ai_usage_logs_prep_20260625` — **intentional**
  (service-role-only / non-API-exposed; deny-by-default for other roles).
- `authenticated_security_definer_function_executable` (WARN) on pre-existing
  helper fns (`dc_is_participant`, `ks_is_participant`, `org_is_member`,
  `is_kb_editor`) — pre-existing, not created by this work; out of scope.
- `auth_leaked_password_protection` (WARN) — pre-existing project auth setting;
  out of scope.
