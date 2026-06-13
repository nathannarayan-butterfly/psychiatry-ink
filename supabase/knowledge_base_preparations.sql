-- ============================================================================
-- Wissensdatenbank (KB) — country-specific medication preparations
-- ============================================================================
-- Country-specific market availability / preparations (NOT patient data, NOT
-- encrypted) shared across ALL users and devices. The full
-- MedicationMarketAvailability object is stored as a single JSONB column to
-- preserve the forward-compatible shape (audit metadata, source references,
-- product identifiers, etc.). Selected fields are denormalized into typed
-- columns for cheap filtering/sorting without cracking open the JSONB blob.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) once.
-- Idempotent: safe to re-run.
-- ============================================================================

create table if not exists public.knowledge_base_preparations (
  id                  text primary key,
  data                jsonb       not null,
  substance_id        text,
  country_code        text,
  verification_status text,
  generic_name        text,
  trade_name          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Cheap filtering / sorting without cracking open the JSONB blob.
create index if not exists knowledge_base_preparations_substance_id_idx
  on public.knowledge_base_preparations (substance_id);
create index if not exists knowledge_base_preparations_country_code_idx
  on public.knowledge_base_preparations (country_code);
create index if not exists knowledge_base_preparations_verification_status_idx
  on public.knowledge_base_preparations (verification_status);
create index if not exists knowledge_base_preparations_generic_name_idx
  on public.knowledge_base_preparations (generic_name);
create index if not exists knowledge_base_preparations_trade_name_idx
  on public.knowledge_base_preparations (trade_name);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- READ: public (anon + authenticated) — the KB is readable by everyone.
-- WRITE: kb editors only (`is_kb_editor()` / app_metadata.kb_admin).
-- Service role bypasses RLS for projection sync (deferred).
alter table public.knowledge_base_preparations enable row level security;

drop policy if exists knowledge_base_preparations_select on public.knowledge_base_preparations;
create policy knowledge_base_preparations_select
  on public.knowledge_base_preparations
  for select
  to anon, authenticated
  using (true);

drop policy if exists knowledge_base_preparations_insert on public.knowledge_base_preparations;
create policy knowledge_base_preparations_insert_editor
  on public.knowledge_base_preparations
  for insert
  to authenticated
  with check (public.is_kb_editor());

drop policy if exists knowledge_base_preparations_update on public.knowledge_base_preparations;
create policy knowledge_base_preparations_update_editor
  on public.knowledge_base_preparations
  for update
  to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());

drop policy if exists knowledge_base_preparations_delete on public.knowledge_base_preparations;
create policy knowledge_base_preparations_delete_editor
  on public.knowledge_base_preparations
  for delete
  to authenticated
  using (public.is_kb_editor());

-- ── Optional: keep updated_at fresh on every update ─────────────────────────
create or replace function public.set_knowledge_base_preparations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists knowledge_base_preparations_set_updated_at on public.knowledge_base_preparations;
create trigger knowledge_base_preparations_set_updated_at
  before update on public.knowledge_base_preparations
  for each row
  execute function public.set_knowledge_base_preparations_updated_at();
