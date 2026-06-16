-- DiscussCase: support editing chat messages.
-- Adds an edited_at marker so the UI can show a subtle "bearbeitet" indicator.
-- Message edit/delete are authored-scoped and performed server-side via the
-- service-role admin client, so no additional client RLS policies are required.

alter table public.dc_messages
  add column if not exists edited_at timestamptz;
