-- ===========================================================================
-- user_legal_acceptances — durable record of each user's acceptance of the
-- Datenschutzerklärung (privacy policy) and AGB (terms) at signup.
--
-- One row per (user_id, terms_version): a user has exactly one recorded
-- acceptance per legal-document version. When the legal copy is revised the
-- version token (shared/legalVersion.ts → LEGAL_LAST_UPDATED) is bumped, which
-- lets a fresh acceptance be recorded for the new version while the historical
-- ones remain for audit.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe
--         (CREATE ... IF NOT EXISTS only). The coordinator applies it at deploy.
--
-- Security model (mirrors 20260705000100_referral_system.sql):
--   * RLS enabled.
--   * Owners may SELECT their own rows (auth.uid() = user_id).
--   * INSERT/UPDATE/DELETE are NOT granted to anon/authenticated — writes happen
--     exclusively through the service-role API endpoint
--     (POST /api/account/legal-consent), which binds user_id from the verified
--     bearer token. Table privileges are revoked from public/anon/authenticated
--     and granted to service_role only.
--   * The unique (user_id, terms_version) constraint makes the server insert
--     idempotent (ON CONFLICT DO NOTHING) so the email-confirmation retry path
--     can re-POST safely without creating duplicate acceptances.
-- ===========================================================================

create table if not exists public.user_legal_acceptances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  privacy_version text not null,
  terms_version   text not null,
  locale          text,
  accepted_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint user_legal_acceptances_user_terms_unique unique (user_id, terms_version)
);

create index if not exists user_legal_acceptances_user_idx
  on public.user_legal_acceptances (user_id);

comment on table public.user_legal_acceptances is
  'Durable record of each user''s Datenschutz/AGB acceptance. One row per (user_id, terms_version); written via the service-role API only.';

-- ---------------------------------------------------------------------------
-- Table privileges. Writes (INSERT/UPDATE/DELETE) are revoked from
-- public/anon/authenticated and granted to service_role ONLY — every write
-- flows through the service-role API (POST /api/account/legal-consent), which
-- binds user_id from the verified bearer token. SELECT is left granted to
-- authenticated so the owner-read RLS policy below can take effect (Supabase
-- grants authenticated default table privileges; this is explicit + idempotent).
-- ---------------------------------------------------------------------------
revoke insert, update, delete on table public.user_legal_acceptances from public, anon, authenticated;
grant select on table public.user_legal_acceptances to authenticated;
grant select, insert, update, delete on table public.user_legal_acceptances to service_role;

-- ---------------------------------------------------------------------------
-- RLS — owner may read their own acceptance rows. Writes via service role only
-- (service_role bypasses RLS; no INSERT/UPDATE/DELETE policy is defined for
-- authenticated, and DML is revoked above, so anon/authenticated cannot write).
-- ---------------------------------------------------------------------------
alter table public.user_legal_acceptances enable row level security;

drop policy if exists user_legal_acceptances_select_owner on public.user_legal_acceptances;
create policy user_legal_acceptances_select_owner
  on public.user_legal_acceptances for select to authenticated
  using (auth.uid() = user_id);
