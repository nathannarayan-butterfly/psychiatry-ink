-- Small Praxis calendar: encrypted client-side payload for PHI fields.
-- Server stores scheduling skeleton + ciphertext only.

alter table public.cal_calendar_items
  add column if not exists encrypted_payload text;

-- Encrypted rows use empty title; legacy plaintext rows may still populate title.
alter table public.cal_calendar_items
  alter column title drop not null;

alter table public.cal_calendar_items
  alter column title set default '';

-- Org-wide calendar AES key wrapped per member (RSA-OAEP via org_member_vault_keys).
create table if not exists public.org_calendar_keys (
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  user_id           text not null,
  wrapped_key       text not null,
  key_version       int not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint org_calendar_keys_pkey primary key (organisation_id, user_id)
);

create index if not exists org_calendar_keys_org_idx
  on public.org_calendar_keys (organisation_id);

alter table public.org_calendar_keys enable row level security;

drop policy if exists org_calendar_keys_deny on public.org_calendar_keys;
create policy org_calendar_keys_deny
  on public.org_calendar_keys for all to authenticated
  using (false);
