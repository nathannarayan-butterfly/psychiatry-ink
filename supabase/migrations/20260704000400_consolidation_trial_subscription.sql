-- ===========================================================================
-- Supabase consolidation (Prisma removal) — trial + subscription / soft-lock.
--
-- ADDITIVE migration. Extends the existing `public.ai_credit_accounts` table
-- (created in 20260704000000_consolidation_credit_system.sql) with the trial,
-- subscription and soft-lock state needed for the trial → soft-lock →
-- subscription billing flow, plus SECURITY DEFINER RPCs that mutate that state
-- atomically. No existing column is dropped or retyped; only `ADD COLUMN IF NOT
-- EXISTS` and `CREATE OR REPLACE FUNCTION` are used, so re-applying is safe.
--
-- Policy implemented (confirmed with product):
--   * New account: 500 credits + a 1-month free trial (app-managed, independent
--     of any Stripe trial). `ai_credit_start_trial` is the canonical creation
--     entry point for the new flow.
--   * After the trial lapses with no active subscription and no remaining
--     purchased credits, the account is SOFT-LOCKED (read-only / blocked from
--     AI actions) — never deleted. Lock is an audit timestamp; the authoritative
--     access decision is computed live (see server/services/subscriptionAccess).
--   * Subscribing (monthly £24.99 / yearly £239.90) or recharging a credit
--     bundle at any time immediately restores access ("re-activation").
--   * Each paid subscription period grants the monthly credit allotment (500).
--
-- Security: every function below is SECURITY DEFINER with a pinned empty
-- search_path, fully schema-qualified, EXECUTE revoked from public/anon/
-- authenticated and granted to service_role only — matching the credit RPC
-- lock pattern (see consolidation_credit_rpcs_lock_execute in 03-apply-log.md).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Additive columns on ai_credit_accounts.
-- ---------------------------------------------------------------------------

alter table public.ai_credit_accounts
  add column if not exists trial_started_at                 timestamptz;
alter table public.ai_credit_accounts
  add column if not exists trial_ends_at                    timestamptz;
alter table public.ai_credit_accounts
  add column if not exists subscription_status              text;
alter table public.ai_credit_accounts
  add column if not exists subscription_plan                text;
alter table public.ai_credit_accounts
  add column if not exists subscription_interval            text;
alter table public.ai_credit_accounts
  add column if not exists stripe_customer_id               text;
alter table public.ai_credit_accounts
  add column if not exists stripe_subscription_id           text;
alter table public.ai_credit_accounts
  add column if not exists subscription_price_id            text;
alter table public.ai_credit_accounts
  add column if not exists subscription_current_period_end  timestamptz;
alter table public.ai_credit_accounts
  add column if not exists subscription_cancel_at_period_end boolean not null default false;
alter table public.ai_credit_accounts
  add column if not exists locked_at                        timestamptz;

comment on column public.ai_credit_accounts.trial_ends_at is
  'End of the app-managed free trial. While now() < trial_ends_at the account has AI access regardless of subscription.';
comment on column public.ai_credit_accounts.subscription_status is
  'Mirror of the Stripe subscription.status (trialing/active/past_due/canceled/unpaid/incomplete/...) or null when never subscribed.';
comment on column public.ai_credit_accounts.locked_at is
  'When the account was first observed soft-locked (trial lapsed, no active sub, no purchased credits). Audit only — access is computed live.';

