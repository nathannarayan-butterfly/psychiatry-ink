-- Reply-to-message references for DiscussCase chat (WhatsApp-style thread replies).

alter table public.dc_messages
  add column if not exists reply_to_message_id uuid references public.dc_messages (id) on delete set null,
  add column if not exists reply_preview jsonb;

comment on column public.dc_messages.reply_to_message_id is
  'Optional FK to the message being replied to; cleared when the original is deleted.';
comment on column public.dc_messages.reply_preview is
  'Denormalized snapshot for reply quote UI: senderDisplayName, bodySnippet, messageKind.';

create index if not exists dc_messages_reply_to_message_id_idx
  on public.dc_messages (reply_to_message_id)
  where reply_to_message_id is not null;
