-- DiscussCase: case-linked collaboration workspace
-- Tables prefixed dc_ to avoid collisions with KB schema.

-- Permission keys (stored in jsonb arrays on participants/invites):
-- view_package, view_identified_data, comment, highlight, send_message,
-- ask_ai, copy_text, download_package, export_summary, save_to_case,
-- invite_others, manage_discussion

create table if not exists public.dc_discussions (
  id              uuid primary key default gen_random_uuid(),
  case_id         text not null,
  owner_user_id   text not null,
  title           text not null,
  status          text not null default 'active'
                    check (status in ('draft', 'active', 'archived', 'revoked')),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists dc_discussions_case_id_idx
  on public.dc_discussions (case_id, updated_at desc);
create index if not exists dc_discussions_owner_user_id_idx
  on public.dc_discussions (owner_user_id);

create table if not exists public.dc_discussion_packages (
  id              uuid primary key default gen_random_uuid(),
  discussion_id   uuid not null references public.dc_discussions (id) on delete cascade,
  version         integer not null default 1,
  is_deidentified boolean not null default false,
  content         jsonb not null default '{}'::jsonb,
  created_by      text not null,
  created_at      timestamptz not null default now(),
  constraint dc_discussion_packages_version_unique unique (discussion_id, version)
);

create index if not exists dc_discussion_packages_discussion_id_idx
  on public.dc_discussion_packages (discussion_id, version desc);

create table if not exists public.dc_invites (
  id                uuid primary key default gen_random_uuid(),
  discussion_id     uuid not null references public.dc_discussions (id) on delete cascade,
  invited_by        text not null,
  invitee_email     text,
  invitee_username  text,
  invite_type       text not null check (invite_type in ('internal', 'external')),
  token_hash        text not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'revoked', 'expired')),
  permissions       jsonb not null default '[]'::jsonb,
  expires_at        timestamptz,
  revoked_at        timestamptz,
  accepted_at       timestamptz,
  accepted_user_id  text,
  created_at        timestamptz not null default now(),
  constraint dc_invites_target_check check (
    invitee_email is not null or invitee_username is not null
  )
);

create index if not exists dc_invites_discussion_id_idx
  on public.dc_invites (discussion_id);
create unique index if not exists dc_invites_token_hash_idx
  on public.dc_invites (token_hash);

create table if not exists public.dc_participants (
  id              uuid primary key default gen_random_uuid(),
  discussion_id   uuid not null references public.dc_discussions (id) on delete cascade,
  user_id         text not null,
  role            text not null check (role in ('owner', 'internal', 'external')),
  permissions     jsonb not null default '[]'::jsonb,
  invite_id       uuid references public.dc_invites (id) on delete set null,
  joined_at       timestamptz not null default now(),
  constraint dc_participants_unique unique (discussion_id, user_id)
);

create index if not exists dc_participants_user_id_idx
  on public.dc_participants (user_id);
create index if not exists dc_participants_discussion_id_idx
  on public.dc_participants (discussion_id);

create table if not exists public.dc_messages (
  id                  uuid primary key default gen_random_uuid(),
  discussion_id       uuid not null references public.dc_discussions (id) on delete cascade,
  author_user_id      text not null,
  author_display_name text,
  body                text not null,
  quote_excerpt       jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists dc_messages_discussion_id_idx
  on public.dc_messages (discussion_id, created_at asc);

create table if not exists public.dc_annotations (
  id                uuid primary key default gen_random_uuid(),
  discussion_id     uuid not null references public.dc_discussions (id) on delete cascade,
  author_user_id    text not null,
  section_id        text not null,
  start_offset      integer not null,
  end_offset        integer not null,
  highlighted_text  text not null,
  comment_body      text,
  resolved_at       timestamptz,
  resolved_by       text,
  created_at        timestamptz not null default now(),
  constraint dc_annotations_offset_check check (start_offset >= 0 and end_offset > start_offset)
);

create index if not exists dc_annotations_discussion_id_idx
  on public.dc_annotations (discussion_id, section_id);

create table if not exists public.dc_ai_requests (
  id                  uuid primary key default gen_random_uuid(),
  discussion_id       uuid not null references public.dc_discussions (id) on delete cascade,
  requester_user_id   text not null,
  prompt              text not null,
  context_scope       text not null default 'visible_package',
  response_text       text,
  status              text not null default 'completed'
                        check (status in ('pending', 'completed', 'failed', 'discarded')),
  created_at          timestamptz not null default now()
);

create index if not exists dc_ai_requests_discussion_id_idx
  on public.dc_ai_requests (discussion_id, created_at desc);

create table if not exists public.dc_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  discussion_id   uuid not null references public.dc_discussions (id) on delete cascade,
  actor_user_id   text,
  action          text not null,
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists dc_audit_logs_discussion_id_idx
  on public.dc_audit_logs (discussion_id, created_at desc);

-- RLS: service-role writes via Express; authenticated reads scoped to participants.
alter table public.dc_discussions enable row level security;
alter table public.dc_discussion_packages enable row level security;
alter table public.dc_invites enable row level security;
alter table public.dc_participants enable row level security;
alter table public.dc_messages enable row level security;
alter table public.dc_annotations enable row level security;
alter table public.dc_ai_requests enable row level security;
alter table public.dc_audit_logs enable row level security;

-- Helper: user is participant of discussion
create or replace function public.dc_is_participant(p_discussion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dc_participants p
    where p.discussion_id = p_discussion_id
      and p.user_id = auth.uid()::text
  );
$$;

-- Discussions: participants can select
drop policy if exists dc_discussions_select_participant on public.dc_discussions;
create policy dc_discussions_select_participant
  on public.dc_discussions for select to authenticated
  using (public.dc_is_participant(id) or owner_user_id = auth.uid()::text);

-- Packages: participants can select
drop policy if exists dc_packages_select_participant on public.dc_discussion_packages;
create policy dc_packages_select_participant
  on public.dc_discussion_packages for select to authenticated
  using (public.dc_is_participant(discussion_id));

-- Participants: members see co-participants
drop policy if exists dc_participants_select_member on public.dc_participants;
create policy dc_participants_select_member
  on public.dc_participants for select to authenticated
  using (public.dc_is_participant(discussion_id));

-- Messages: participants can select
drop policy if exists dc_messages_select_participant on public.dc_messages;
create policy dc_messages_select_participant
  on public.dc_messages for select to authenticated
  using (public.dc_is_participant(discussion_id));

-- Annotations: participants can select
drop policy if exists dc_annotations_select_participant on public.dc_annotations;
create policy dc_annotations_select_participant
  on public.dc_annotations for select to authenticated
  using (public.dc_is_participant(discussion_id));

-- AI requests: participants can select own discussion
drop policy if exists dc_ai_requests_select_participant on public.dc_ai_requests;
create policy dc_ai_requests_select_participant
  on public.dc_ai_requests for select to authenticated
  using (public.dc_is_participant(discussion_id));

-- Audit logs: owner/manager only (via manage_discussion permission checked server-side)
drop policy if exists dc_audit_logs_select_owner on public.dc_audit_logs;
create policy dc_audit_logs_select_owner
  on public.dc_audit_logs for select to authenticated
  using (
    exists (
      select 1 from public.dc_participants p
      where p.discussion_id = dc_audit_logs.discussion_id
        and p.user_id = auth.uid()::text
        and p.role = 'owner'
    )
  );

-- Invites: no direct client access (token flow via API)
drop policy if exists dc_invites_deny_all on public.dc_invites;
create policy dc_invites_deny_all
  on public.dc_invites for select to authenticated
  using (false);