-- Webhook lookups go by Stripe customer / subscription id.
create index if not exists ai_credit_accounts_stripe_customer_idx
  on public.ai_credit_accounts (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists ai_credit_accounts_stripe_subscription_idx
  on public.ai_credit_accounts (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- 2. ai_credit_start_trial — canonical account creation for the new flow.
--    Idempotent: creates the account with the trial grant on first call;
--    back-fills trial state exactly once for a pre-existing account that never
--    had a trial (e.g. created by the legacy ensure_account path). Never
--    re-grants for an account that already has a trial.
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_start_trial(
  p_user_id       text,
  p_trial_credits integer,
  p_trial_days    integer
)
  returns public.ai_credit_accounts
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account public.ai_credit_accounts;
  v_id      uuid;
  v_ends    timestamptz := now() + make_interval(days => p_trial_days);
begin
  insert into public.ai_credit_accounts
    (user_id, monthly_credits, purchased_credits, monthly_reset_at, trial_started_at, trial_ends_at)
  values
    (p_user_id, greatest(p_trial_credits, 0), 0, v_ends, now(), v_ends)
  on conflict (user_id) do nothing
  returning id into v_id;

  if v_id is not null then
    -- Brand new account → record the trial grant on the ledger.
    if p_trial_credits > 0 then
      insert into public.ai_credit_ledger (account_id, type, credits, note)
      values (v_id, 'monthly_grant', p_trial_credits, 'trial_grant');
    end if;
  else
    -- Existing account: back-fill the trial only if it never had one. The
    -- `trial_started_at is null` guard makes this a single-winner update.
    update public.ai_credit_accounts
      set trial_started_at = now(),
          trial_ends_at    = v_ends,
          monthly_credits  = greatest(p_trial_credits, 0),
          monthly_reset_at = v_ends
      where user_id = p_user_id
        and trial_started_at is null
      returning id into v_id;

    if v_id is not null and p_trial_credits > 0 then
      insert into public.ai_credit_ledger (account_id, type, credits, note)
      values (v_id, 'monthly_grant', p_trial_credits, 'trial_grant');
    end if;
  end if;

  select * into v_account from public.ai_credit_accounts where user_id = p_user_id;
  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. ai_credit_apply_subscription — upsert the Stripe subscription state onto
--    the account (creating a minimal account if a subscription event somehow
--    arrives first). Clears the soft-lock when the subscription is live.
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_apply_subscription(
  p_user_id               text,
  p_status                text,
  p_plan                  text,
  p_interval              text,
  p_customer_id           text,
  p_subscription_id       text,
  p_price_id              text,
  p_current_period_end    timestamptz,
  p_cancel_at_period_end  boolean
)
  returns public.ai_credit_accounts
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account public.ai_credit_accounts;
begin
  insert into public.ai_credit_accounts (user_id, monthly_credits, purchased_credits, monthly_reset_at)
  values (p_user_id, 0, 0, now())
  on conflict (user_id) do nothing;

  update public.ai_credit_accounts
    set subscription_status            = p_status,
        subscription_plan              = coalesce(p_plan, subscription_plan),
        subscription_interval          = coalesce(p_interval, subscription_interval),
        stripe_customer_id             = coalesce(p_customer_id, stripe_customer_id),
        stripe_subscription_id         = coalesce(p_subscription_id, stripe_subscription_id),
        subscription_price_id          = coalesce(p_price_id, subscription_price_id),
        subscription_current_period_end = coalesce(p_current_period_end, subscription_current_period_end),
        subscription_cancel_at_period_end = coalesce(p_cancel_at_period_end, subscription_cancel_at_period_end),
        locked_at                      = case
                                           when p_status in ('active', 'trialing') then null
                                           else locked_at
                                         end
    where user_id = p_user_id
    returning * into v_account;

  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. ai_credit_grant_subscription_period — grant the monthly credit allotment
--    for a paid subscription period (invoice.paid) and advance the period end.
--    Resets monthly_credits to the allotment (mirrors the monthly grant
--    semantics) and clears any soft-lock. Idempotency is the caller's job (the
--    app_settings per-event marker), per the Stripe-credits flow.
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_grant_subscription_period(
  p_user_id            text,
  p_credits            integer,
  p_current_period_end timestamptz,
  p_note               text
)
  returns public.ai_credit_accounts
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account public.ai_credit_accounts;
  v_id      uuid;
begin
  insert into public.ai_credit_accounts (user_id, monthly_credits, purchased_credits, monthly_reset_at)
  values (p_user_id, 0, 0, coalesce(p_current_period_end, now()))
  on conflict (user_id) do nothing;

  update public.ai_credit_accounts
    set monthly_credits  = greatest(p_credits, 0),
        monthly_reset_at = coalesce(p_current_period_end, monthly_reset_at),
        subscription_current_period_end = coalesce(p_current_period_end, subscription_current_period_end),
        locked_at        = null
    where user_id = p_user_id
    returning id into v_id;

  if v_id is not null and p_credits > 0 then
    insert into public.ai_credit_ledger (account_id, type, credits, note)
    values (v_id, 'monthly_grant', p_credits, coalesce(p_note, 'subscription_renewal'));
  end if;

  select * into v_account from public.ai_credit_accounts where user_id = p_user_id;
  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. ai_credit_set_lock — set/clear the soft-lock audit timestamp. Used by a
--    lapse sweep and by the lazy enforcement path. Setting is idempotent (only
--    stamps when not already locked); clearing always nulls it.
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_set_lock(
  p_user_id text,
  p_locked  boolean
)
  returns public.ai_credit_accounts
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account public.ai_credit_accounts;
begin
  update public.ai_credit_accounts
    set locked_at = case
                      when p_locked then coalesce(locked_at, now())
                      else null
                    end
    where user_id = p_user_id
    returning * into v_account;

  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Lock down EXECUTE to service_role only (Supabase grants EXECUTE on new
--    public functions to anon + authenticated by default; revoke from public
--    alone does NOT remove those — see 03-apply-log.md §3.2).
-- ---------------------------------------------------------------------------

revoke all on function public.ai_credit_start_trial(text, integer, integer) from public, anon, authenticated;
revoke all on function public.ai_credit_apply_subscription(text, text, text, text, text, text, text, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.ai_credit_grant_subscription_period(text, integer, timestamptz, text) from public, anon, authenticated;
revoke all on function public.ai_credit_set_lock(text, boolean) from public, anon, authenticated;

grant execute on function public.ai_credit_start_trial(text, integer, integer) to service_role;
grant execute on function public.ai_credit_apply_subscription(text, text, text, text, text, text, text, timestamptz, boolean) to service_role;
grant execute on function public.ai_credit_grant_subscription_period(text, integer, timestamptz, text) to service_role;
grant execute on function public.ai_credit_set_lock(text, boolean) to service_role;
