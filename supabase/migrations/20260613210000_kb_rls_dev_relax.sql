-- ============================================================================
-- KB RLS — dev/MVP relaxation
-- ============================================================================
-- Goal: seed script + admin API (service_role) + admin UI work without
-- kb_admin JWT claims. Public read on all kb_* rows including ai_draft.
-- Writes go through service_role (seed + /api/kb-admin); no anon write on kb_*.
-- Legacy JSONB tables: public read + permissive write for dev clinician UI.
-- Tighten when auth hierarchy lands (see docs/kb-dual-model.md).
-- ============================================================================

-- ── kb_substances ───────────────────────────────────────────────────────────
drop policy if exists kb_substances_select_published on public.kb_substances;
drop policy if exists kb_substances_select_editor on public.kb_substances;
drop policy if exists kb_substances_write_editor on public.kb_substances;

create policy kb_substances_select_all
  on public.kb_substances for select to anon, authenticated
  using (true);

-- ── Child tables (trade names, affinities, etc.) ────────────────────────────
drop policy if exists kb_trade_names_select_public on public.kb_substance_trade_names;
drop policy if exists kb_trade_names_select_editor on public.kb_substance_trade_names;
drop policy if exists kb_trade_names_write_editor on public.kb_substance_trade_names;

create policy kb_trade_names_select_all
  on public.kb_substance_trade_names for select to anon, authenticated
  using (true);

do $policy$
declare
  tbl text;
  tables text[] := array[
    'kb_receptor_affinities',
    'kb_side_effects',
    'kb_monitoring_recommendations',
    'kb_dosage_guidance',
    'kb_country_preparations',
    'kb_interaction_notes',
    'kb_sources',
    'kb_revision_history'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists %I_select_public on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_select_editor on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_write_editor on public.%I', tbl, tbl);
    execute format(
      'create policy %I_select_all on public.%I for select to anon, authenticated using (true)',
      tbl, tbl
    );
  end loop;
end;
$policy$;

-- ── kb_ai_generations (admin audit; readable in dev, writes via service_role) ─
drop policy if exists kb_ai_generations_select_editor on public.kb_ai_generations;
drop policy if exists kb_ai_generations_write_editor on public.kb_ai_generations;

create policy kb_ai_generations_select_all
  on public.kb_ai_generations for select to anon, authenticated
  using (true);

-- ── Legacy JSONB — dev write without kb_admin claim ─────────────────────────
drop policy if exists knowledge_base_drugs_insert_editor on public.knowledge_base_drugs;
drop policy if exists knowledge_base_drugs_update_editor on public.knowledge_base_drugs;
drop policy if exists knowledge_base_drugs_delete_editor on public.knowledge_base_drugs;

create policy knowledge_base_drugs_write_dev
  on public.knowledge_base_drugs for all to anon, authenticated
  using (true)
  with check (true);

drop policy if exists knowledge_base_preparations_insert_editor on public.knowledge_base_preparations;
drop policy if exists knowledge_base_preparations_update_editor on public.knowledge_base_preparations;
drop policy if exists knowledge_base_preparations_delete_editor on public.knowledge_base_preparations;

create policy knowledge_base_preparations_write_dev
  on public.knowledge_base_preparations for all to anon, authenticated
  using (true)
  with check (true);
