-- ============================================================================
-- Wissensdatenbank (KB) — normalized relational schema (v2)
-- ============================================================================
-- Coexists with legacy JSONB tables:
--   public.knowledge_base_drugs
--   public.knowledge_base_preparations
-- This schema stores AI-seeded psychiatric drug profiles in normalized tables
-- for batch review, enrichment, and publication. NOT patient data.
-- ============================================================================

-- ── Helper: KB editor/admin check (MVP) ─────────────────────────────────────
-- Editors are users with app_metadata.kb_admin = true (set in Supabase Auth).
-- Service-role and postgres bypass RLS. Seed script uses service role.
create or replace function public.is_kb_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'kb_admin')::boolean,
    false
  );
$$;

-- ── kb_substances ───────────────────────────────────────────────────────────
create table if not exists public.kb_substances (
  id                        uuid primary key default gen_random_uuid(),
  generic_name              text not null,
  normalized_generic_name   text not null,
  substance_class           text,
  category                  text,
  primary_psychiatric_uses  jsonb not null default '[]'::jsonb,
  mechanism_summary         text,
  pharmacodynamic_profile   text,
  clinical_pearls           text,
  uncertainty_notes         text,
  pregnancy_lactation_caution text,
  geriatric_caution         text,
  hepatic_renal_caution     text,
  contraindications         jsonb not null default '[]'::jsonb,
  severe_risks              jsonb not null default '[]'::jsonb,
  status                    text not null default 'ai_draft'
    check (status in ('ai_draft', 'reviewed', 'published', 'archived')),
  review_status             text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'in_review', 'approved', 'rejected')),
  source_quality            text not null default 'ai_generated_unverified'
    check (source_quality in (
      'ai_generated_unverified',
      'ai_generated_partial',
      'curated',
      'verified_smpc',
      'verified_guideline'
    )),
  needs_clinical_review     boolean not null default true,
  country_default           text not null default 'DE',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint kb_substances_normalized_name_unique unique (normalized_generic_name)
);

create index if not exists kb_substances_status_idx on public.kb_substances (status);
create index if not exists kb_substances_review_status_idx on public.kb_substances (review_status);
create index if not exists kb_substances_category_idx on public.kb_substances (category);
create index if not exists kb_substances_generic_name_idx on public.kb_substances (generic_name);

