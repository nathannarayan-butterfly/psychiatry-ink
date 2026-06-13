-- ============================================================================
-- Legacy JSONB KB tables — tighten write RLS
-- ============================================================================
-- Architecture:
--   • Normalized kb_* tables = source of truth (AI seed → review → publish)
--   • knowledge_base_drugs / knowledge_base_preparations = optional cached
--     projections for the clinician monograph UI (read-mostly)
--   • One-way normalized → JSONB sync is deferred; service_role may write
--     projections when export is implemented.
--
-- Requires: public.is_kb_editor() from kb_normalized_schema migration.
-- ============================================================================

-- ── knowledge_base_drugs ─────────────────────────────────────────────────────
-- READ: public (anon + authenticated) — clinician KB remains readable.
-- WRITE: kb editors only (app_metadata.kb_admin = true).

drop policy if exists knowledge_base_drugs_insert on public.knowledge_base_drugs;
drop policy if exists knowledge_base_drugs_update on public.knowledge_base_drugs;
drop policy if exists knowledge_base_drugs_delete on public.knowledge_base_drugs;

create policy knowledge_base_drugs_insert_editor
  on public.knowledge_base_drugs
  for insert
  to authenticated
  with check (public.is_kb_editor());

create policy knowledge_base_drugs_update_editor
  on public.knowledge_base_drugs
  for update
  to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());

create policy knowledge_base_drugs_delete_editor
  on public.knowledge_base_drugs
  for delete
  to authenticated
  using (public.is_kb_editor());

-- ── knowledge_base_preparations ──────────────────────────────────────────────

drop policy if exists knowledge_base_preparations_insert on public.knowledge_base_preparations;
drop policy if exists knowledge_base_preparations_update on public.knowledge_base_preparations;
drop policy if exists knowledge_base_preparations_delete on public.knowledge_base_preparations;

create policy knowledge_base_preparations_insert_editor
  on public.knowledge_base_preparations
  for insert
  to authenticated
  with check (public.is_kb_editor());

create policy knowledge_base_preparations_update_editor
  on public.knowledge_base_preparations
  for update
  to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());

create policy knowledge_base_preparations_delete_editor
  on public.knowledge_base_preparations
  for delete
  to authenticated
  using (public.is_kb_editor());
