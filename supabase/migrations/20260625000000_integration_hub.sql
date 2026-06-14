-- Integration Hub foundation — metadata, batches, adapter registry (no PHI on server).
-- Writes via service role API only; org members may read their org rows.

-- ---------------------------------------------------------------------------
-- Adapter type enum
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'int_adapter_type') then
    create type public.int_adapter_type as enum (
      'fhir',
      'hl7_v2',
      'cda',
      'pdf',
      'csv',
      'json'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- IntegrationAdapter — global adapter registry (seeded)
-- ---------------------------------------------------------------------------

create table if not exists public.int_integration_adapters (
  id              uuid primary key default gen_random_uuid(),
  type            public.int_adapter_type not null,
  version         text not null default '1.0.0',
  capabilities    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint int_integration_adapters_type_version_unique unique (type, version)
);

-- ---------------------------------------------------------------------------
-- IntegrationConnection — org-scoped adapter configuration
-- ---------------------------------------------------------------------------

create table if not exists public.int_integration_connections (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.org_organisations (id) on delete cascade,
  adapter_type    public.int_adapter_type not null,
  name            text not null,
  status          text not null default 'inactive'
                    check (status in ('inactive', 'active', 'error', 'disabled')),
  config          jsonb not null default '{}'::jsonb,
  enabled         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists int_integration_connections_org_idx
  on public.int_integration_connections (organisation_id);

create index if not exists int_integration_connections_org_type_idx
  on public.int_integration_connections (organisation_id, adapter_type);

-- ---------------------------------------------------------------------------
-- IntegrationMapping — field mapping rules per connection
-- ---------------------------------------------------------------------------

create table if not exists public.int_integration_mappings (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.int_integration_connections (id) on delete cascade,
  source_type     text not null,
  target_type     text not null,
  mapping_rules   jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists int_integration_mappings_connection_idx
  on public.int_integration_mappings (connection_id);

-- ---------------------------------------------------------------------------
-- IntegrationSyncJob — sync job metadata (no file content)
-- ---------------------------------------------------------------------------

create table if not exists public.int_integration_sync_jobs (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.int_integration_connections (id) on delete cascade,
  direction       text not null check (direction in ('import', 'export', 'bidirectional')),
  status          text not null default 'pending'
                    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at      timestamptz,
  completed_at    timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists int_integration_sync_jobs_connection_idx
  on public.int_integration_sync_jobs (connection_id);

-- ---------------------------------------------------------------------------
-- IntegrationEventLog — audit trail for integration actions (metadata only)
-- ---------------------------------------------------------------------------

create table if not exists public.int_integration_event_logs (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.org_organisations (id) on delete cascade,
  user_id         text,
  action          text not null,
  adapter_type    public.int_adapter_type,
  case_id         text,
  metadata        jsonb not null default '{}'::jsonb,
  ip              text,
  created_at      timestamptz not null default now()
);

create index if not exists int_integration_event_logs_org_idx
  on public.int_integration_event_logs (organisation_id, created_at desc);

create index if not exists int_integration_event_logs_case_idx
  on public.int_integration_event_logs (organisation_id, case_id)
  where case_id is not null;

-- ---------------------------------------------------------------------------
-- ExternalSystemReference — crosswalk local ↔ external identifiers
-- ---------------------------------------------------------------------------

create table if not exists public.int_external_system_references (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  case_id           text not null,
  local_object_type text not null,
  local_object_id   text not null,
  external_system   text not null,
  external_id       text not null,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint int_external_system_refs_unique unique (
    organisation_id, local_object_type, local_object_id, external_system
  )
);

create index if not exists int_external_system_refs_org_case_idx
  on public.int_external_system_references (organisation_id, case_id);

-- ---------------------------------------------------------------------------
-- ImportBatch / ExportBatch — client-side file ops registered server-side
-- ---------------------------------------------------------------------------

create table if not exists public.int_import_batches (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.org_organisations (id) on delete cascade,
  user_id         text not null,
  adapter_type    public.int_adapter_type not null,
  filename        text,
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  record_count    integer not null default 0,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists int_import_batches_org_idx
  on public.int_import_batches (organisation_id, created_at desc);

create table if not exists public.int_export_batches (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.org_organisations (id) on delete cascade,
  user_id         text not null,
  adapter_type    public.int_adapter_type not null,
  case_id         text,
  object_types    text[] not null default '{}',
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists int_export_batches_org_idx
  on public.int_export_batches (organisation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ClinicalObjectMapping — per-batch object crosswalk
-- ---------------------------------------------------------------------------

create table if not exists public.int_clinical_object_mappings (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null,
  batch_kind          text not null check (batch_kind in ('import', 'export')),
  local_type          text not null,
  local_id            text not null,
  external_ref        text not null,
  fhir_resource_type  text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists int_clinical_object_mappings_batch_idx
  on public.int_clinical_object_mappings (batch_id, batch_kind);

-- ---------------------------------------------------------------------------
-- TerminologyMapping — code system crosswalk (org-agnostic reference table)
-- ---------------------------------------------------------------------------

create table if not exists public.int_terminology_mappings (
  id          uuid primary key default gen_random_uuid(),
  system      text not null,
  code        text not null,
  display     text,
  local_code  text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint int_terminology_mappings_system_code_unique unique (system, code)
);

-- ---------------------------------------------------------------------------
-- Seed adapter registry
-- ---------------------------------------------------------------------------

insert into public.int_integration_adapters (type, version, capabilities)
values
  ('fhir', 'R4', '{"resources":["Patient","Encounter","Condition","MedicationStatement","Observation","Bundle"],"liveSync":false}'::jsonb),
  ('hl7_v2', '2.5', '{"messages":["ADT","ORM","ORU"],"liveSync":false}'::jsonb),
  ('cda', '2.0', '{"documents":["ClinicalDocument"],"liveSync":false}'::jsonb),
  ('pdf', '1.0', '{"metadata":true,"liveSync":false}'::jsonb),
  ('csv', '1.0', '{"tabular":true,"liveSync":false}'::jsonb),
  ('json', '1.0', '{"canonical":true,"liveSync":false}'::jsonb)
on conflict (type, version) do nothing;

-- ---------------------------------------------------------------------------
-- RLS — org members read; writes via service role only
-- ---------------------------------------------------------------------------

alter table public.int_integration_adapters enable row level security;
alter table public.int_integration_connections enable row level security;
alter table public.int_integration_mappings enable row level security;
alter table public.int_integration_sync_jobs enable row level security;
alter table public.int_integration_event_logs enable row level security;
alter table public.int_external_system_references enable row level security;
alter table public.int_import_batches enable row level security;
alter table public.int_export_batches enable row level security;
alter table public.int_clinical_object_mappings enable row level security;
alter table public.int_terminology_mappings enable row level security;

-- Adapters: readable by all authenticated users (global registry).
drop policy if exists int_integration_adapters_select_authenticated on public.int_integration_adapters;
create policy int_integration_adapters_select_authenticated
  on public.int_integration_adapters for select to authenticated
  using (true);

-- Terminology: readable by all authenticated users (reference data).
drop policy if exists int_terminology_mappings_select_authenticated on public.int_terminology_mappings;
create policy int_terminology_mappings_select_authenticated
  on public.int_terminology_mappings for select to authenticated
  using (true);

-- Org-scoped tables: members can read rows in their org.
drop policy if exists int_integration_connections_select_member on public.int_integration_connections;
create policy int_integration_connections_select_member
  on public.int_integration_connections for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists int_integration_mappings_select_member on public.int_integration_mappings;
create policy int_integration_mappings_select_member
  on public.int_integration_mappings for select to authenticated
  using (
    exists (
      select 1 from public.int_integration_connections c
      where c.id = connection_id and public.org_is_member(c.organisation_id)
    )
  );

drop policy if exists int_integration_sync_jobs_select_member on public.int_integration_sync_jobs;
create policy int_integration_sync_jobs_select_member
  on public.int_integration_sync_jobs for select to authenticated
  using (
    exists (
      select 1 from public.int_integration_connections c
      where c.id = connection_id and public.org_is_member(c.organisation_id)
    )
  );

drop policy if exists int_integration_event_logs_select_member on public.int_integration_event_logs;
create policy int_integration_event_logs_select_member
  on public.int_integration_event_logs for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists int_external_system_refs_select_member on public.int_external_system_references;
create policy int_external_system_refs_select_member
  on public.int_external_system_references for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists int_import_batches_select_member on public.int_import_batches;
create policy int_import_batches_select_member
  on public.int_import_batches for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists int_export_batches_select_member on public.int_export_batches;
create policy int_export_batches_select_member
  on public.int_export_batches for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists int_clinical_object_mappings_select_member on public.int_clinical_object_mappings;
create policy int_clinical_object_mappings_select_member
  on public.int_clinical_object_mappings for select to authenticated
  using (
    (batch_kind = 'import' and exists (
      select 1 from public.int_import_batches b
      where b.id = batch_id and public.org_is_member(b.organisation_id)
    ))
    or (batch_kind = 'export' and exists (
      select 1 from public.int_export_batches b
      where b.id = batch_id and public.org_is_member(b.organisation_id)
    ))
  );
