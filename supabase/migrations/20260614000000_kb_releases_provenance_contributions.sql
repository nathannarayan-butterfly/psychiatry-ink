-- ============================================================================
-- KB wiki architecture foundation: releases, field provenance, contributions
-- ============================================================================
-- psychopharmacology.wiki (collaborative editing) → versioned releases →
-- Psychiatry.ink consumes published read-only projections only.
-- ============================================================================

-- ── kb_releases ─────────────────────────────────────────────────────────────
create table if not exists public.kb_releases (
  id                uuid primary key default gen_random_uuid(),
  version_label     text not null,
  source            text not null default 'psychopharmacology.wiki',
  published_at      timestamptz not null,
  synced_at         timestamptz not null,
  notes             text,
  is_current        boolean not null default false,
  snapshot_metadata jsonb,
  created_at        timestamptz not null default now(),
  constraint kb_releases_version_label_unique unique (version_label)
);

create unique index if not exists kb_releases_one_current_idx
  on public.kb_releases (is_current)
  where is_current = true;

create index if not exists kb_releases_synced_at_idx
  on public.kb_releases (synced_at desc);

-- ── kb_contributions ──────────────────────────────────────────────────────────
create table if not exists public.kb_contributions (
  id                      uuid primary key default gen_random_uuid(),
  substance_id            uuid references public.kb_substances (id) on delete set null,
  contribution_type       text not null
    check (contribution_type in (
      'edit_field', 'add_drug', 'add_receptor', 'add_side_effect',
      'add_monitoring', 'add_preparation', 'add_source'
    )),
  status                  text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'modified')),
  payload                 jsonb not null default '{}'::jsonb,
  submitter_user_id       uuid,
  submitter_display_name  text,
  license_accepted        boolean not null default true,
  review_notes            text,
  reviewed_by             text,
  reviewed_at             timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists kb_contributions_status_idx
  on public.kb_contributions (status);
create index if not exists kb_contributions_substance_id_idx
  on public.kb_contributions (substance_id);
create index if not exists kb_contributions_created_at_idx
  on public.kb_contributions (created_at desc);

-- ── kb_contribution_reviews ───────────────────────────────────────────────────
create table if not exists public.kb_contribution_reviews (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.kb_contributions (id) on delete cascade,
  action          text not null
    check (action in ('accept', 'reject', 'modify', 'comment')),
  reviewer_id     text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists kb_contribution_reviews_contribution_id_idx
  on public.kb_contribution_reviews (contribution_id);

-- ── kb_field_provenance ───────────────────────────────────────────────────────
create table if not exists public.kb_field_provenance (
  id                  uuid primary key default gen_random_uuid(),
  substance_id        uuid not null references public.kb_substances (id) on delete cascade,
  field_path          text not null,
  value_snapshot      jsonb,
  source_type         text not null
    check (source_type in (
      'ai_draft', 'user_contribution', 'fachinformation', 'fda_label',
      'stahl', 'guideline', 'literature', 'curated', 'unknown'
    )),
  source_citation     text,
  source_url          text,
  contributor_user_id uuid,
  contribution_id     uuid references public.kb_contributions (id) on delete set null,
  confidence          text,
  created_at          timestamptz not null default now()
);

create index if not exists kb_field_provenance_substance_id_idx
  on public.kb_field_provenance (substance_id);
create index if not exists kb_field_provenance_field_path_idx
  on public.kb_field_provenance (substance_id, field_path);

-- ── Seed initial release ──────────────────────────────────────────────────────
insert into public.kb_releases (
  version_label,
  source,
  published_at,
  synced_at,
  is_current,
  notes,
  snapshot_metadata
)
values (
  '2026.06.1',
  'psychopharmacology.wiki',
  '2026-06-14T00:00:00Z',
  '2026-06-14T00:00:00Z',
  true,
  'Initial foundation release',
  '{"note":"full snapshot export deferred"}'::jsonb
)
on conflict (version_label) do nothing;

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.kb_releases enable row level security;
alter table public.kb_contributions enable row level security;
alter table public.kb_contribution_reviews enable row level security;
alter table public.kb_field_provenance enable row level security;

-- Releases: public read (clinician app displays version metadata)
drop policy if exists kb_releases_select_all on public.kb_releases;
create policy kb_releases_select_all
  on public.kb_releases for select to anon, authenticated
  using (true);

-- Contributions: dev/MVP — insert for anon+authenticated; read all in dev
drop policy if exists kb_contributions_select_all on public.kb_contributions;
create policy kb_contributions_select_all
  on public.kb_contributions for select to anon, authenticated
  using (true);

drop policy if exists kb_contributions_insert_dev on public.kb_contributions;
create policy kb_contributions_insert_dev
  on public.kb_contributions for insert to anon, authenticated
  with check (license_accepted = true);

-- Contribution reviews: readable in dev; writes via service_role
drop policy if exists kb_contribution_reviews_select_all on public.kb_contribution_reviews;
create policy kb_contribution_reviews_select_all
  on public.kb_contribution_reviews for select to anon, authenticated
  using (true);

-- Field provenance: public read in dev
drop policy if exists kb_field_provenance_select_all on public.kb_field_provenance;
create policy kb_field_provenance_select_all
  on public.kb_field_provenance for select to anon, authenticated
  using (true);
