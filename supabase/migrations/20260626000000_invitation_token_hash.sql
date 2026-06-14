-- Invitation security: store SHA-256 token hash only; extend invitation model.

create extension if not exists pgcrypto;

alter table public.org_invitations
  add column if not exists token_hash text,
  add column if not exists invited_name text,
  add column if not exists accepted_by_user_id text,
  add column if not exists accepted_at timestamptz,
  add column if not exists email_delivery_status text not null default 'not_configured';

alter table public.org_invitations
  drop constraint if exists org_invitations_email_delivery_status_check;

alter table public.org_invitations
  add constraint org_invitations_email_delivery_status_check check (
    email_delivery_status in ('not_configured', 'pending', 'sent', 'failed')
  );

-- Hash any legacy raw tokens (hex-compatible with Node crypto SHA-256).
update public.org_invitations
set token_hash = encode(digest(token, 'sha256'), 'hex')
where token_hash is null and token is not null;

alter table public.org_invitations
  alter column token_hash set not null;

drop index if exists org_invitations_token_idx;

alter table public.org_invitations
  drop column if exists token;

create unique index if not exists org_invitations_token_hash_idx
  on public.org_invitations (token_hash);
