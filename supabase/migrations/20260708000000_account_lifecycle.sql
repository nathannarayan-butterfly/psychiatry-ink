-- Account unsubscribe + delete lifecycle.
--
-- Adds lifecycle state to the de-facto account row (`public.ai_credit_accounts`)
-- and the SECURITY DEFINER RPCs that drive the two flows:
--
--   * Unsubscribe (cancel): Stripe cancels at period end → account becomes
--     `dormant`; a 90-day deletion clock starts at the paid period end. A
--     resubscribe/reactivate within 90 days clears dormancy.
--   * Delete: Stripe cancels immediately → `delete_pending` with a 30-day grace
--     period (cancellable) → purge at day 30.
--
-- The actual purge requires worker-side steps (Storage deletes, Stripe
-- cancel/customer delete, auth.admin.deleteUser) so it is split:
--   * `account_claim_due_purges` atomically latches due rows for one worker.
--   * `account_purge_data` performs the FK-safe SQL delete of PERSONAL rows
--     (organisation_id is null only — never org/org-shared data) and stamps the
--     account tombstone. The worker calls it last, after the external deletes.
--
-- Everything here is additive + idempotent. All RPCs are SECURITY DEFINER with
-- an empty search_path (every reference is schema-qualified) and EXECUTE is
-- granted to `service_role` only.

-- ---------------------------------------------------------------------------
-- 1. Lifecycle columns on the account row.
-- ---------------------------------------------------------------------------
alter table public.ai_credit_accounts
  add column if not exists account_status text,
  add column if not exists dormant_at timestamptz,
  add column if not exists delete_requested_at timestamptz,
  add column if not exists purge_after timestamptz,
  add column if not exists purge_started_at timestamptz,
  add column if not exists purged_at timestamptz;

comment on column public.ai_credit_accounts.account_status is
  'Lifecycle state: null/active | dormant (unsubscribed) | delete_pending.';
comment on column public.ai_credit_accounts.purge_after is
  'When the account + personal data becomes eligible for hard purge.';

-- Constrain to the known states (idempotent: drop + recreate).
alter table public.ai_credit_accounts
  drop constraint if exists ai_credit_accounts_account_status_check;
alter table public.ai_credit_accounts
  add constraint ai_credit_accounts_account_status_check
  check (account_status is null or account_status in ('active', 'dormant', 'delete_pending'));

-- Partial index for the due-purge sweep.
create index if not exists ai_credit_accounts_purge_after_idx
  on public.ai_credit_accounts (purge_after)
  where purge_after is not null and purged_at is null;

-- ---------------------------------------------------------------------------
-- 2. Lifecycle state-transition RPCs.
-- ---------------------------------------------------------------------------

-- Unsubscribe → dormant. The deletion clock starts at the paid period end (so
-- the user keeps the access they already paid for). No-op refusal if a delete
-- is already pending (delete takes precedence and has its own shorter clock).
create or replace function public.account_begin_unsubscribe(
  p_user_id text,
  p_dormant_days int default 90
)
returns public.ai_credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.ai_credit_accounts;
begin
  update public.ai_credit_accounts a
     set account_status = 'dormant',
         dormant_at = now(),
         purge_after = coalesce(a.subscription_current_period_end, now())
                       + make_interval(days => greatest(p_dormant_days, 0)),
         subscription_cancel_at_period_end = true,
         updated_at = now()
   where a.user_id = p_user_id
     and (a.account_status is distinct from 'delete_pending')
  returning a.* into v_row;

  return v_row;
end;
$$;

-- Reactivate → clears dormancy + purge clock, back to active. Intentionally a
-- no-op when a delete is pending (delete must be cancelled explicitly via
-- account_cancel_delete) so a Stripe resubscribe webhook can never silently
-- undo an in-flight account deletion.
create or replace function public.account_reactivate(p_user_id text)
returns public.ai_credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.ai_credit_accounts;
begin
  update public.ai_credit_accounts a
     set account_status = 'active',
         dormant_at = null,
         purge_after = null,
         purge_started_at = null,
         updated_at = now()
   where a.user_id = p_user_id
     and (a.account_status is distinct from 'delete_pending')
  returning a.* into v_row;

  if v_row.user_id is null then
    -- Either no such account, or it is delete_pending (left untouched). Return
    -- the current row unchanged so callers can inspect state.
    select a.* into v_row from public.ai_credit_accounts a where a.user_id = p_user_id;
  end if;

  return v_row;
end;
$$;

