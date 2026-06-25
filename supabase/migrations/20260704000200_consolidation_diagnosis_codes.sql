-- ===========================================================================
-- Supabase consolidation (Prisma removal) — Phase 0: legacy diagnosis code
-- crosswalk table.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe.
--
-- Replaces the Prisma model DiagnosisCode (the legacy ICD-10/ICD-11/DSM-5-TR
-- crosswalk used by server/routes/diagnosisCodes.ts and
-- server/services/icdTitleResolver.ts). This is reference data only — never
-- patient data.
--
-- NOTE: The richer DiagnosisCatalogue / DiagnosisEntry / DiagnosisSynonym /
-- DiagnosisCriteriaLink models already have an authored (also NOT-yet-applied)
-- migration at supabase/migrations/20260701000000_diagnosis_catalogue.sql. This
-- file only adds the legacy flat crosswalk table that migration did not cover.
-- ===========================================================================

create table if not exists public.diagnosis_codes (
  system       text not null,
  code         text not null,
  label_de     text not null,
  icd10_code   text not null,
  icd10_label  text not null,
  icd11_code   text not null default '',
  icd11_label  text not null default '',
  dsm_code     text not null default '',
  dsm_label    text not null default '',
  search_text  text not null,
  constraint diagnosis_codes_pkey primary key (system, code)
);

create index if not exists diagnosis_codes_system_search_idx
  on public.diagnosis_codes (system, search_text);

create index if not exists diagnosis_codes_icd10_idx
  on public.diagnosis_codes (icd10_code);

comment on table public.diagnosis_codes is
  'Legacy ICD-10/ICD-11/DSM-5-TR crosswalk for autocomplete. Reference data only — no PHI.';

-- ---------------------------------------------------------------------------
-- RLS — reference data readable by all authenticated users; writes via service
-- role only (consistent with diagnosis_catalogues).
-- ---------------------------------------------------------------------------

alter table public.diagnosis_codes enable row level security;

drop policy if exists diagnosis_codes_read on public.diagnosis_codes;
create policy diagnosis_codes_read
  on public.diagnosis_codes for select to authenticated
  using (true);
