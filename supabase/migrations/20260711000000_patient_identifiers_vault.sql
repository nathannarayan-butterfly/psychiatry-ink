-- ===========================================================================
-- Design D — patient identifier vault (per-case ciphertext rows).
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe
--         (`create table if not exists`, no alters/drops of existing tables).
--
-- DEPLOYMENT NOTE: this migration ships the *schema only* as part of the
-- 2026-06-30 Design D rollout. The full identifier-vault client (passphrase-
-- derived key + unlock dialog + initials masking + existing-row migration)
-- is intentionally DEFERRED until the next pass — see the report in
-- `DESIGN_D_REPORT.md`. The table can sit empty in production indefinitely
-- without affecting any clinical flow; landing the schema now means the
-- client work can ship without a follow-up DB migration window.
--
-- The audit (2026-06-30) confirmed clinical tables do NOT carry patient
-- names today. This migration formalises that invariant by introducing a
-- dedicated identifier vault keyed by `case_id`. Clinical tables
-- (anamnesis, diagnoses, medications, notes, lab, verlauf, isdm,
-- butterfly, …) MUST continue to reference only the opaque `case_id`
-- UUID and MUST NEVER carry a name or DOB column. Per-row ciphertext is
-- written by the client with a passphrase-derived AES-GCM key the server
-- cannot reconstruct.
--
-- Recovery (when the client lands): passphrase only at initial release,
-- with an optional printed backup code as a stretch goal. Lost passphrase
-- AND lost backup code = unrecoverable identifiers; clinical content
-- remains readable since it is encrypted with the existing per-device RSA
-- model.
--
-- Re-enable plan for cross-account identifier sharing (e.g. Praxis-wide):
-- introduce per-org wrapping keys (mirror of `org_calendar_keys`). Out of
-- scope for this initial vault rollout.
-- ===========================================================================

create table if not exists public.patient_identifiers (
  case_id        text primary key,
  owner_user_id  text not null,
  ciphertext     text not null,
  iv             text not null,
  salt           text not null,
  iterations     integer not null default 310000,
  version        integer not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists patient_identifiers_owner_updated_idx
  on public.patient_identifiers (owner_user_id, updated_at desc);

drop trigger if exists patient_identifiers_set_updated_at on public.patient_identifiers;
create trigger patient_identifiers_set_updated_at
  before update on public.patient_identifiers
  for each row execute function public.psy_set_updated_at();

comment on table public.patient_identifiers is
  'Per-case identifier ciphertext (Design D vault). Server never holds the passphrase key. '
  'Clinical tables must reference only the opaque case_id and MUST NEVER carry name/DOB columns.';

alter table public.patient_identifiers enable row level security;

drop policy if exists patient_identifiers_select_owner on public.patient_identifiers;
create policy patient_identifiers_select_owner
  on public.patient_identifiers for select to authenticated
  using (owner_user_id = auth.uid()::text);
