-- Discussion-level resolution summary ("what we decided"), editable by the
-- owner/moderator. Stored as JSONB so we keep light provenance alongside text.

alter table public.dc_discussions
  add column if not exists resolution_summary jsonb;

comment on column public.dc_discussions.resolution_summary is
  'Owner/moderator-editable outcome summary: { text, updatedAt, updatedBy }. Null until first written.';
