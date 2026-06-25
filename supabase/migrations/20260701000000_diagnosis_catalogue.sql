-- Diagnosis catalogue — reference coding independent of criterion trees.
-- Searchable ICD-10-GM / ICD-11 MMS entries; optional links to Butterfly criteria.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'diagnosis_catalogue_system') then
    create type public.diagnosis_catalogue_system as enum (
      'ICD10GM',
      'ICD10WHO',
      'ICD11MMS',
      'DSM5TR',
      'LOCAL'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'diagnosis_criteria_system') then
    create type public.diagnosis_criteria_system as enum (
      'ICD10',
      'ICD11',
      'DSM'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'diagnosis_criteria_support_status') then
    create type public.diagnosis_criteria_support_status as enum (
      'native',
      'fallback',
      'unavailable'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- diagnosis_catalogues
-- ---------------------------------------------------------------------------

create table if not exists public.diagnosis_catalogues (
  id            uuid primary key default gen_random_uuid(),
  system        public.diagnosis_catalogue_system not null,
  version       text not null,
  language      text not null default 'de',
  source        text not null,
  active        boolean not null default true,
  imported_at   timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  constraint diagnosis_catalogues_system_version_language_unique
    unique (system, version, language)
);

create index if not exists diagnosis_catalogues_active_idx
  on public.diagnosis_catalogues (active, system);

-- ---------------------------------------------------------------------------
-- diagnosis_entries
-- ---------------------------------------------------------------------------

create table if not exists public.diagnosis_entries (
  id                   uuid primary key default gen_random_uuid(),
  catalogue_id         uuid not null references public.diagnosis_catalogues (id) on delete cascade,
  code                 text not null,
  code_normalized      text not null,
  title                text not null,
  short_title          text,
  description          text,
  chapter_code         text,
  chapter_title        text,
  block_code           text,
  block_title          text,
  parent_code          text,
  hierarchy_level      int not null default 0,
  is_category          boolean not null default false,
  is_selectable        boolean not null default true,
  is_residual_category boolean not null default false,
  is_psychiatric       boolean not null default false,
  is_somatic           boolean not null default false,
  search_text          text not null,
  source_uri           text,
  source_version       text,
  metadata_json        jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint diagnosis_entries_catalogue_code_unique unique (catalogue_id, code_normalized)
);

create index if not exists diagnosis_entries_catalogue_idx
  on public.diagnosis_entries (catalogue_id);

create index if not exists diagnosis_entries_search_idx
  on public.diagnosis_entries (catalogue_id, search_text);

create index if not exists diagnosis_entries_code_prefix_idx
  on public.diagnosis_entries (catalogue_id, code_normalized);

create index if not exists diagnosis_entries_psychiatric_idx
  on public.diagnosis_entries (catalogue_id, is_psychiatric, is_selectable);

create index if not exists diagnosis_entries_somatic_idx
  on public.diagnosis_entries (catalogue_id, is_somatic, is_selectable);

-- ---------------------------------------------------------------------------
-- diagnosis_synonyms
-- ---------------------------------------------------------------------------

create table if not exists public.diagnosis_synonyms (
  id                 uuid primary key default gen_random_uuid(),
  diagnosis_entry_id uuid not null references public.diagnosis_entries (id) on delete cascade,
  term               text not null,
  normalized_term    text not null,
  language           text not null default 'de',
  source             text not null default 'import',
  created_at         timestamptz not null default now()
);

create index if not exists diagnosis_synonyms_entry_idx
  on public.diagnosis_synonyms (diagnosis_entry_id);

create index if not exists diagnosis_synonyms_normalized_idx
  on public.diagnosis_synonyms (normalized_term);

-- ---------------------------------------------------------------------------
-- diagnosis_criteria_links (optional — powers criteria badge only)
-- ---------------------------------------------------------------------------

create table if not exists public.diagnosis_criteria_links (
  id                 uuid primary key default gen_random_uuid(),
  diagnosis_entry_id uuid not null references public.diagnosis_entries (id) on delete cascade,
  criteria_tree_id   text not null,
  criteria_system    public.diagnosis_criteria_system not null,
  support_status     public.diagnosis_criteria_support_status not null default 'native',
  created_at         timestamptz not null default now(),
  constraint diagnosis_criteria_links_entry_tree_unique
    unique (diagnosis_entry_id, criteria_tree_id, criteria_system)
);

create index if not exists diagnosis_criteria_links_entry_idx
  on public.diagnosis_criteria_links (diagnosis_entry_id);

create index if not exists diagnosis_criteria_links_tree_idx
  on public.diagnosis_criteria_links (criteria_tree_id);

-- ---------------------------------------------------------------------------
-- RLS — reference data readable by authenticated users; writes via service role
-- ---------------------------------------------------------------------------

alter table public.diagnosis_catalogues enable row level security;
alter table public.diagnosis_entries enable row level security;
alter table public.diagnosis_synonyms enable row level security;
alter table public.diagnosis_criteria_links enable row level security;

drop policy if exists diagnosis_catalogues_read on public.diagnosis_catalogues;
create policy diagnosis_catalogues_read on public.diagnosis_catalogues
  for select to authenticated using (active = true);

drop policy if exists diagnosis_entries_read on public.diagnosis_entries;
create policy diagnosis_entries_read on public.diagnosis_entries
  for select to authenticated using (
    exists (
      select 1 from public.diagnosis_catalogues c
      where c.id = catalogue_id and c.active = true
    )
  );

drop policy if exists diagnosis_synonyms_read on public.diagnosis_synonyms;
create policy diagnosis_synonyms_read on public.diagnosis_synonyms
  for select to authenticated using (
    exists (
      select 1
      from public.diagnosis_entries e
      join public.diagnosis_catalogues c on c.id = e.catalogue_id
      where e.id = diagnosis_entry_id and c.active = true
    )
  );

drop policy if exists diagnosis_criteria_links_read on public.diagnosis_criteria_links;
create policy diagnosis_criteria_links_read on public.diagnosis_criteria_links
  for select to authenticated using (
    exists (
      select 1
      from public.diagnosis_entries e
      join public.diagnosis_catalogues c on c.id = e.catalogue_id
      where e.id = diagnosis_entry_id and c.active = true
    )
  );