-- Request delete → delete_pending with a 30-day grace clock. Allowed from any
-- state (including dormant) and replaces the longer dormancy clock.
create or replace function public.account_request_delete(
  p_user_id text,
  p_grace_days int default 30
)
returns public.ai_credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.ai_credit_accounts;
begin
  update public.ai_credit_accounts a
     set account_status = 'delete_pending',
         delete_requested_at = now(),
         purge_after = now() + make_interval(days => greatest(p_grace_days, 0)),
         purge_started_at = null,
         subscription_cancel_at_period_end = true,
         updated_at = now()
   where a.user_id = p_user_id
  returning a.* into v_row;

  return v_row;
end;
$$;

-- Cancel a pending delete → back to active. Only acts on delete_pending rows.
create or replace function public.account_cancel_delete(p_user_id text)
returns public.ai_credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.ai_credit_accounts;
begin
  update public.ai_credit_accounts a
     set account_status = 'active',
         delete_requested_at = null,
         dormant_at = null,
         purge_after = null,
         purge_started_at = null,
         updated_at = now()
   where a.user_id = p_user_id
     and a.account_status = 'delete_pending'
  returning a.* into v_row;

  if v_row.user_id is null then
    select a.* into v_row from public.ai_credit_accounts a where a.user_id = p_user_id;
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Due-purge claim + release (worker latching).
-- ---------------------------------------------------------------------------

-- Atomically latch `purge_started_at` on rows whose clock has elapsed and that
-- are not already claimed/purged, returning the claimed user_ids. `for update
-- skip locked` makes concurrent workers safe.
create or replace function public.account_claim_due_purges(p_limit int default 100)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select a.id
      from public.ai_credit_accounts a
     where a.purge_after is not null
       and a.purge_after <= now()
       and a.purged_at is null
       and a.purge_started_at is null
     order by a.purge_after asc
     limit greatest(p_limit, 0)
     for update skip locked
  )
  update public.ai_credit_accounts a
     set purge_started_at = now()
    from due
   where a.id = due.id
  returning a.user_id;
end;
$$;

