-- Document voice attachment retention metadata (expiresAt stored in JSONB).

comment on column public.dc_messages.voice_attachment is
  'Metadata for voice messages: storagePath, mimeType, durationMs, sizeBytes, expiresAt (ISO8601 — auto-purged after DISCUSS_CASE_VOICE_RETENTION_DAYS, default 90)';
