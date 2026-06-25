-- ===========================================================================
-- Supabase consolidation (Prisma removal) — Phase 0: patient registry, crypto
-- keys, encrypted snapshots, and account backups.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe
--         (`create table if not exists`, no alters/drops of existing tables).
--
-- Replaces the Prisma models PatientCase, UserPublicKey,
-- EncryptedWorkspaceSnapshot, AccountKeyBackup, AccountRegistryBackup — all
-- zero-knowledge / opaque tables that never store patient names, DOB, or
-- diagnoses on the server. They were never applied to prod.
--
-- ID convention: surrogate keys use uuid; natural text keys preserved where the
-- id is externally meaningful (case_id = opaque case code; user_id = Supabase
-- user id). Depends on public.psy_set_updated_at() (created in the credit-system
-- consolidation migration 20260704000000).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- patient_cases  (Prisma model PatientCase)
--   Opaque case registry. Server stores ONLY the case code + non-identifying
--   sync metadata. Names/DOB/age live in browser localStorage / crypto vault.
-- ---------------------------------------------------------------------------

create table if not exists public.patient_cases (
  case_id             text primary key,
  account_id          text not null,
  last_document_type  text,
  last_opened         timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists patient_cases_account_last_opened_idx
  on public.patient_cases (account_id, last_opened desc);

drop trigger if exists patient_cases_set_updated_at on public.patient_cases;
create trigger patient_cases_set_updated_at
  before update on public.patient_cases
  for each row execute function public.psy_set_updated_at();

comment on table public.patient_cases is
  'Opaque case registry — case code + non-identifying sync metadata only. No PHI.';

-- ---------------------------------------------------------------------------
-- user_public_keys  (Prisma model UserPublicKey)
--   Browser-generated public key only — never a patient name/age. Keyed by
--   device id; accessed server-side (service role) after route auth.
-- ---------------------------------------------------------------------------

create table if not exists public.user_public_keys (
  id              uuid primary key default gen_random_uuid(),
  device_id       text not null unique,
  public_key_jwk  text not null,
  country_code    text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists user_public_keys_set_updated_at on public.user_public_keys;
create trigger user_public_keys_set_updated_at
  before update on public.user_public_keys
  for each row execute function public.psy_set_updated_at();

comment on table public.user_public_keys is
  'Browser-generated public key (JWK) per device. No patient identifiers. Server (service role) access only.';

-- ---------------------------------------------------------------------------
-- encrypted_workspace_snapshots  (Prisma model EncryptedWorkspaceSnapshot)
--   Zero-knowledge encrypted workspace snapshot (ciphertext only). One row per
--   (user_id, case_id). Name/age never present in ciphertext metadata.
-- ---------------------------------------------------------------------------

create table if not exists public.encrypted_workspace_snapshots (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  case_id      text not null,
  device_id    text not null,
  ciphertext   text not null,
  iv           text not null,
  wrapped_key  text not null,
  version      integer not null default 1,
  title_hint   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint encrypted_workspace_snapshots_user_case_unique unique (user_id, case_id)
);

create index if not exists encrypted_workspace_snapshots_user_updated_idx
  on public.encrypted_workspace_snapshots (user_id, updated_at desc);

drop trigger if exists encrypted_workspace_snapshots_set_updated_at on public.encrypted_workspace_snapshots;
create trigger encrypted_workspace_snapshots_set_updated_at
  before update on public.encrypted_workspace_snapshots
  for each row execute function public.psy_set_updated_at();

comment on table public.encrypted_workspace_snapshots is
  'Zero-knowledge encrypted workspace snapshot (ciphertext only). Server never decrypts. No plaintext PHI.';

-- ---------------------------------------------------------------------------
-- account_key_backups  (Prisma model AccountKeyBackup)
--   Passphrase-wrapped private key backup — ciphertext only, keyed by user id.
-- ---------------------------------------------------------------------------

create table if not exists public.account_key_backups (
  user_id     text primary key,
  salt        text not null,
  iv          text not null,
  ciphertext  text not null,
  iterations  integer not null default 310000,
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);

drop trigger if exists account_key_backups_set_updated_at on public.account_key_backups;
create trigger account_key_backups_set_updated_at
  before update on public.account_key_backups
  for each row execute function public.psy_set_updated_at();

comment on table public.account_key_backups is
  'Passphrase-wrapped private key backup (ciphertext only). Keyed by Supabase user id.';

-- ---------------------------------------------------------------------------
-- account_registry_backups  (Prisma model AccountRegistryBackup)
--   Encrypted local registry bundle (names/DOB/diagnoses live only in
--   ciphertext). Server never joins this with encrypted_workspace_snapshots.
-- ---------------------------------------------------------------------------

create table if not exists public.account_registry_backups (
  user_id     text primary key,
  salt        text not null,
  iv          text not null,
  ciphertext  text not null,
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);

drop trigger if exists account_registry_backups_set_updated_at on public.account_registry_backups;
create trigger account_registry_backups_set_updated_at
  before update on public.account_registry_backups
  for each row execute function public.psy_set_updated_at();

comment on table public.account_registry_backups is
  'Encrypted registry bundle (ciphertext only). Identifiers never stored in plaintext server-side.';

-- ---------------------------------------------------------------------------
-- RLS — owners may read their own rows; all writes via service role only.
-- The Express API already binds user_id/account_id server-side and uses the
-- service-role key (bypasses RLS) for writes; these SELECT policies are
-- defence-in-depth for any future direct authenticated reads.
-- ---------------------------------------------------------------------------

alter table public.patient_cases enable row level security;
alter table public.user_public_keys enable row level security;
alter table public.encrypted_workspace_snapshots enable row level security;
alter table public.account_key_backups enable row level security;
alter table public.account_registry_backups enable row level security;

drop policy if exists patient_cases_select_owner on public.patient_cases;
create policy patient_cases_select_owner
  on public.patient_cases for select to authenticated
  using (auth.uid()::text = account_id);

drop policy if exists encrypted_workspace_snapshots_select_owner on public.encrypted_workspace_snapshots;
create policy encrypted_workspace_snapshots_select_owner
  on public.encrypted_workspace_snapshots for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists account_key_backups_select_owner on public.account_key_backups;
create policy account_key_backups_select_owner
  on public.account_key_backups for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists account_registry_backups_select_owner on public.account_registry_backups;
create policy account_registry_backups_select_owner
  on public.account_registry_backups for select to authenticated
  using (auth.uid()::text = user_id);

-- user_public_keys: keyed by device id (not an auth uid) — service role only,
-- no authenticated policy.
