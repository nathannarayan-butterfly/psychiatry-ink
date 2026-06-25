-- ===========================================================================
-- Supabase consolidation (Prisma removal) — Phase 0: AI credit system.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Do not `supabase db push` or
--         `apply_migration` this file until the consolidation execution phase
--         (see docs/supabase-consolidation/00-plan.md, "Migration apply
--         strategy"). It is additive and idempotent-safe: it only CREATEs new
--         objects with `if not exists` / `create or replace` and never alters or
--         drops any existing table.
--
-- Replaces the Prisma models AiCreditAccount, AiCreditLedger, CreditBalance and
-- AppSetting (PascalCase models that were never applied to prod) with snake_case
-- tables, and provides SECURITY DEFINER RPC functions so the supabase-js data
-- layer can perform the atomic ledger operations that previously lived inside
-- Prisma `$transaction` blocks (server/ai/creditGuard.ts).
--
-- ID convention: Prisma used client-side `cuid()` text ids. These tables were
-- never applied to prod (no data to preserve), so we adopt the repo's newer
-- Supabase convention (`uuid default gen_random_uuid()`) for surrogate keys.
-- Natural/text keys are preserved where the id is externally meaningful
-- (CreditBalance.id = Supabase user id or 'default'; AppSetting.key).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Shared trigger to maintain updated_at (Prisma @updatedAt equivalent).
-- ---------------------------------------------------------------------------

create or replace function public.psy_set_updated_at()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.psy_set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- ai_credit_accounts  (Prisma model AiCreditAccount)
--   Per-user or per-organisation credit account. monthly_credits reset each
--   billing period; purchased_credits never expire.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_credit_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           text unique,
  organisation_id   text unique,
  monthly_credits   integer not null default 500,
  purchased_credits integer not null default 0,
  monthly_reset_at  timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint ai_credit_accounts_owner_present
    check (user_id is not null or organisation_id is not null)
);

create index if not exists ai_credit_accounts_user_idx
  on public.ai_credit_accounts (user_id)
  where user_id is not null;

create index if not exists ai_credit_accounts_org_idx
  on public.ai_credit_accounts (organisation_id)
  where organisation_id is not null;

drop trigger if exists ai_credit_accounts_set_updated_at on public.ai_credit_accounts;
create trigger ai_credit_accounts_set_updated_at
  before update on public.ai_credit_accounts
  for each row execute function public.psy_set_updated_at();

comment on table public.ai_credit_accounts is
  'AI credit balance per user/org. monthly_credits reset per period; purchased_credits never expire. Mutated server-side via RPCs only.';

-- ---------------------------------------------------------------------------
-- ai_credit_ledger  (Prisma model AiCreditLedger)
--   Append-only ledger of all credit movements. Positive = grant/purchase/
--   refund; negative = debit.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.ai_credit_accounts (id) on delete cascade,
  type          text not null
                  check (type in ('monthly_grant', 'purchase', 'debit', 'refund', 'admin_adjustment')),
  credits       integer not null,
  feature_key   text,
  usage_log_id  text,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists ai_credit_ledger_account_created_idx
  on public.ai_credit_ledger (account_id, created_at desc);

comment on table public.ai_credit_ledger is
  'Append-only AI credit ledger. credits > 0 = grant/purchase/refund, < 0 = debit. Written only inside credit RPCs.';

-- ---------------------------------------------------------------------------
-- credit_balances  (Prisma model CreditBalance)
--   Legacy per-user balance + plan storage. Retained for plan metadata and the
--   one-time migration of any remaining balance into ai_credit_accounts.
-- ---------------------------------------------------------------------------

create table if not exists public.credit_balances (
  id          text primary key,
  balance     integer not null default 200,
  plan        text not null default 'free',
  updated_at  timestamptz not null default now()
);

drop trigger if exists credit_balances_set_updated_at on public.credit_balances;
create trigger credit_balances_set_updated_at
  before update on public.credit_balances
  for each row execute function public.psy_set_updated_at();

comment on table public.credit_balances is
  'Legacy credit balance + plan (free/pro). id = Supabase user id or ''default'' for local dev.';

-- ---------------------------------------------------------------------------
-- app_settings  (Prisma model AppSetting)
--   Key/value settings. Also used as the Stripe webhook idempotency marker
--   store (key = ''stripe:event:<id>'') — server-only.
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.psy_set_updated_at();

comment on table public.app_settings is
  'Key/value app settings + Stripe webhook idempotency markers. Server (service role) only.';

-- ===========================================================================
-- Atomic credit RPCs — replace the Prisma `$transaction` logic in
-- server/ai/creditGuard.ts. All are SECURITY DEFINER with a pinned empty
-- search_path and are executable by service_role only (the Express API uses the
-- service-role key). Each function body fully schema-qualifies object names.
-- ===========================================================================

-- ensure_account: upsert the account, and atomically perform the monthly grant
-- when monthly_reset_at has elapsed. The conditional UPDATE keyed on the stale
-- monthly_reset_at guarantees exactly one winner under concurrency (no double
-- grant), mirroring the previous `updateMany` guard.
create or replace function public.ai_credit_ensure_account(
  p_user_id        text,
  p_monthly_grant  integer,
  p_next_reset     timestamptz
)
  returns public.ai_credit_accounts
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account public.ai_credit_accounts;
  v_granted integer;
