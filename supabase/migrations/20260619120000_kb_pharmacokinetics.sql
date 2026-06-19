-- Pharmacokinetics (1:1 per substance) for normalized KB.
-- Powers the Pharmakokinetik monograph section + structured pk block in projected drugs.

create table if not exists public.kb_pharmacokinetics (
  id                        uuid primary key default gen_random_uuid(),
  substance_id              uuid not null references public.kb_substances (id) on delete cascade,
  summary                   text,
  summary_de                text,
  half_life_hours           numeric,
  half_life_note            text,
  half_life_note_de         text,
  tmax_hours                numeric,
  time_to_steady_state_days numeric,
  bioavailability_percent   numeric check (
    bioavailability_percent is null
    or (bioavailability_percent >= 0 and bioavailability_percent <= 100)
  ),
  protein_binding_percent   numeric check (
    protein_binding_percent is null
    or (protein_binding_percent >= 0 and protein_binding_percent <= 100)
  ),
  tdm_low                   numeric,
  tdm_high                  numeric,
  tdm_unit                  text,
  tdm_note                  text,
  tdm_note_de               text,
  is_estimated              boolean not null default true,
  source_note               text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint kb_pharmacokinetics_substance_unique unique (substance_id)
);

create index if not exists kb_pharmacokinetics_substance_id_idx
  on public.kb_pharmacokinetics (substance_id);

drop trigger if exists kb_pharmacokinetics_set_updated_at on public.kb_pharmacokinetics;
create trigger kb_pharmacokinetics_set_updated_at
  before update on public.kb_pharmacokinetics
  for each row execute function public.set_kb_updated_at();

alter table public.kb_pharmacokinetics enable row level security;

drop policy if exists kb_pharmacokinetics_select_public on public.kb_pharmacokinetics;
create policy kb_pharmacokinetics_select_public
  on public.kb_pharmacokinetics for select to anon, authenticated
  using (public.kb_substance_is_public(substance_id));

drop policy if exists kb_pharmacokinetics_select_editor on public.kb_pharmacokinetics;
create policy kb_pharmacokinetics_select_editor
  on public.kb_pharmacokinetics for select to authenticated
  using (public.is_kb_editor());

drop policy if exists kb_pharmacokinetics_write_editor on public.kb_pharmacokinetics;
create policy kb_pharmacokinetics_write_editor
  on public.kb_pharmacokinetics for all to authenticated
  using (public.is_kb_editor())
  with check (public.is_kb_editor());
