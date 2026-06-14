-- Multiuser DiscussCase: support soft-revoking individual participants.
--
-- The dc_* schema already supports many participants per discussion (one
-- dc_participants row per user, many dc_invites per discussion). This migration
-- only ADDS the ability for an owner/manager to revoke a single participant's
-- access without deleting the discussion, while keeping a record for the
-- roster + audit trail. Revoked participants lose read access via RLS and the
-- server-side participant lookup.

alter table public.dc_participants
  add column if not exists status text not null default 'active'
    check (status in ('active', 'revoked'));

alter table public.dc_participants
  add column if not exists revoked_at timestamptz;

alter table public.dc_participants
  add column if not exists revoked_by text;

create index if not exists dc_participants_status_idx
  on public.dc_participants (discussion_id, status);

-- RLS helper: only ACTIVE participants count as members of a discussion.
-- (Recreated additively; preserves the security-definer + locked-down grants
-- established in the hardening migration.)
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
      and p.status = 'active'
  );
$$;

revoke execute on function public.dc_is_participant(uuid) from public, anon;
grant execute on function public.dc_is_participant(uuid) to authenticated;
