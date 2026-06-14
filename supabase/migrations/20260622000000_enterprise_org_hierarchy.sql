-- Enterprise org hierarchy (sites, departments/units, SSO stub)
-- Gated by ENABLE_ENTERPRISE_ORG_HIERARCHY — schema only until product rollout.

-- ---------------------------------------------------------------------------
-- Sites (enterprise tier)
-- ---------------------------------------------------------------------------

create table if not exists public.org_sites (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  name              text not null,
  code              text not null,
  settings          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint org_sites_org_code_unique unique (organisation_id, code)
);

create index if not exists org_sites_organisation_id_idx
  on public.org_sites (organisation_id);

-- ---------------------------------------------------------------------------
-- Teams: department | unit | team + site FK
-- ---------------------------------------------------------------------------

alter table public.org_teams
  add column if not exists team_type text not null default 'team';

alter table public.org_teams
  drop constraint if exists org_teams_team_type_check;

alter table public.org_teams
  add constraint org_teams_team_type_check
  check (team_type in ('department', 'unit', 'team'));

alter table public.org_teams
  drop constraint if exists org_teams_site_id_fkey;

alter table public.org_teams
  add constraint org_teams_site_id_fkey
  foreign key (site_id) references public.org_sites (id) on delete set null;

create index if not exists org_teams_site_id_idx
  on public.org_teams (site_id);

create index if not exists org_teams_team_type_idx
  on public.org_teams (organisation_id, team_type);

-- ---------------------------------------------------------------------------
-- SSO config stub (enterprise tier)
-- ---------------------------------------------------------------------------

create table if not exists public.org_sso_config (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  provider          text not null default 'saml',
  config            jsonb not null default '{}'::jsonb,
  enabled           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint org_sso_config_org_unique unique (organisation_id)
);

-- Enterprise feature toggles live in org_organisations.settings JSONB, e.g.:
-- {
--   "enterprise": {
--     "externalConsultantMode": false,
--     "orgTemplatesEnabled": true
--   }
-- }

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.org_sites enable row level security;
alter table public.org_sso_config enable row level security;

drop policy if exists org_sites_select_member on public.org_sites;
create policy org_sites_select_member
  on public.org_sites for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists org_sso_config_select_member on public.org_sso_config;
create policy org_sso_config_select_member
  on public.org_sso_config for select to authenticated
  using (public.org_is_member(organisation_id));

-- Writes: service role only (Express provisioning).
