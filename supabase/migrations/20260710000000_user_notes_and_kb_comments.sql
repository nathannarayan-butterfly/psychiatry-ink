-- User-global notes (Meine Notizen) and KB pharma comments — synced per account.
-- Writes go through the Express API (service role); RLS is defense-in-depth.

create table if not exists public.user_notes (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   text not null,
  title           text not null default '',
  content         text not null default '',
  kind            text not null default 'manual',
  category        text not null default 'formulare',
  page_type       text not null default 'standalone:manual',
  deleted         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists user_notes_owner_user_id_idx
  on public.user_notes (owner_user_id);
create index if not exists user_notes_owner_updated_idx
  on public.user_notes (owner_user_id, updated_at desc);

create table if not exists public.kb_pharma_comments (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   text not null,
  medication_id   text not null,
  section_id      text not null,
  text            text not null,
  highlight_id    text,
  deleted         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists kb_pharma_comments_owner_med_idx
  on public.kb_pharma_comments (owner_user_id, medication_id);
create index if not exists kb_pharma_comments_owner_updated_idx
  on public.kb_pharma_comments (owner_user_id, updated_at desc);

alter table public.user_notes enable row level security;
alter table public.kb_pharma_comments enable row level security;

drop policy if exists user_notes_select_owner on public.user_notes;
create policy user_notes_select_owner
  on public.user_notes for select to authenticated
  using (owner_user_id = auth.uid()::text);

drop policy if exists kb_pharma_comments_select_owner on public.kb_pharma_comments;
create policy kb_pharma_comments_select_owner
  on public.kb_pharma_comments for select to authenticated
  using (owner_user_id = auth.uid()::text);
