-- Org-scoped encrypted case vault sharing (Small Praxis)
-- Server stores wrapped keys + ciphertext only — never plaintext clinical data.

create table if not exists public.org_member_vault_keys (
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  user_id           text not null,
  public_key_jwk    jsonb not null,
  key_version       int not null default 1,
  updated_at        timestamptz not null default now(),
  constraint org_member_vault_keys_pkey primary key (organisation_id, user_id)
);

create index if not exists org_member_vault_keys_user_idx
  on public.org_member_vault_keys (user_id);

create table if not exists public.org_case_vault_keys (
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  case_id           text not null,
  user_id           text not null,
  wrapped_key       text not null,
  key_version       int not null default 1,
  created_at        timestamptz not null default now(),
  constraint org_case_vault_keys_pkey primary key (organisation_id, case_id, user_id)
);

create index if not exists org_case_vault_keys_case_idx
  on public.org_case_vault_keys (organisation_id, case_id);

create table if not exists public.org_case_vault_snapshots (
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  case_id           text not null,
  ciphertext        text not null,
  iv                text not null,
  version           int not null default 1,
  payload_version   int,
  updated_by        text,
  updated_at        timestamptz not null default now(),
  constraint org_case_vault_snapshots_pkey primary key (organisation_id, case_id)
);

-- RLS: service role API only (same pattern as org_invitations writes)
alter table public.org_member_vault_keys enable row level security;
alter table public.org_case_vault_keys enable row level security;
alter table public.org_case_vault_snapshots enable row level security;

drop policy if exists org_member_vault_keys_deny on public.org_member_vault_keys;
create policy org_member_vault_keys_deny
  on public.org_member_vault_keys for all to authenticated
  using (false);

drop policy if exists org_case_vault_keys_deny on public.org_case_vault_keys;
create policy org_case_vault_keys_deny
  on public.org_case_vault_keys for all to authenticated
  using (false);

drop policy if exists org_case_vault_snapshots_deny on public.org_case_vault_snapshots;
create policy org_case_vault_snapshots_deny
  on public.org_case_vault_snapshots for all to authenticated
  using (false);