begin
  insert into public.ai_credit_accounts (user_id, monthly_credits, purchased_credits, monthly_reset_at)
  values (p_user_id, p_monthly_grant, 0, p_next_reset)
  on conflict (user_id) do nothing;

  select * into v_account
  from public.ai_credit_accounts
  where user_id = p_user_id;

  -- Past the reset boundary → grant atomically; only the row still carrying the
  -- stale monthly_reset_at is updated, so concurrent callers cannot double-grant.
  if v_account.monthly_reset_at <= now() then
    update public.ai_credit_accounts
      set monthly_credits = p_monthly_grant,
          monthly_reset_at = p_next_reset
      where id = v_account.id
        and monthly_reset_at = v_account.monthly_reset_at
      returning monthly_credits into v_granted;

    if v_granted is not null then
      insert into public.ai_credit_ledger (account_id, type, credits, note)
      values (v_account.id, 'monthly_grant', p_monthly_grant,
              'monthly_reset:' || p_next_reset::text);
    end if;

    select * into v_account
    from public.ai_credit_accounts
    where id = v_account.id;
  end if;

  return v_account;
end;
$$;

-- debit: atomically spend purchased credits first, then monthly, and append a
-- debit ledger row — all in one statement-level transaction. The conditional
-- UPDATE with gte guards makes it impossible to drive either bucket negative;
-- the loser of a race returns false and writes no ledger row.
create or replace function public.ai_credit_debit(
  p_account_id    uuid,
  p_credits       integer,
  p_feature_key   text,
  p_usage_log_id  text default null,
  p_note          text default null
)
  returns boolean
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_account       public.ai_credit_accounts;
  v_from_purchased integer;
  v_from_monthly   integer;
  v_updated        uuid;
begin
  if p_credits is null or p_credits <= 0 then
    return true;
  end if;

  select * into v_account
  from public.ai_credit_accounts
  where id = p_account_id;

  if v_account.id is null then
    return false;
  end if;

  if (v_account.purchased_credits + v_account.monthly_credits) < p_credits then
    return false;
  end if;

  v_from_purchased := least(v_account.purchased_credits, p_credits);
  v_from_monthly := p_credits - v_from_purchased;

  update public.ai_credit_accounts
    set purchased_credits = purchased_credits - v_from_purchased,
        monthly_credits = monthly_credits - v_from_monthly
    where id = p_account_id
      and purchased_credits >= v_from_purchased
      and monthly_credits >= v_from_monthly
    returning id into v_updated;

  if v_updated is null then
    return false;
  end if;

  insert into public.ai_credit_ledger (account_id, type, credits, feature_key, usage_log_id, note)
  values (p_account_id, 'debit', -p_credits, p_feature_key, p_usage_log_id, p_note);

  return true;
end;
$$;

-- refund: increment monthly_credits and append a refund ledger row.
create or replace function public.ai_credit_refund(
  p_account_id    uuid,
  p_credits       integer,
  p_feature_key   text,
  p_usage_log_id  text default null,
  p_note          text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if p_credits is null or p_credits <= 0 then
    return;
  end if;

  update public.ai_credit_accounts
    set monthly_credits = monthly_credits + p_credits
    where id = p_account_id;

  insert into public.ai_credit_ledger (account_id, type, credits, feature_key, usage_log_id, note)
  values (p_account_id, 'refund', p_credits, p_feature_key, p_usage_log_id,
          coalesce(p_note, 'ai_call_failed_refund'));
end;
$$;

-- grant_purchased: increment purchased_credits and append a purchase/admin row.
-- Used by the Stripe webhook (purchase) and admin adjustments. The caller is
-- responsible for idempotency (app_settings marker) — see stripeCredits.
create or replace function public.ai_credit_grant_purchased(
  p_account_id   uuid,
  p_credits      integer,
  p_note         text default null,
  p_feature_key  text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_type text;
begin
  if p_credits is null or p_credits <= 0 then
    return;
  end if;

  v_type := case when p_note like 'stripe:%' then 'purchase' else 'admin_adjustment' end;

  update public.ai_credit_accounts
    set purchased_credits = purchased_credits + p_credits
    where id = p_account_id;

  insert into public.ai_credit_ledger (account_id, type, credits, feature_key, note)
  values (p_account_id, v_type, p_credits, p_feature_key, coalesce(p_note, 'admin_adjustment'));
end;
$$;

-- Lock down execution to the service role (Express API) only.
revoke all on function public.ai_credit_ensure_account(text, integer, timestamptz) from public;
revoke all on function public.ai_credit_debit(uuid, integer, text, text, text) from public;
revoke all on function public.ai_credit_refund(uuid, integer, text, text, text) from public;
revoke all on function public.ai_credit_grant_purchased(uuid, integer, text, text) from public;

grant execute on function public.ai_credit_ensure_account(text, integer, timestamptz) to service_role;
grant execute on function public.ai_credit_debit(uuid, integer, text, text, text) to service_role;
grant execute on function public.ai_credit_refund(uuid, integer, text, text, text) to service_role;
grant execute on function public.ai_credit_grant_purchased(uuid, integer, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS — owners may read their own balance; all writes via service role only.
-- ---------------------------------------------------------------------------

alter table public.ai_credit_accounts enable row level security;
alter table public.ai_credit_ledger enable row level security;
alter table public.credit_balances enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists ai_credit_accounts_select_owner on public.ai_credit_accounts;
create policy ai_credit_accounts_select_owner
  on public.ai_credit_accounts for select to authenticated
  using (user_id is not null and auth.uid()::text = user_id);

drop policy if exists ai_credit_ledger_select_owner on public.ai_credit_ledger;
create policy ai_credit_ledger_select_owner
  on public.ai_credit_ledger for select to authenticated
  using (
    exists (
      select 1 from public.ai_credit_accounts a
      where a.id = account_id
        and a.user_id is not null
        and auth.uid()::text = a.user_id
    )
  );

drop policy if exists credit_balances_select_owner on public.credit_balances;
create policy credit_balances_select_owner
  on public.credit_balances for select to authenticated
  using (auth.uid()::text = id);

-- app_settings: no authenticated policy — service role only (Stripe markers).
