-- ===========================================================================
-- Fix: monthly credit renewal was anchored to the calendar month (1st of next
-- month, UTC — see original `ai_credit_ensure_account` in
-- 20260704000000_consolidation_credit_system.sql) instead of the account's own
-- creation date. An account created near month-end (e.g. June 28) therefore
-- received its first "monthly" renewal only a few days later (July 1) instead
-- of ~30 days after creation, granting a second 500-credit batch far too soon.
--
-- Replaces ai_credit_ensure_account(text, integer, timestamptz) with
-- ai_credit_ensure_account(text, integer): the next reset boundary is now
-- computed INSIDE the RPC. On creation it is `now() + 30 days`; on renewal it
-- rolls forward from the account's OWN prior `monthly_reset_at` in fixed
-- 30-day steps (not from now()), so the cadence never drifts and stays
-- anchored to the original creation date even after a long gap between
-- logins. The existing single-winner concurrency guard (conditional UPDATE
-- keyed on the stale monthly_reset_at) is unchanged.
-- ===========================================================================

drop function if exists public.ai_credit_ensure_account(text, integer, timestamptz);

create or replace function public.ai_credit_ensure_account(
  p_user_id        text,
  p_monthly_grant  integer
)
  returns public.ai_credit_accounts
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account    public.ai_credit_accounts;
  v_granted    integer;
  v_next_reset timestamptz;
begin
  insert into public.ai_credit_accounts (user_id, monthly_credits, purchased_credits, monthly_reset_at)
  values (p_user_id, p_monthly_grant, 0, now() + interval '30 days')
  on conflict (user_id) do nothing;

  select * into v_account
  from public.ai_credit_accounts
  where user_id = p_user_id;

  -- Past the reset boundary → grant atomically; only the row still carrying
  -- the stale monthly_reset_at is updated, so concurrent callers cannot
  -- double-grant.
  if v_account.monthly_reset_at <= now() then
    v_next_reset := v_account.monthly_reset_at;
    while v_next_reset <= now() loop
      v_next_reset := v_next_reset + interval '30 days';
    end loop;

    update public.ai_credit_accounts
      set monthly_credits = p_monthly_grant,
          monthly_reset_at = v_next_reset
      where id = v_account.id
        and monthly_reset_at = v_account.monthly_reset_at
      returning monthly_credits into v_granted;

    if v_granted is not null then
      insert into public.ai_credit_ledger (account_id, type, credits, note)
      values (v_account.id, 'monthly_grant', p_monthly_grant,
              'monthly_reset:' || v_next_reset::text);
    end if;

    select * into v_account
    from public.ai_credit_accounts
    where id = v_account.id;
  end if;

  return v_account;
end;
$$;

revoke all on function public.ai_credit_ensure_account(text, integer) from public, anon, authenticated;
grant execute on function public.ai_credit_ensure_account(text, integer) to service_role;

comment on function public.ai_credit_ensure_account(text, integer) is
  'Idempotent upsert + rolling 30-day monthly credit grant, anchored on the account''s own creation/prior-reset date rather than the calendar month.';
