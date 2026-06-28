-- ===========================================================================
-- user_legal_acceptances — record the AVV (Auftragsverarbeitungsvertrag /
-- Data Processing Agreement) acceptance alongside the existing Datenschutz
-- (privacy_version) and AGB (terms_version) acceptances captured at signup.
--
-- A German clinical product (GDPR/DSGVO) requires clinicians who process
-- patient data to accept the AVV. This adds the audit column storing the AVV
-- document version accepted; accepted_at (already on the row) supplies the
-- timestamp. The version token is the shared LEGAL_LAST_UPDATED, written by the
-- service-role API (POST /api/account/legal-consent) — same as the other
-- versions, so the storage pattern is extended, not replaced.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe
--         (ADD COLUMN IF NOT EXISTS only). The coordinator applies it at deploy.
--
-- Nullable on purpose: any acceptance row recorded before the AVV requirement
-- existed keeps avv_version = NULL, which cleanly flags "accepted before AVV"
-- for an eventual re-consent backfill. New acceptances always populate it.
-- ===========================================================================

alter table public.user_legal_acceptances
  add column if not exists avv_version text;

comment on column public.user_legal_acceptances.avv_version is
  'AVV (Auftragsverarbeitungsvertrag / DPA) document version accepted at signup. NULL for acceptances recorded before the AVV consent requirement existed.';
