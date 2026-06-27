-- ===========================================================================
-- public_contact_submissions — minimal abuse-prevention metadata for the
-- public contact form. Message content is delivered by email only; this table
-- stores timestamp, hashed IP, category and locale — NOT the message body.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe.
-- Security: RLS enabled, no policies for anon/authenticated — service_role only.
-- ===========================================================================

create table if not exists public.public_contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip_hash    text not null,
  category   text not null,
  locale     text,
  -- Outcome flag (email delivered vs. failed). No message body / PII stored.
  success    boolean not null default true
);

-- Idempotent guard for environments where the table already exists.
alter table public.public_contact_submissions
  add column if not exists success boolean not null default true;

create index if not exists public_contact_submissions_created_at_idx
  on public.public_contact_submissions (created_at desc);

comment on table public.public_contact_submissions is
  'Minimal metadata for public contact form submissions (abuse prevention). Message content is emailed, not stored here.';

revoke all on table public.public_contact_submissions from public, anon, authenticated;
grant select, insert on table public.public_contact_submissions to service_role;

alter table public.public_contact_submissions enable row level security;
