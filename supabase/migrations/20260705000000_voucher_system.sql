-- ===========================================================================
-- Gutschein (voucher) system — APP-MANAGED redeemable codes that grant credits
-- over a validity period (e.g. 500 credits/month for 6 months), plus a
-- buy-a-gift purchase flow (source='purchase', created by the Stripe webhook).
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe:
--         only CREATE ... IF NOT EXISTS / CREATE OR REPLACE are used. No existing
--         object is dropped or retyped. Apply during the billing go-live phase
--         (see the BEFORE-GOING-LIVE checklist in the task report) together with
--         20260705000100_referral_system.sql.
--
-- Design notes
--   * `vouchers` holds the code definition (credits_per_period, period_months,
--     total_periods, validity window, status, source). A code may be redeemed by
--     up to `max_redemptions` distinct users (gift purchases create single-use
--     codes; admin can issue multi-use codes).
--   * `voucher_redemptions` binds a voucher to a redeeming user and tracks the
--     recurring-grant cursor (periods_granted / next_grant_at). The per-period
--     entitlement is anchored at redemption time and runs for `total_periods`
--     periods regardless of the voucher validity window (validity gates *when a
--     code may be redeemed*, not the post-redemption grant schedule).
--   * `voucher_period_grants` is the idempotency ledger: a unique
--     (redemption_id, period_index) row is the gate that makes each period's
--     credit grant exactly-once even under concurrent "claim due periods" calls.
--   * Credits are granted into the same `purchased_credits` bucket + append a
--     `purchase` row to `ai_credit_ledger`, exactly mirroring
--     `ai_credit_grant_purchased` / `addPurchasedCredits` — the grant is done
--     inside `voucher_grant_period` so the idempotency guard and the balance
--     mutation commit atomically together.
--
-- Security: every function is SECURITY DEFINER with a pinned empty search_path,
-- fully schema-qualified, EXECUTE revoked from public/anon/authenticated and
-- granted to service_role only — matching the credit-RPC lock pattern.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- vouchers
-- ---------------------------------------------------------------------------
create table if not exists public.vouchers (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  credits_per_period integer not null check (credits_per_period > 0),
  period_months      integer not null default 1 check (period_months > 0),
  total_periods      integer not null check (total_periods > 0),
  max_redemptions    integer not null default 1 check (max_redemptions > 0),
  valid_from         timestamptz not null default now(),
  valid_until        timestamptz not null,
  status             text not null default 'active'
                       check (status in ('active', 'disabled', 'exhausted', 'expired')),
  source             text not null default 'admin'
                       check (source in ('admin', 'purchase')),
  created_by         text,
  stripe_session_id  text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists vouchers_created_by_idx
  on public.vouchers (created_by) where created_by is not null;

drop trigger if exists vouchers_set_updated_at on public.vouchers;
create trigger vouchers_set_updated_at
  before update on public.vouchers
  for each row execute function public.psy_set_updated_at();

comment on table public.vouchers is
  'Gutschein codes granting credits_per_period credits each period_months for total_periods periods. source=admin|purchase. Mutated server-side via RPCs only.';

-- ---------------------------------------------------------------------------
-- voucher_redemptions
-- ---------------------------------------------------------------------------
create table if not exists public.voucher_redemptions (
  id              uuid primary key default gen_random_uuid(),
  voucher_id      uuid not null references public.vouchers (id) on delete cascade,
  redeemed_by     text not null,
  redeemed_at     timestamptz not null default now(),
  periods_granted integer not null default 0,
  next_grant_at   timestamptz,
  last_grant_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint voucher_redemptions_unique_user unique (voucher_id, redeemed_by)
);

create index if not exists voucher_redemptions_user_idx
  on public.voucher_redemptions (redeemed_by);

create index if not exists voucher_redemptions_due_idx
  on public.voucher_redemptions (redeemed_by, next_grant_at)
  where next_grant_at is not null;

drop trigger if exists voucher_redemptions_set_updated_at on public.voucher_redemptions;
create trigger voucher_redemptions_set_updated_at
  before update on public.voucher_redemptions
  for each row execute function public.psy_set_updated_at();

comment on table public.voucher_redemptions is
  'Binds a voucher to a redeeming user and tracks the recurring-grant cursor (periods_granted/next_grant_at).';

-- ---------------------------------------------------------------------------
-- voucher_period_grants — per-(redemption, period_index) idempotency ledger.
-- ---------------------------------------------------------------------------
create table if not exists public.voucher_period_grants (
  id            uuid primary key default gen_random_uuid(),
  redemption_id uuid not null references public.voucher_redemptions (id) on delete cascade,
  period_index  integer not null check (period_index >= 0),
  credits       integer not null,
  granted_at    timestamptz not null default now(),
  constraint voucher_period_grants_unique unique (redemption_id, period_index)
);

comment on table public.voucher_period_grants is
  'Idempotency gate for voucher period credit grants: one row per (redemption, period_index). Service role only.';

-- ===========================================================================
-- RPCs
-- ===========================================================================

-- voucher_redeem: validate + bind a redemption to the user. Returns a jsonb
-- result object. Does NOT grant credits — the caller then claims due periods via
-- voucher_grant_period (so the immediate first-period grant shares the same
-- exactly-once path as every recurring grant).
create or replace function public.voucher_redeem(
  p_user_id text,
  p_code    text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_voucher        public.vouchers;
  v_code           text := upper(btrim(coalesce(p_code, '')));
  v_redemption_id  uuid;
  v_active_count   integer;
begin
  if v_code = '' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_voucher from public.vouchers where code = v_code for update;
  if v_voucher.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_voucher.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;

  if now() < v_voucher.valid_from or now() > v_voucher.valid_until then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- Already redeemed by this user?
  select id into v_redemption_id
  from public.voucher_redemptions
  where voucher_id = v_voucher.id and redeemed_by = p_user_id;
  if v_redemption_id is not null then
    return jsonb_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  -- Capacity check.
  select count(*) into v_active_count
  from public.voucher_redemptions
  where voucher_id = v_voucher.id;
  if v_active_count >= v_voucher.max_redemptions then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;

  insert into public.voucher_redemptions
    (voucher_id, redeemed_by, redeemed_at, periods_granted, next_grant_at)
  values
    (v_voucher.id, p_user_id, now(), 0, now())
  returning id into v_redemption_id;

  -- Mark the voucher exhausted once capacity is reached.
  if (v_active_count + 1) >= v_voucher.max_redemptions then
    update public.vouchers set status = 'exhausted' where id = v_voucher.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'redemption_id', v_redemption_id,
    'voucher_id', v_voucher.id,
    'credits_per_period', v_voucher.credits_per_period,
    'period_months', v_voucher.period_months,
    'total_periods', v_voucher.total_periods
  );
end;
$$;

-- voucher_grant_period: idempotently grant ONE period's credits for a redemption.
-- Inserting the (redemption_id, period_index) guard row and mutating the balance
-- happen in one transaction; a duplicate call hits the unique guard and no-ops.
-- Returns true when this call performed the grant, false when it was already done.
create or replace function public.voucher_grant_period(
  p_redemption_id uuid,
  p_period_index  integer
)
  returns boolean
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_redemption public.voucher_redemptions;
  v_voucher    public.vouchers;
  v_account_id uuid;
  v_inserted   uuid;
begin
  select * into v_redemption from public.voucher_redemptions where id = p_redemption_id;
  if v_redemption.id is null then
    return false;
  end if;

  select * into v_voucher from public.vouchers where id = v_redemption.voucher_id;
  if v_voucher.id is null then
    return false;
  end if;

  if p_period_index < 0 or p_period_index >= v_voucher.total_periods then
    return false;
  end if;

  -- Idempotency gate: only the first insert for this (redemption, period) wins.
  insert into public.voucher_period_grants (redemption_id, period_index, credits)
  values (p_redemption_id, p_period_index, v_voucher.credits_per_period)
  on conflict (redemption_id, period_index) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return false; -- already granted
  end if;

  -- Ensure the recipient account exists (mirrors apply_subscription's safety net).
  insert into public.ai_credit_accounts (user_id, monthly_credits, purchased_credits, monthly_reset_at)
  values (v_redemption.redeemed_by, 0, 0, now())
  on conflict (user_id) do nothing;

  update public.ai_credit_accounts
    set purchased_credits = purchased_credits + v_voucher.credits_per_period
    where user_id = v_redemption.redeemed_by
    returning id into v_account_id;

  -- Same ledger semantics as ai_credit_grant_purchased (type 'purchase').
  insert into public.ai_credit_ledger (account_id, type, credits, note)
  values (
    v_account_id, 'purchase', v_voucher.credits_per_period,
    'voucher:' || p_redemption_id::text || ':' || p_period_index::text
  );

  -- Advance the cursor. Periods are anchored at redeemed_at; period k is due at
  -- redeemed_at + k * period_months.
  update public.voucher_redemptions
    set periods_granted = greatest(periods_granted, p_period_index + 1),
        last_grant_at   = now(),
        next_grant_at   = case
                            when greatest(periods_granted, p_period_index + 1) >= v_voucher.total_periods
                              then null
                            else v_redemption.redeemed_at
                                 + make_interval(months => v_voucher.period_months
                                   * greatest(periods_granted, p_period_index + 1))
                          end
    where id = p_redemption_id;

  return true;
end;
$$;

-- voucher_create_from_purchase: create a purchased gift voucher, idempotent on
-- the Stripe checkout session id (so webhook retries never mint duplicates).
-- The server generates the human-facing code and passes it in; on a session
-- conflict the pre-existing code is returned unchanged.
create or replace function public.voucher_create_from_purchase(
  p_session_id         text,
  p_buyer              text,
  p_code               text,
  p_credits_per_period integer,
  p_period_months      integer,
  p_total_periods      integer,
  p_valid_days         integer
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_code text;
begin
  insert into public.vouchers
    (code, credits_per_period, period_months, total_periods, max_redemptions,
     valid_from, valid_until, status, source, created_by, stripe_session_id)
  values
    (upper(btrim(p_code)), p_credits_per_period, p_period_months, p_total_periods, 1,
     now(), now() + make_interval(days => greatest(p_valid_days, 1)),
     'active', 'purchase', p_buyer, p_session_id)
  on conflict (stripe_session_id) do nothing;

  select code into v_code from public.vouchers where stripe_session_id = p_session_id;

  return jsonb_build_object('ok', v_code is not null, 'code', v_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down EXECUTE to service_role only.
-- ---------------------------------------------------------------------------
revoke all on function public.voucher_redeem(text, text) from public, anon, authenticated;
revoke all on function public.voucher_grant_period(uuid, integer) from public, anon, authenticated;
revoke all on function public.voucher_create_from_purchase(text, text, text, integer, integer, integer, integer) from public, anon, authenticated;

grant execute on function public.voucher_redeem(text, text) to service_role;
grant execute on function public.voucher_grant_period(uuid, integer) to service_role;
grant execute on function public.voucher_create_from_purchase(text, text, text, integer, integer, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- RLS — owners may read their own rows; all writes via service role only.
-- ---------------------------------------------------------------------------
alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
alter table public.voucher_period_grants enable row level security;

-- Buyer can read the gift vouchers they created (to display/copy the code).
drop policy if exists vouchers_select_creator on public.vouchers;
create policy vouchers_select_creator
  on public.vouchers for select to authenticated
  using (created_by is not null and auth.uid()::text = created_by);

drop policy if exists voucher_redemptions_select_owner on public.voucher_redemptions;
create policy voucher_redemptions_select_owner
  on public.voucher_redemptions for select to authenticated
  using (auth.uid()::text = redeemed_by);

-- voucher_period_grants: no authenticated policy — service role only.
