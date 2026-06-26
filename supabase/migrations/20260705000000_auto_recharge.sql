-- ===========================================================================
-- Auto-recharge of AI credits (Cursor-style, opt-in, off by default).
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. This touches LIVE billing.
--         Do not `supabase db push` / `apply_migration` until the auto-recharge
--         feature is signed off and tested end-to-end against live Stripe.
--
-- ADDITIVE migration. Extends the existing `public.ai_credit_accounts` table
-- (created in 20260704000000_consolidation_credit_system.sql, extended in
-- 20260704000400_consolidation_trial_subscription.sql) with per-account
-- auto-recharge configuration + the in-flight / cap bookkeeping needed to
-- prevent runaway or stacked off-session charges, plus SECURITY DEFINER RPCs
-- that mutate that state atomically. No existing column is dropped or retyped;
-- only `ADD COLUMN IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` are used, so
-- re-applying is safe.
--
-- Feature contract (approved scope):
--   * OPT-IN: auto_recharge_enabled defaults to false.
--   * Trigger: when total usable credits (monthly + purchased) drop BELOW
--     auto_recharge_threshold (default 100).
--   * Action: charge the saved off-session payment method for ONE standard
--     credit pack, then grant the credits via the Stripe webhook.
--   * Guard rails: a single-winner in-flight lock + a per-period cap + a
--     cooldown, all enforced inside `ai_credit_auto_recharge_begin` so two
--     concurrent AI requests can never stack charges.
--
-- Security: every function below is SECURITY DEFINER with a pinned empty
-- search_path, fully schema-qualified, EXECUTE revoked from public/anon/
-- authenticated and granted to service_role only — matching the credit RPC lock
-- pattern (see 20260704000000 / 20260704000400 and 03-apply-log.md §3.2).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Additive columns on ai_credit_accounts.
-- ---------------------------------------------------------------------------

alter table public.ai_credit_accounts
  add column if not exists auto_recharge_enabled        boolean not null default false;
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_threshold       integer not null default 100;
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_pack_id         text;
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_amount          integer;
alter table public.ai_credit_accounts
  add column if not exists default_payment_method_id     text;
