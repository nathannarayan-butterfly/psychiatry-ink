-- DiscussCase async voice messages (replaces LiveKit Sprachchat).

alter table public.dc_messages
  add column if not exists message_kind text not null default 'text'
    check (message_kind in ('text', 'voice'));

alter table public.dc_messages
  add column if not exists voice_attachment jsonb;

comment on column public.dc_messages.message_kind is
  'text = standard chat message; voice = recorded audio attachment';
comment on column public.dc_messages.voice_attachment is
  'Metadata for voice messages: storagePath, mimeType, durationMs, sizeBytes';

-- Private bucket — all access via Express service role (participant auth checked server-side).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dc-voice-messages',
  'dc-voice-messages',
  false,
  10485760,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/webm;codecs=opus']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