-- ── kb_substance_trade_names ────────────────────────────────────────────────
create table if not exists public.kb_substance_trade_names (
  id            uuid primary key default gen_random_uuid(),
  substance_id  uuid not null references public.kb_substances (id) on delete cascade,
  trade_name    text not null,
  country_code  text,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists kb_substance_trade_names_substance_id_idx
  on public.kb_substance_trade_names (substance_id);

-- ── kb_sources ──────────────────────────────────────────────────────────────
create table if not exists public.kb_sources (
  id            uuid primary key default gen_random_uuid(),
  substance_id  uuid references public.kb_substances (id) on delete cascade,
  source_type   text not null default 'reference',
  citation      text not null,
  url           text,
  accessed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists kb_sources_substance_id_idx on public.kb_sources (substance_id);

-- ── kb_receptor_affinities ──────────────────────────────────────────────────
create table if not exists public.kb_receptor_affinities (
  id               uuid primary key default gen_random_uuid(),
  substance_id     uuid not null references public.kb_substances (id) on delete cascade,
  receptor         text not null,
  affinity_percent numeric(5,2) check (affinity_percent is null or (affinity_percent >= 0 and affinity_percent <= 100)),
  effect_type      text not null default 'unknown',
  confidence       text not null default 'unknown',
  explanation      text,
  source_id        uuid references public.kb_sources (id) on delete set null,
  is_estimated     boolean not null default true,
  raw_ki_nm        numeric,
  p_ki             numeric,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists kb_receptor_affinities_substance_id_idx
  on public.kb_receptor_affinities (substance_id);

-- ── kb_side_effects ─────────────────────────────────────────────────────────
create table if not exists public.kb_side_effects (
  id              uuid primary key default gen_random_uuid(),
  substance_id    uuid not null references public.kb_substances (id) on delete cascade,
  effect          text not null,
  system          text,
  frequency       text not null default 'unknown',
  severity        text not null default 'mild',
  is_severe_risk  boolean not null default false,
  note            text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists kb_side_effects_substance_id_idx on public.kb_side_effects (substance_id);

-- ── kb_monitoring_recommendations ───────────────────────────────────────────
create table if not exists public.kb_monitoring_recommendations (
  id            uuid primary key default gen_random_uuid(),
  substance_id  uuid not null references public.kb_substances (id) on delete cascade,
  parameter     text not null,
  interval_text text,
  rationale     text,
  priority      text not null default 'routine',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists kb_monitoring_recommendations_substance_id_idx
  on public.kb_monitoring_recommendations (substance_id);

-- ── kb_dosage_guidance ──────────────────────────────────────────────────────
create table if not exists public.kb_dosage_guidance (
  id                    uuid primary key default gen_random_uuid(),
  substance_id          uuid not null references public.kb_substances (id) on delete cascade,
  population            text not null default 'adult',
  start_dose            text,
  target_dose           text,
  max_dose              text,
  titration_notes       text,
  administration_notes  text,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now()
);

create index if not exists kb_dosage_guidance_substance_id_idx
  on public.kb_dosage_guidance (substance_id);

-- ── kb_country_preparations ─────────────────────────────────────────────────
create table if not exists public.kb_country_preparations (
  id                  uuid primary key default gen_random_uuid(),
  substance_id        uuid not null references public.kb_substances (id) on delete cascade,
  country_code        text not null,
  dosage_form         text not null,
  strength_value      text not null,
  strength_unit       text not null,
  route               text not null,
  trade_name          text,
  pzn                 text,
  verification_status text not null default 'ai_draft'
    check (verification_status in ('ai_draft', 'unverified', 'manually_verified', 'imported_verified')),
  source_id           uuid references public.kb_sources (id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists kb_country_preparations_substance_id_idx
  on public.kb_country_preparations (substance_id);
create index if not exists kb_country_preparations_country_code_idx
  on public.kb_country_preparations (country_code);

-- ── kb_interaction_notes ────────────────────────────────────────────────────
create table if not exists public.kb_interaction_notes (
  id                  uuid primary key default gen_random_uuid(),
  substance_id        uuid not null references public.kb_substances (id) on delete cascade,
  interacts_with      text not null,
  severity            text not null default 'moderate',
  mechanism           text,
  clinical_management text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists kb_interaction_notes_substance_id_idx
  on public.kb_interaction_notes (substance_id);

-- ── kb_ai_generations ───────────────────────────────────────────────────────
create table if not exists public.kb_ai_generations (
  id                uuid primary key default gen_random_uuid(),
  substance_id      uuid references public.kb_substances (id) on delete set null,
  generic_name      text not null,
  provider          text not null,
  model             text not null,
  prompt_version    text not null default 'v1',
  status            text not null
    check (status in ('success', 'failed_validation', 'failed_api', 'dry_run')),
  raw_response      jsonb,
  validated_payload jsonb,
  validation_errors jsonb,
  token_count       int,
  duration_ms       int,
  created_at        timestamptz not null default now()
);

create index if not exists kb_ai_generations_substance_id_idx
  on public.kb_ai_generations (substance_id);
create index if not exists kb_ai_generations_generic_name_idx
  on public.kb_ai_generations (generic_name);
create index if not exists kb_ai_generations_status_idx
  on public.kb_ai_generations (status);

-- ── kb_revision_history ─────────────────────────────────────────────────────
create table if not exists public.kb_revision_history (
  id                uuid primary key default gen_random_uuid(),
  substance_id      uuid not null references public.kb_substances (id) on delete cascade,
  revision_type     text not null
    check (revision_type in ('ai_seed', 'manual_edit', 'publish', 'archive', 'rerun', 'approve', 'reject')),
  previous_snapshot jsonb,
  changes_summary   text,
  created_by        text,
  created_at        timestamptz not null default now()
);

create index if not exists kb_revision_history_substance_id_idx
  on public.kb_revision_history (substance_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.set_kb_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kb_substances_set_updated_at on public.kb_substances;
create trigger kb_substances_set_updated_at
  before update on public.kb_substances
  for each row execute function public.set_kb_updated_at();

drop trigger if exists kb_country_preparations_set_updated_at on public.kb_country_preparations;
create trigger kb_country_preparations_set_updated_at
  before update on public.kb_country_preparations
  for each row execute function public.set_kb_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
-- MVP policy model:
--   • Published + approved profiles: readable by anon + authenticated (public KB).
--   • Drafts / unreviewed: SELECT/WRITE only for kb editors (app_metadata.kb_admin).
--   • Seed script + admin API use service_role (bypasses RLS).
-- Limitation: without Supabase Auth + kb_admin claim, browser clients cannot
-- read drafts directly; use /api/kb-admin (service role) or set kb_admin claim.

alter table public.kb_substances enable row level security;
alter table public.kb_substance_trade_names enable row level security;
alter table public.kb_receptor_affinities enable row level security;
alter table public.kb_side_effects enable row level security;
alter table public.kb_monitoring_recommendations enable row level security;
alter table public.kb_dosage_guidance enable row level security;
alter table public.kb_country_preparations enable row level security;
alter table public.kb_interaction_notes enable row level security;
alter table public.kb_sources enable row level security;
alter table public.kb_ai_generations enable row level security;
alter table public.kb_revision_history enable row level security;

-- Published substances: public read
drop policy if exists kb_substances_select_published on public.kb_substances;
create policy kb_substances_select_published
  on public.kb_substances for select to anon, authenticated
  using (status = 'published' and review_status = 'approved');

drop policy if exists kb_substances_select_editor on public.kb_substances;
create policy kb_substances_select_editor
  on public.kb_substances for select to authenticated
  using (public.is_kb_editor());

drop policy if exists kb_substances_write_editor on public.kb_substances;
create policy kb_substances_write_editor
  on public.kb_substances for all to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());

-- Child tables: mirror substance visibility via join
create or replace function public.kb_substance_is_public(p_substance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kb_substances s
    where s.id = p_substance_id
      and s.status = 'published'
      and s.review_status = 'approved'
  );
$$;

-- Trade names
drop policy if exists kb_trade_names_select_public on public.kb_substance_trade_names;
create policy kb_trade_names_select_public
  on public.kb_substance_trade_names for select to anon, authenticated
  using (public.kb_substance_is_public(substance_id));

drop policy if exists kb_trade_names_select_editor on public.kb_substance_trade_names;
create policy kb_trade_names_select_editor
  on public.kb_substance_trade_names for select to authenticated
  using (public.is_kb_editor());

drop policy if exists kb_trade_names_write_editor on public.kb_substance_trade_names;
create policy kb_trade_names_write_editor
  on public.kb_substance_trade_names for all to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());

-- Macro for child table policies (receptor, side effects, etc.)
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
    execute format(
      'create policy %I_select_public on public.%I for select to anon, authenticated using (public.kb_substance_is_public(substance_id))',
      tbl, tbl
    );
    execute format('drop policy if exists %I_select_editor on public.%I', tbl, tbl);
    execute format(
      'create policy %I_select_editor on public.%I for select to authenticated using (public.is_kb_editor())',
      tbl, tbl
    );
    execute format('drop policy if exists %I_write_editor on public.%I', tbl, tbl);
    execute format(
      'create policy %I_write_editor on public.%I for all to authenticated using (public.is_kb_editor()) with check (public.is_kb_editor())',
      tbl, tbl
    );
  end loop;
end;
$policy$;

-- AI generations: editor-only (never public)
drop policy if exists kb_ai_generations_select_editor on public.kb_ai_generations;
create policy kb_ai_generations_select_editor
  on public.kb_ai_generations for select to authenticated
  using (public.is_kb_editor());

drop policy if exists kb_ai_generations_write_editor on public.kb_ai_generations;
create policy kb_ai_generations_write_editor
  on public.kb_ai_generations for all to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());
