-- ============================================================================
-- Wissensdatenbank (KB) — shared medication entries
-- ============================================================================
-- Global clinical reference content (NOT patient data, NOT encrypted) shared
-- across ALL users and devices. The full KnowledgeBaseDrug object is stored as
-- a single JSONB column to preserve the deeply-nested, forward-compatible shape
-- (sections, structured payloads, receptor profile v2, audit metadata, etc.).
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) once.
-- Idempotent: safe to re-run.
-- ============================================================================

create table if not exists public.knowledge_base_drugs (
  id           text primary key,
  data         jsonb       not null,
  collection_id text,
  generic_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Cheap filtering / sorting without cracking open the JSONB blob.
create index if not exists knowledge_base_drugs_collection_id_idx
  on public.knowledge_base_drugs (collection_id);
create index if not exists knowledge_base_drugs_generic_name_idx
  on public.knowledge_base_drugs (generic_name);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- READ: public (anon + authenticated) — the KB is readable by everyone.
-- WRITE: kb editors only (`is_kb_editor()` / app_metadata.kb_admin).
-- Service role bypasses RLS for projection sync (deferred).
alter table public.knowledge_base_drugs enable row level security;

drop policy if exists knowledge_base_drugs_select on public.knowledge_base_drugs;
create policy knowledge_base_drugs_select
  on public.knowledge_base_drugs
  for select
  to anon, authenticated
  using (true);

drop policy if exists knowledge_base_drugs_insert on public.knowledge_base_drugs;
create policy knowledge_base_drugs_insert_editor
  on public.knowledge_base_drugs
  for insert
  to authenticated
  with check (public.is_kb_editor());

drop policy if exists knowledge_base_drugs_update on public.knowledge_base_drugs;
create policy knowledge_base_drugs_update_editor
  on public.knowledge_base_drugs
  for update
  to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());

drop policy if exists knowledge_base_drugs_delete on public.knowledge_base_drugs;
create policy knowledge_base_drugs_delete_editor
  on public.knowledge_base_drugs
  for delete
  to authenticated
  using (public.is_kb_editor());

-- ── Optional: keep updated_at fresh on every update ─────────────────────────
create or replace function public.set_knowledge_base_drugs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists knowledge_base_drugs_set_updated_at on public.knowledge_base_drugs;
create trigger knowledge_base_drugs_set_updated_at
  before update on public.knowledge_base_drugs
  for each row
  execute function public.set_knowledge_base_drugs_updated_at();
