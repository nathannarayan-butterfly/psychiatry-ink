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

_(filled in during sub-step 3)_
