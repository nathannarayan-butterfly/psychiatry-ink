-- Organisation & permission foundation (Step 1)
-- Tables prefixed org_ — provisioning via service role; members read own org via RLS.

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table if not exists public.org_organisations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  slug                    text not null,
  tier                    text not null default 'single_use'
                            check (tier in ('single_use', 'small_praxis', 'enterprise')),
  is_personal             boolean not null default false,
  personal_owner_user_id  text,
  settings                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint org_organisations_slug_unique unique (slug),
  constraint org_organisations_personal_owner_unique unique (personal_owner_user_id),
  constraint org_personal_owner_check check (
    (is_personal = false and personal_owner_user_id is null)
    or (is_personal = true and personal_owner_user_id is not null)
  )
);

create index if not exists org_organisations_tier_idx
  on public.org_organisations (tier);

create table if not exists public.org_members (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  user_id           text not null,
  role              text not null check (role in (
                      'single_owner', 'org_owner', 'org_admin', 'site_admin',
                      'department_admin', 'clinical_lead', 'clinician', 'psychologist',
                      'nursing', 'social_worker', 'assistant', 'viewer',
                      'external_consultant', 'auditor', 'it_admin'
                    )),
  status            text not null default 'active'
                      check (status in ('active', 'invited', 'suspended', 'removed')),
  joined_at         timestamptz not null default now(),
  invited_by        text,
  constraint org_members_org_user_unique unique (organisation_id, user_id)
);

create index if not exists org_members_user_id_idx
  on public.org_members (user_id);
create index if not exists org_members_organisation_id_idx
  on public.org_members (organisation_id);

create table if not exists public.org_teams (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  name              text not null,
  parent_id         uuid references public.org_teams (id) on delete set null,
  site_id           uuid,
  created_at        timestamptz not null default now()
);

create index if not exists org_teams_organisation_id_idx
  on public.org_teams (organisation_id);

create table if not exists public.org_case_access (
  id                    uuid primary key default gen_random_uuid(),
  organisation_id       uuid not null references public.org_organisations (id) on delete cascade,
  case_id               text not null,
  user_id               text,
  team_id               uuid references public.org_teams (id) on delete cascade,
  granted_permissions   jsonb not null default '{}'::jsonb,
  granted_by            text,
  created_at            timestamptz not null default now(),
  constraint org_case_access_target_check check (
    user_id is not null or team_id is not null
  )
);

create index if not exists org_case_access_lookup_idx
  on public.org_case_access (organisation_id, case_id, user_id);
create index if not exists org_case_access_team_idx
  on public.org_case_access (organisation_id, case_id, team_id);

create table if not exists public.org_module_access (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  case_id           text,
  module_name       text not null,
  user_id           text,
  team_id           uuid references public.org_teams (id) on delete cascade,
  permissions       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  constraint org_module_access_target_check check (
    user_id is not null or team_id is not null or case_id is null
  )
);

create index if not exists org_module_access_lookup_idx
  on public.org_module_access (organisation_id, module_name, user_id);

create table if not exists public.org_invitations (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  email             text not null,
  role              text not null check (role in (
                      'single_owner', 'org_owner', 'org_admin', 'site_admin',
                      'department_admin', 'clinical_lead', 'clinician', 'psychologist',
                      'nursing', 'social_worker', 'assistant', 'viewer',
                      'external_consultant', 'auditor', 'it_admin'
                    )),
  token             text not null,
  expires_at        timestamptz,
  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by        text not null,
  created_at        timestamptz not null default now()
);

create unique index if not exists org_invitations_token_idx
  on public.org_invitations (token);
create index if not exists org_invitations_org_email_idx
  on public.org_invitations (organisation_id, email);

create table if not exists public.org_audit_logs (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  actor_user_id     text,
  action            text not null,
  resource_type     text not null,
  resource_id       text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists org_audit_logs_organisation_id_idx
  on public.org_audit_logs (organisation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Idempotent personal org provisioning (service role / migration seed)
-- ---------------------------------------------------------------------------

create or replace function public.org_provision_personal_org(p_user_id text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_display_name text;
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'user_id required';
  end if;

  select id into v_org_id
  from public.org_organisations
  where personal_owner_user_id = p_user_id and is_personal = true
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  v_display_name := coalesce(nullif(btrim(p_name), ''), 'Persönlicher Arbeitsbereich');

  insert into public.org_organisations (
    name, slug, tier, is_personal, personal_owner_user_id, settings
  ) values (
    v_display_name,
    'personal-' || p_user_id,
    'single_use',
    true,
    p_user_id,
    '{}'::jsonb
  )
  returning id into v_org_id;

  insert into public.org_members (
    organisation_id, user_id, role, status, joined_at
  ) values (
    v_org_id, p_user_id, 'single_owner', 'active', now()
  )
  on conflict (organisation_id, user_id) do nothing;

  return v_org_id;
end;
$$;

revoke all on function public.org_provision_personal_org(text, text) from public;
revoke all on function public.org_provision_personal_org(text, text) from anon, authenticated;
grant execute on function public.org_provision_personal_org(text, text) to service_role;

-- Seed personal organisations for all existing auth users (idempotent).
do $$
declare
  r record;
begin
  for r in select id::text as user_id from auth.users loop
    perform public.org_provision_personal_org(r.user_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.org_organisations enable row level security;
alter table public.org_members enable row level security;
alter table public.org_teams enable row level security;
alter table public.org_case_access enable row level security;
alter table public.org_module_access enable row level security;
alter table public.org_invitations enable row level security;
alter table public.org_audit_logs enable row level security;

create or replace function public.org_is_member(p_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.organisation_id = p_organisation_id
      and m.user_id = auth.uid()::text
      and m.status = 'active'
  );
$$;

-- Organisations: active members can read their org.
drop policy if exists org_organisations_select_member on public.org_organisations;
create policy org_organisations_select_member
  on public.org_organisations for select to authenticated
  using (public.org_is_member(id));

-- Members: users see memberships in orgs they belong to.
drop policy if exists org_members_select_member on public.org_members;
create policy org_members_select_member
  on public.org_members for select to authenticated
  using (public.org_is_member(organisation_id));

-- Teams: members can read teams in their org.
drop policy if exists org_teams_select_member on public.org_teams;
create policy org_teams_select_member
  on public.org_teams for select to authenticated
  using (public.org_is_member(organisation_id));

-- Case/module access: members can read rows in their org (enforcement server-side in Step 2).
drop policy if exists org_case_access_select_member on public.org_case_access;
create policy org_case_access_select_member
  on public.org_case_access for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists org_module_access_select_member on public.org_module_access;
create policy org_module_access_select_member
  on public.org_module_access for select to authenticated
  using (public.org_is_member(organisation_id));

-- Invitations: no direct client access (token flow via API in future steps).
drop policy if exists org_invitations_deny_all on public.org_invitations;
create policy org_invitations_deny_all
  on public.org_invitations for select to authenticated
  using (false);

-- Audit logs: org members with audit.view checked server-side; allow select for members.
drop policy if exists org_audit_logs_select_member on public.org_audit_logs;
create policy org_audit_logs_select_member
  on public.org_audit_logs for select to authenticated
  using (public.org_is_member(organisation_id));

-- Writes: service role only (Express provisioning). No insert/update/delete policies for authenticated.