-- Release a claimed-but-failed purge so the next sweep retries it.
create or replace function public.account_release_purge(p_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_credit_accounts a
     set purge_started_at = null,
         updated_at = now()
   where a.user_id = p_user_id
     and a.purged_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Hard purge of PERSONAL data (organisation_id is null only).
-- ---------------------------------------------------------------------------
-- One transaction. Org-owned / org-shared rows are never touched (the
-- org-ownership BLOCK check upstream guarantees the user owns no org). DiscussCase
-- and Konsil children cascade from their parents, but the user's own rows inside
-- OTHER users' discussions/requests are deleted explicitly first. The account row
-- itself is kept as a tombstone (purged_at stamped, Stripe ids nulled).
create or replace function public.account_purge_data(p_user_id text)
returns public.ai_credit_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.ai_credit_accounts;
  v_account_id uuid;
begin
  select a.id into v_account_id
    from public.ai_credit_accounts a
   where a.user_id = p_user_id;

  -- DiscussCase: the user's rows inside OTHER users' discussions first …
  delete from public.dc_messages where author_user_id = p_user_id;
  delete from public.dc_annotations where author_user_id = p_user_id;
  delete from public.dc_ai_requests where requester_user_id = p_user_id;
  delete from public.dc_participants where user_id = p_user_id;
  delete from public.dc_audit_logs where actor_user_id = p_user_id;
  delete from public.dc_invites where invited_by = p_user_id or accepted_user_id = p_user_id;
  -- … then the discussions they own (cascades remaining children + packages).
  delete from public.dc_discussions where owner_user_id = p_user_id;

  -- Konsil: the user's rows inside OTHER users' requests first …
  delete from public.ks_messages where author_user_id = p_user_id;
  delete from public.ks_participants where user_id = p_user_id;
  delete from public.ks_reports where submitted_by = p_user_id;
  delete from public.ks_audit_logs where actor_user_id = p_user_id;
  delete from public.ks_invites where invited_by = p_user_id or accepted_user_id = p_user_id;
  -- … then the requests they own (cascades remaining children).
  delete from public.ks_consultation_requests where clinician_user_id = p_user_id;

  -- Encrypted personal vault material + case index.
  delete from public.encrypted_workspace_snapshots where user_id = p_user_id;
  delete from public.patient_cases where account_id = p_user_id;
  delete from public.account_key_backups where user_id = p_user_id;
  delete from public.account_registry_backups where user_id = p_user_id;

  -- Personal todos + calendar (organisation_id is null only; reschedule logs
  -- cascade from the calendar item).
  delete from public.todos where owner_user_id = p_user_id and organisation_id is null;
  delete from public.cal_reschedule_log where user_id = p_user_id;
  delete from public.cal_calendar_items where created_by = p_user_id and organisation_id is null;

  -- Personal AI usage logs (organisation_id is null only).
  delete from public.ai_usage_logs where user_id = p_user_id and organisation_id is null;

  -- Vouchers + referrals + credit ledger (period grants cascade from the
  -- redemption; the ledger is kept-by-cascade off the tombstone, so delete it
  -- explicitly).
  delete from public.voucher_redemptions where redeemed_by = p_user_id;
  delete from public.referrals where invitee_user = p_user_id or referrer_user = p_user_id;
  delete from public.referral_codes where user_id = p_user_id;
  if v_account_id is not null then
    delete from public.ai_credit_ledger where account_id = v_account_id;
  end if;

  -- Tombstone the account row: stamp purged_at, null the Stripe ids, zero the
  -- balances so a re-created account never inherits stale state.
  update public.ai_credit_accounts a
     set purged_at = now(),
         purge_started_at = coalesce(a.purge_started_at, now()),
         account_status = 'delete_pending',
         stripe_customer_id = null,
         stripe_subscription_id = null,
         subscription_status = 'canceled',
         monthly_credits = 0,
         purchased_credits = 0,
         updated_at = now()
   where a.user_id = p_user_id
  returning a.* into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Lock down EXECUTE to service_role only.
-- ---------------------------------------------------------------------------
revoke execute on function public.account_begin_unsubscribe(text, int) from public, anon, authenticated;
revoke execute on function public.account_reactivate(text) from public, anon, authenticated;
revoke execute on function public.account_request_delete(text, int) from public, anon, authenticated;
revoke execute on function public.account_cancel_delete(text) from public, anon, authenticated;
revoke execute on function public.account_claim_due_purges(int) from public, anon, authenticated;
revoke execute on function public.account_release_purge(text) from public, anon, authenticated;
revoke execute on function public.account_purge_data(text) from public, anon, authenticated;

grant execute on function public.account_begin_unsubscribe(text, int) to service_role;
grant execute on function public.account_reactivate(text) to service_role;
grant execute on function public.account_request_delete(text, int) to service_role;
grant execute on function public.account_cancel_delete(text) to service_role;
grant execute on function public.account_claim_due_purges(int) to service_role;
grant execute on function public.account_release_purge(text) to service_role;
grant execute on function public.account_purge_data(text) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Auto-trigger the purge sweep (pg_cron + pg_net HTTP POST to the server).
-- ---------------------------------------------------------------------------
-- The hard purge needs worker-side steps (Storage deletes, Stripe cancel +
-- customer delete, auth.admin.deleteUser), so the scheduled job calls back into
-- the deployed API endpoint `POST /api/account/lifecycle/run-purges`, guarded by
-- a shared secret header. The endpoint URL + secret are stored OUT-OF-BAND in
-- `account_lifecycle_config` (never committed) so this migration carries no
-- secret. When unset, the wrapper no-ops (and the operator can run the endpoint
-- via Cloud Scheduler instead — the documented fallback).

create table if not exists public.account_lifecycle_config (
  id boolean primary key default true,
  purge_endpoint_url text,
  cron_secret text,
  updated_at timestamptz not null default now(),
  constraint account_lifecycle_config_singleton check (id)
);

revoke all on table public.account_lifecycle_config from public, anon, authenticated;
grant select, insert, update on table public.account_lifecycle_config to service_role;

-- pg_net is available on this project; enabling it is tolerated-failure so the
-- core lifecycle (columns + RPCs above) always lands even if the async-HTTP
-- trigger can't be provisioned (→ use the Cloud Scheduler fallback).
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net not enabled (%); use Cloud Scheduler fallback for purge sweep.', sqlerrm;
end;
$$;

create or replace function public.account_run_due_purges_via_http()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select c.purge_endpoint_url, c.cron_secret
    into v_url, v_secret
    from public.account_lifecycle_config c
   where c.id = true;

  if v_url is null or v_secret is null or v_url = '' or v_secret = '' then
    raise notice 'account_lifecycle_config not set — purge sweep not dispatched.';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', v_secret
    ),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke execute on function public.account_run_due_purges_via_http() from public, anon, authenticated;
grant execute on function public.account_run_due_purges_via_http() to service_role;

-- Schedule daily. cron.schedule upserts by job name, so re-applying is safe.
-- Wrapped so a missing pg_cron/pg_net never fails the migration.
do $$
begin
  perform cron.schedule(
    'account-lifecycle-run-purges',
    '23 3 * * *',
    $cron$select public.account_run_due_purges_via_http();$cron$
  );
exception when others then
  raise notice 'Could not schedule account-lifecycle-run-purges (%); use Cloud Scheduler fallback.', sqlerrm;
end;
$$;
