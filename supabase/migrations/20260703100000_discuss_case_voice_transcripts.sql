-- De-identified transcripts for DiscussCase voice messages.
-- Persisted so a machine transcript (and any clinician correction) survives
-- reloads. The audio blob itself is still purged on the voice-retention TTL.

alter table public.dc_messages
  add column if not exists transcript jsonb;

comment on column public.dc_messages.transcript is
  'De-identified voice transcript: { text, status: machine|edited, model, language, createdAt, editedAt, editedBy }. Null until a participant transcribes the voice message.';
