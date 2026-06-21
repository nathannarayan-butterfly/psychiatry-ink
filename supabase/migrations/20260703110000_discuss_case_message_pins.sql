-- Pin / flag individual DiscussCase messages as important so the team can
-- surface key decisions in a dedicated header/aside.

alter table public.dc_messages
  add column if not exists pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by text;

comment on column public.dc_messages.pinned is
  'True when a moderator/owner flagged this message as pinned/important.';
comment on column public.dc_messages.pinned_at is
  'Timestamp the message was last pinned (null when not pinned).';
comment on column public.dc_messages.pinned_by is
  'User id of the participant who pinned the message (null when not pinned).';

create index if not exists dc_messages_pinned_idx
  on public.dc_messages (discussion_id)
  where pinned = true;
