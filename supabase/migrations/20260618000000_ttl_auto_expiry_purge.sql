-- Auto-expiry TTL purge for abandoned DiscussCase discussions and Konsil
-- consultation requests that never reached a terminal state.
--
-- Mirrors the existing terminal-state purge semantics:
--   * DiscussCase: delete the identified package version (same as
--     purgeIdentifiedPackage), write an `identified_package_purged` audit entry.
--   * Konsil: null out shared item content/metadata, stamp purged_at, write a
--     `material_purged` audit entry (same as purgeSharedMaterial).
--
-- Default TTL: 30 days from creation. Change the default in the function
-- signatures (or pass an interval explicitly) to adjust.

-- ---------------------------------------------------------------------------
-- DiscussCase: purge identified packages of abandoned (draft/active) discussions.
-- ---------------------------------------------------------------------------
create or replace function public.dc_purge_abandoned(p_ttl interval default interval '30 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purged integer := 0;
  r record;
begin
  for r in
    select d.id
    from public.dc_discussions d
    where d.status in ('draft', 'active')
      and d.created_at < now() - p_ttl
      and exists (
        select 1 from public.dc_discussion_packages p
        where p.discussion_id = d.id and p.is_deidentified = false
      )
  loop
    delete from public.dc_discussion_packages
      where discussion_id = r.id and is_deidentified = false;

    insert into public.dc_audit_logs (discussion_id, actor_user_id, action, details)
      values (
        r.id,
        null,
        'identified_package_purged',
        jsonb_build_object('reason', 'ttl_auto_expiry', 'ttl', p_ttl::text)
      );

    v_purged := v_purged + 1;
  end loop;

  return v_purged;
end;
$$;

-- ---------------------------------------------------------------------------
-- Konsil: purge shared material of abandoned (non-terminal) consultation requests.
-- ---------------------------------------------------------------------------
create or replace function public.ks_purge_abandoned(p_ttl interval default interval '30 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purged integer := 0;
  r record;
  v_count integer;
begin
  for r in
    select req.id
    from public.ks_consultation_requests req
    where req.status in ('draft', 'sent', 'viewed', 'in_progress', 'more_info_requested')
      and req.reviewed_at is null
      and req.revoked_at is null
      and req.created_at < now() - p_ttl
      and exists (
        select 1 from public.ks_shared_items s
        where s.request_id = req.id and s.purged_at is null
      )
  loop
    update public.ks_shared_items
      set content = '', metadata = '{}'::jsonb, purged_at = now()
      where request_id = r.id and purged_at is null;
    get diagnostics v_count = row_count;

    insert into public.ks_audit_logs (request_id, actor_user_id, action, details)
      values (
        r.id,
        null,
        'material_purged',
        jsonb_build_object('reason', 'ttl_auto_expiry', 'itemCount', v_count, 'ttl', p_ttl::text)
      );

    v_purged := v_purged + 1;
  end loop;

  return v_purged;
end;
$$;

-- ---------------------------------------------------------------------------
-- Combined entry point invoked by the scheduler.
-- ---------------------------------------------------------------------------
create or replace function public.purge_abandoned_shared_material()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dc_purge_abandoned();
  perform public.ks_purge_abandoned();
end;
$$;

-- These are maintenance routines — keep them off the public RPC surface.
revoke execute on function public.dc_purge_abandoned(interval) from public, anon, authenticated;
revoke execute on function public.ks_purge_abandoned(interval) from public, anon, authenticated;
revoke execute on function public.purge_abandoned_shared_material() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schedule a daily purge via pg_cron (available on this Supabase project).
-- cron.schedule upserts by job name, so re-applying this migration is safe.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule(
  'purge-abandoned-shared-material',
  '17 3 * * *',
  $$select public.purge_abandoned_shared_material();$$
);
