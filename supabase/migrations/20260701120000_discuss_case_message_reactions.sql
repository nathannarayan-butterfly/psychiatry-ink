-- DiscussCase message emoji reactions (one reaction per participant per message).

alter table public.dc_messages
  add column if not exists reactions jsonb not null default '[]'::jsonb;

comment on column public.dc_messages.reactions is
  'Array of { userId, emoji, createdAt } reaction entries; one emoji per user per message.';
