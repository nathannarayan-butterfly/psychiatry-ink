-- Canonical demo patient fixture — shared across all authenticated users.
-- Writes go through the API (service role); clients read via GET /api/demo-patient/canonical.

create table if not exists public.demo_patient_canonical (
  id                  text primary key default 'canonical',
  seed_version        text not null,
  fixture             jsonb not null,
  published_by        text,
  published_by_email  text,
  published_at        timestamptz not null default now(),
  constraint demo_patient_canonical_singleton check (id = 'canonical')
);

alter table public.demo_patient_canonical enable row level security;

drop policy if exists demo_patient_canonical_select_authenticated on public.demo_patient_canonical;
create policy demo_patient_canonical_select_authenticated
  on public.demo_patient_canonical for select to authenticated
  using (true);

-- No insert/update/delete policies for authenticated — server API uses service role.