-- In-flight lock: stamped when a recharge begins, cleared when it resolves. A
-- stale stamp (older than the begin RPC's p_stale) is treated as abandoned so a
-- crashed attempt can never wedge the account permanently.
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_in_flight_at    timestamptz;
-- Last successful (or last attempted-and-acknowledged) recharge — drives the
-- cooldown so a single AI burst that drains the balance can't fire repeatedly
-- before the granting webhook lands.
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_last_at         timestamptz;
-- Per-period cap bookkeeping (rolling window).
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_period_start    timestamptz;
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_period_count    integer not null default 0;
-- Operational status surfaced to the user: null/'active' = healthy,
-- 'needs_attention' = a hard failure (declined / SCA) disabled or paused it.
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_status          text;
alter table public.ai_credit_accounts
  add column if not exists auto_recharge_failure_reason  text;

comment on column public.ai_credit_accounts.auto_recharge_enabled is
  'Opt-in toggle for Cursor-style auto-recharge. Off by default. When on AND a default payment method + threshold are set, a low balance triggers an off-session top-up.';
comment on column public.ai_credit_accounts.auto_recharge_threshold is
  'Auto-recharge fires when monthly_credits + purchased_credits drops below this value (default 100).';
comment on column public.ai_credit_accounts.auto_recharge_pack_id is
  'CreditPack id (src/data/creditPacks.ts) charged on each auto-recharge.';
comment on column public.ai_credit_accounts.default_payment_method_id is
  'Stripe PaymentMethod id saved off-session (setup_future_usage / SetupIntent). Charged via off_session PaymentIntents. Never a raw card number.';
comment on column public.ai_credit_accounts.auto_recharge_in_flight_at is
  'Single-winner in-flight lock for an auto-recharge charge. Cleared on resolve; a stamp older than the begin RPC p_stale is treated as abandoned.';
comment on column public.ai_credit_accounts.auto_recharge_status is
  'Auto-recharge health: null/''active'' = ok, ''needs_attention'' = a hard decline/SCA failure paused it and the user must re-confirm a card.';

-- ---------------------------------------------------------------------------
-- 2. ai_credit_set_auto_recharge — persist the opt-in settings from the UI.
--    Creates a minimal account if one does not exist yet (defensive; the UI
--    only exposes this once an account is present). Enabling clears any prior
--    failure state so a fresh opt-in starts healthy.
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_set_auto_recharge(
  p_user_id   text,
  p_enabled   boolean,
  p_threshold integer,
  p_pack_id   text,
  p_amount    integer
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
    set auto_recharge_enabled       = coalesce(p_enabled, auto_recharge_enabled),
        -- Clamp the threshold into a sane band [1, 100000]; null leaves it.
        auto_recharge_threshold     = case
                                         when p_threshold is null then auto_recharge_threshold
                                         else greatest(1, least(p_threshold, 100000))
                                       end,
        auto_recharge_pack_id       = coalesce(p_pack_id, auto_recharge_pack_id),
        auto_recharge_amount        = coalesce(p_amount, auto_recharge_amount),
        -- Re-enabling clears a prior needs_attention so a fresh opt-in is healthy.
        auto_recharge_status        = case
                                         when coalesce(p_enabled, auto_recharge_enabled) then 'active'
                                         else auto_recharge_status
                                       end,
        auto_recharge_failure_reason = case
                                         when coalesce(p_enabled, auto_recharge_enabled) then null
                                         else auto_recharge_failure_reason
                                       end
    where user_id = p_user_id
    returning * into v_account;

  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. ai_credit_set_payment_method — persist the Stripe customer + default
--    off-session payment method captured by checkout/SetupIntent. Setting a
--    payment method clears any needs_attention state (a fresh card resolves a
--    prior decline/SCA failure). Customer-only calls (pass p_payment_method_id
--    null) just persist the customer mapping during customer creation.
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_set_payment_method(
  p_user_id           text,
  p_customer_id       text,
  p_payment_method_id text
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
    set stripe_customer_id        = coalesce(p_customer_id, stripe_customer_id),
        default_payment_method_id = coalesce(p_payment_method_id, default_payment_method_id),
        -- A freshly saved card clears a prior failure and reactivates if enabled.
        auto_recharge_status        = case
                                         when p_payment_method_id is not null and auto_recharge_enabled
                                           then 'active'
                                         else auto_recharge_status
                                       end,
        auto_recharge_failure_reason = case
                                         when p_payment_method_id is not null then null
                                         else auto_recharge_failure_reason
                                       end
    where user_id = p_user_id
    returning * into v_account;

  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. ai_credit_auto_recharge_begin — atomically decide + claim an auto-recharge
--    attempt. Returns the account row when THIS caller won the right to charge,
--    or NULL when ineligible / already in-flight / capped / on cooldown.
--
--    The decision and the lock are a single conditional UPDATE: under
--    concurrency Postgres serializes the row update, so exactly one of two
--    racing AI requests acquires the lock and bumps the per-period counter —
--    the loser sees no matching row and returns NULL. This is the same
--    single-winner pattern used by ai_credit_debit / ai_credit_ensure_account.
--
--    Gates (ALL must hold):
--      * auto_recharge_enabled = true
--      * a saved customer + default payment method exist
--      * total usable credits < auto_recharge_threshold
--      * not currently in-flight (or the stamp is older than p_stale → abandoned)
--      * cooldown elapsed since the last attempt (p_cooldown)
--      * per-period cap not exceeded within the rolling p_period window
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_auto_recharge_begin(
  p_user_id        text,
  p_max_per_period integer,
  p_period         interval,
  p_cooldown       interval,
  p_stale          interval
)
  returns public.ai_credit_accounts
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account public.ai_credit_accounts;
  v_window_reset boolean;
begin
  update public.ai_credit_accounts a
    set
      auto_recharge_in_flight_at = now(),
      auto_recharge_period_start =
        case
          when a.auto_recharge_period_start is null
            or a.auto_recharge_period_start <= now() - p_period
          then now()
          else a.auto_recharge_period_start
        end,
      auto_recharge_period_count =
        case
          when a.auto_recharge_period_start is null
            or a.auto_recharge_period_start <= now() - p_period
          then 1
          else a.auto_recharge_period_count + 1
        end
    where a.user_id = p_user_id
      and a.auto_recharge_enabled = true
      and a.default_payment_method_id is not null
      and a.stripe_customer_id is not null
      and (a.monthly_credits + a.purchased_credits) < a.auto_recharge_threshold
      and (a.auto_recharge_in_flight_at is null
           or a.auto_recharge_in_flight_at <= now() - p_stale)
      and (a.auto_recharge_last_at is null
           or a.auto_recharge_last_at <= now() - p_cooldown)
      and (a.auto_recharge_period_start is null
           or a.auto_recharge_period_start <= now() - p_period
           or a.auto_recharge_period_count < p_max_per_period)
    returning * into v_account;

  -- v_account is NULL when no row matched (ineligible / capped / in-flight).
  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. ai_credit_auto_recharge_finish — release the in-flight lock and record the
--    outcome. The credit GRANT itself happens in the Stripe webhook
--    (payment_intent.succeeded → ai_credit_grant_purchased); this only manages
--    the auto-recharge state machine.
--
--      * success  → clear lock, stamp auto_recharge_last_at, status 'active',
--                   clear failure_reason (starts the cooldown).
--      * failure  → clear lock; when p_failure_reason is provided, mark
--                   'needs_attention' with the reason; when p_disable, also flip
--                   auto_recharge_enabled off (hard declines / SCA — never loop).
--                   Transient failures pass null reason + p_disable=false so the
--                   attempt can retry later, still bounded by the cap + cooldown.
-- ---------------------------------------------------------------------------

create or replace function public.ai_credit_auto_recharge_finish(
  p_user_id        text,
  p_success        boolean,
  p_disable        boolean,
  p_failure_reason text
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
    set auto_recharge_in_flight_at = null,
        auto_recharge_last_at = case when p_success then now() else auto_recharge_last_at end,
        auto_recharge_enabled = case
                                  when not p_success and p_disable then false
                                  else auto_recharge_enabled
                                end,
        auto_recharge_status = case
                                 when p_success then 'active'
                                 when p_failure_reason is not null then 'needs_attention'
                                 else auto_recharge_status
                               end,
        auto_recharge_failure_reason = case
                                         when p_success then null
                                         when p_failure_reason is not null then p_failure_reason
                                         else auto_recharge_failure_reason
                                       end
    where user_id = p_user_id
    returning * into v_account;

  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Lock down EXECUTE to service_role only (Supabase grants EXECUTE on new
--    public functions to anon + authenticated by default; revoke from public
--    alone does NOT remove those — see 03-apply-log.md §3.2). These are
--    money-affecting SECURITY DEFINER functions, so a stray anon/authenticated
--    EXECUTE would be a privilege-escalation hole.
-- ---------------------------------------------------------------------------

revoke all on function public.ai_credit_set_auto_recharge(text, boolean, integer, text, integer) from public, anon, authenticated;
revoke all on function public.ai_credit_set_payment_method(text, text, text) from public, anon, authenticated;
revoke all on function public.ai_credit_auto_recharge_begin(text, integer, interval, interval, interval) from public, anon, authenticated;
revoke all on function public.ai_credit_auto_recharge_finish(text, boolean, boolean, text) from public, anon, authenticated;

grant execute on function public.ai_credit_set_auto_recharge(text, boolean, integer, text, integer) to service_role;
grant execute on function public.ai_credit_set_payment_method(text, text, text) to service_role;
grant execute on function public.ai_credit_auto_recharge_begin(text, integer, interval, interval, interval) to service_role;
grant execute on function public.ai_credit_auto_recharge_finish(text, boolean, boolean, text) to service_role;
