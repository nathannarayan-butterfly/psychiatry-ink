# Live Schema Gap Analysis

> Comparison of Prisma models against the **live production** Supabase database
> (project ref `dxngbuinxutzirowbjgb`), enumerated via the Supabase MCP
> (`information_schema` + `list_migrations`) on this branch. Read-only; no schema
> changes were applied.

## 1. Live production tables (`public`, base tables)

65 base tables exist in prod. Grouped by prefix:

- **Knowledge base**: `kb_ai_generations`, `kb_contribution_discussions`,
  `kb_contribution_reviews`, `kb_contribution_votes`, `kb_contributions`,
  `kb_country_preparations`, `kb_dosage_guidance`, `kb_field_provenance`,
  `kb_interaction_notes`, `kb_monitoring_recommendations`, `kb_pharmacokinetics`,
  `kb_receptor_affinities`, `kb_releases`, `kb_revision_history`,
  `kb_side_effects`, `kb_sources`, `kb_substance_trade_names`, `kb_substances`,
  `knowledge_base_drugs`, `knowledge_base_preparations`
- **Organisations / enterprise**: `org_audit_logs`, `org_calendar_keys`,
  `org_case_access`, `org_case_vault_keys`, `org_case_vault_snapshots`,
  `org_invitations`, `org_member_vault_keys`, `org_members`, `org_module_access`,
  `org_organisations`, `org_sites`, `org_sso_config`, `org_teams`
- **Discuss-case (`dc_`) / Konsil (`ks_`)**: `dc_ai_requests`, `dc_annotations`,
  `dc_audit_logs`, `dc_discussion_packages`, `dc_discussions`, `dc_invites`,
  `dc_messages`, `dc_participants`, `ks_audit_logs`, `ks_consultation_requests`,
  `ks_invites`, `ks_messages`, `ks_participants`, `ks_reports`, `ks_shared_items`
- **Calendar / integration / AI usage**: `cal_calendar_items`,
  `cal_reschedule_log`, `int_*` (10 tables), `ai_budget_configs`,
  `ai_budget_warnings`, `ai_usage_logs`
- **Misc**: `GenerationLog`, `todos`

RLS helper functions present in prod (reused by the authored migrations):
`org_is_member(uuid)`, `dc_is_participant(uuid)`, `ks_is_participant(uuid)`,
`is_kb_editor()`, `kb_substance_is_public(uuid)`, plus `set_*_updated_at`
triggers and `*_purge_abandoned` jobs.

## 2. Model → table classification

| Prisma model | Expected snake_case table | Live status | Notes |
| --- | --- | --- | --- |
| `GenerationLog` | (kept as `GenerationLog`) | ✅ **EXISTS (matches)** | Only Prisma model ever applied to prod. All 19 columns present with exact PascalCase names + types (`id text`, `createdAt timestamptz`, `creditsDeducted boolean default false`, …). Managed by remote migrations `generation_log_ownership` / `generation_log_owner_read_policy`. |
| `AiUsageLog` | `ai_usage_logs` | ⚠️ **DRIFT (name collision, different purpose)** | A table named `ai_usage_logs` exists but is the **org/cost-centric** budget-tracking table (migration `ai_usage_budget_tracking`), not the Prisma per-user metadata log. See §3. |
| `CreditBalance` | `credit_balances` | ❌ **MISSING** | — |
| `AppSetting` | `app_settings` | ❌ **MISSING** | Used for Stripe webhook idempotency markers — billing-critical. |
| `UserPublicKey` | `user_public_keys` | ❌ **MISSING** | — |
| `EncryptedWorkspaceSnapshot` | `encrypted_workspace_snapshots` | ❌ **MISSING** | — |
| `AccountKeyBackup` | `account_key_backups` | ❌ **MISSING** | — |
| `AccountRegistryBackup` | `account_registry_backups` | ❌ **MISSING** | — |
| `PatientCase` | `patient_cases` | ❌ **MISSING** | — |
| `DiagnosisCode` | `diagnosis_codes` | ❌ **MISSING** | Legacy flat crosswalk. |
| `AiCreditAccount` | `ai_credit_accounts` | ❌ **MISSING** | Credits fail closed in prod today. |
| `AiCreditLedger` | `ai_credit_ledger` | ❌ **MISSING** | — |
| `DiagnosisCatalogue` | `diagnosis_catalogues` | ❌ **MISSING** (migration authored, **not applied**) | Snake_case migration exists in repo at `supabase/migrations/20260701000000_diagnosis_catalogue.sql` but is **not** in the remote migration history. |
| `DiagnosisEntry` | `diagnosis_entries` | ❌ **MISSING** (authored, not applied) | Same migration as above. |
| `DiagnosisSynonym` | `diagnosis_synonyms` | ❌ **MISSING** (authored, not applied) | Same migration as above. |
| `DiagnosisCriteriaLink` | `diagnosis_criteria_links` | ❌ **MISSING** (authored, not applied) | Same migration as above. |

