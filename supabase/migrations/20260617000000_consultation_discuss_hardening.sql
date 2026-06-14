-- Hardening pass for DiscussCase (dc_*) and Konsil (ks_*)
-- 1. Close identified-package read hole: external participants must only ever
--    see the de-identified discussion package, never the identified one.
-- 2. Add data-retention support so identified material can be purged once a
--    consultation/discussion is completed or revoked.
-- 3. Reduce attack surface of the RLS helper functions (advisor 0028/0029).

-- ---------------------------------------------------------------------------
-- 1. DiscussCase: identified package only for participants who were explicitly
--    granted `view_identified_data` (owner + internal). Everyone else (external
--    consultants) can read the de-identified package only.
-- ---------------------------------------------------------------------------
drop policy if exists dc_packages_select_participant on public.dc_discussion_packages;
create policy dc_packages_select_participant
  on public.dc_discussion_packages for select to authenticated
  using (
    public.dc_is_participant(discussion_id)
    and (
      is_deidentified = true
      or exists (
        select 1 from public.dc_participants p
        where p.discussion_id = dc_discussion_packages.discussion_id
          and p.user_id = auth.uid()::text
          and p.permissions ? 'view_identified_data'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Retention: track when shared Konsil material has been purged.
-- ---------------------------------------------------------------------------
alter table public.ks_shared_items
  add column if not exists purged_at timestamptz;

-- Allow the new audit action used when identified material is purged.
alter table public.ks_audit_logs
  drop constraint if exists ks_audit_logs_action_check;
alter table public.ks_audit_logs
  add constraint ks_audit_logs_action_check
  check (action in (
    'created', 'sent', 'opened', 'attachment_viewed', 'report_saved',
    'report_submitted', 'more_info_requested', 'access_revoked', 'archived',
    'material_purged'
  ));

-- ---------------------------------------------------------------------------
-- 3. RLS helper functions are only needed inside policy evaluation, which runs
--    as the `authenticated` role. Remove the publicly-callable RPC surface.
-- ---------------------------------------------------------------------------
revoke execute on function public.dc_is_participant(uuid) from public, anon;
revoke execute on function public.ks_is_participant(uuid) from public, anon;
grant execute on function public.dc_is_participant(uuid) to authenticated;
grant execute on function public.ks_is_participant(uuid) to authenticated;