**Summary: 1 EXISTS (match), 1 DRIFT/collision, 14 MISSING** — of which 4
(diagnosis catalogue family) already have an authored-but-unapplied migration.
This confirms the project premise: every Prisma-backed feature except
`GenerationLog` fails closed in prod because its table does not exist.

## 3. Drift detail — `AiUsageLog` vs live `ai_usage_logs`

The live `ai_usage_logs` table (UUID PK, org-centric) overlaps but is **not** a
drop-in for the Prisma `AiUsageLog` model:

| Prisma `AiUsageLog` field | live `ai_usage_logs` column | Status |
| --- | --- | --- |
| `id` (cuid text) | `id` (uuid) | type differs |
| `createdAt` | `created_at` | ok |
| `userId` | `user_id` (text) | ok |
| `organisationId` (text) | `organisation_id` (**uuid**, FK→`org_organisations`) | type differs |
| `caseRef` | `case_id` | ok (rename) |
| `featureKey` | `feature_key` | ok |
| `mode` | — | **missing in live** |
| `provider` / `model` | `provider` / `model` | ok |
| `inputTokens` / `outputTokens` / `totalTokens` | `input_tokens` / `output_tokens` / `total_tokens` | ok |
| `creditsCharged` | — | **missing in live** |
| `durationMs` | `latency_ms` | ok (rename) |
| `success` / `errorCode` | `success` / `error_code` | ok |
| `rawProviderUsage` (text/JSON) | `raw_usage_json` (jsonb) | ok (type upgrade) |

Live `ai_usage_logs` additionally has cost columns (`estimated_cost_usd/eur`,
`currency_rate_used`, cache token splits, `request_kind`, `usage_source`,
`metadata_json`) the Prisma model lacks. **This is the one genuine schema
decision** (see open question OQ-1 in `00-plan.md`): converge `usageLogger` onto
the existing `ai_usage_logs` (adding `mode` + `credits_charged` via a *future*
additive `ALTER`) rather than create a near-duplicate table. The Phase-0
additive migrations intentionally do **not** create a competing table and do
**not** alter `ai_usage_logs`.

## 4. Migration-history divergence (risk for apply strategy)

`list_migrations` (remote) returns 43 applied migrations whose **version
timestamps do not match the repo filenames** (e.g. repo
`20260625000000_integration_hub.sql` ↔ remote version `20260614101224`
`integration_hub`). Additionally, several migrations are applied **remotely but
absent from the repo** `supabase/migrations/` folder:

- `create_knowledge_base_drugs`, `create_knowledge_base_preparations`
- `generation_log_ownership`, `generation_log_owner_read_policy`
- `kb_legacy_write_rls_tighten`, `harden_function_search_path_and_grants`

…and the repo contains migrations **not yet applied remotely**, notably
`diagnosis_catalogue` and all `2026070x` discuss-case extensions.

➡️ **Implication:** `supabase db push` cannot be assumed to cleanly reconcile.
The apply step must be done carefully (repair history / apply individual files
via `apply_migration`), and the new consolidation migrations are timestamped
`20260704000000+` to sort after everything currently in the repo. See the
"Migration apply strategy" section of `00-plan.md`.

## 5. Authored (NOT applied) consolidation migrations

| File | Creates | Covers models |
| --- | --- | --- |
| `supabase/migrations/20260704000000_consolidation_credit_system.sql` | `ai_credit_accounts`, `ai_credit_ledger`, `credit_balances`, `app_settings`; RPCs `ai_credit_ensure_account`, `ai_credit_debit`, `ai_credit_refund`, `ai_credit_grant_purchased`; `psy_set_updated_at()` trigger fn | AiCreditAccount, AiCreditLedger, CreditBalance, AppSetting |
| `supabase/migrations/20260704000100_consolidation_patient_crypto_backup.sql` | `patient_cases`, `user_public_keys`, `encrypted_workspace_snapshots`, `account_key_backups`, `account_registry_backups` | PatientCase, UserPublicKey, EncryptedWorkspaceSnapshot, AccountKeyBackup, AccountRegistryBackup |
| `supabase/migrations/20260704000200_consolidation_diagnosis_codes.sql` | `diagnosis_codes` | DiagnosisCode |
| `supabase/migrations/20260701000000_diagnosis_catalogue.sql` (pre-existing, **also unapplied**) | `diagnosis_catalogues`, `diagnosis_entries`, `diagnosis_synonyms`, `diagnosis_criteria_links` | DiagnosisCatalogue, DiagnosisEntry, DiagnosisSynonym, DiagnosisCriteriaLink |

All four are additive, `if not exists`, and never alter/drop existing tables.
`GenerationLog` needs **no** migration (already in prod). `AiUsageLog` is
deliberately deferred (OQ-1).
