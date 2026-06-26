-- ===========================================================================
-- Invite / referral system. An inviter earns 250 AI credits when one of their
-- invitees converts to a REAL paid subscription (the first non-$0 invoice.paid),
-- excluding the $0 trial-start invoice. One reward per unique converted invitee,
-- idempotent; self-referrals are ignored.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe
--         (CREATE ... IF NOT EXISTS / CREATE OR REPLACE only). Apply during the
--         billing go-live phase together with 20260705000000_voucher_system.sql.
--
-- Design notes
--   * `referral_codes` holds ONE reusable shareable code per user (the invite
--     link target). This is intentionally split out from the per-invitee rows so
--     a single code can attract many invitees.
--   * `referrals` holds ONE row per attributed invitee (invitee_user is unique),
--     carrying the lifecycle status and the timestamps the task specifies
--     (referrer_user, invite_code, invitee_user, status, created_at,
--     converted_at, rewarded_at). invitee_user UNIQUE guarantees an invitee is
--     attributed to exactly one referrer and rewarded at most once.
--   * The reward (status flip signed_up/converted -> rewarded AND the 250-credit
--     grant to the referrer) happens atomically inside referral_claim_reward, so
--     a webhook retry can never double-pay and a crash can never half-apply. The
--     grant mirrors ai_credit_grant_purchased (purchased bucket + 'purchase'
--     ledger row noted 'referral:<id>').
--
-- Security: SECURITY DEFINER, pinned empty search_path, fully schema-qualified,
-- EXECUTE revoked from public/anon/authenticated, granted to service_role only.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- referral_codes — one reusable invite code per user.
-- ---------------------------------------------------------------------------
create table if not exists public.referral_codes (
  user_id    text primary key,
  code       text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.referral_codes is
  'One reusable invite code per user (the shareable invite-link target).';

-- ---------------------------------------------------------------------------
-- referrals — one row per attributed invitee.
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_user text not null,
  invite_code   text not null,
  invitee_user  text unique,
  status        text not null default 'pending'
                  check (status in ('pending', 'signed_up', 'converted', 'rewarded')),
  reward_credits integer not null default 0,
  created_at    timestamptz not null default now(),
  signed_up_at  timestamptz,
  converted_at  timestamptz,
  rewarded_at   timestamptz,
  constraint referrals_no_self_referral check (invitee_user is null or invitee_user <> referrer_user)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_user);
create index if not exists referrals_status_idx on public.referrals (referrer_user, status);

comment on table public.referrals is
  'One row per attributed invitee. invitee_user UNIQUE => one referrer + at most one reward per invitee.';

-- ===========================================================================
-- RPCs
-- ===========================================================================

-- referral_get_or_create_code: return the caller's reusable invite code,
-- creating it (with the server-supplied candidate) on first call. Idempotent.
create or replace function public.referral_get_or_create_code(
  p_user_id text,
  p_code    text
)
  returns text
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_code text;
begin
  insert into public.referral_codes (user_id, code)
  values (p_user_id, upper(btrim(p_code)))
  on conflict (user_id) do nothing;

  select code into v_code from public.referral_codes where user_id = p_user_id;
  return v_code;
end;
$$;

-- referral_attribute: bind a newly signed-up invitee to the referrer behind
-- `p_code`. Ignores self-referrals and is idempotent (invitee_user UNIQUE: a
-- second attempt, even with a different code, no-ops). Returns a jsonb result.
create or replace function public.referral_attribute(
  p_invitee text,
  p_code    text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_code     text := upper(btrim(coalesce(p_code, '')));
  v_referrer text;
  v_inserted uuid;
begin
  if v_code = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select user_id into v_referrer from public.referral_codes where code = v_code;
  if v_referrer is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_referrer = p_invitee then
    return jsonb_build_object('ok', false, 'error', 'self_referral');
  end if;

  insert into public.referrals (referrer_user, invite_code, invitee_user, status, signed_up_at)
  values (v_referrer, v_code, p_invitee, 'signed_up', now())
  on conflict (invitee_user) do nothing
  returning id into v_inserted;

  return jsonb_build_object('ok', true, 'attributed', v_inserted is not null);
end;
$$;

-- referral_claim_reward: when an invitee converts to a real paid subscription,
-- atomically (a) flip their referral row signed_up/converted -> rewarded and
-- (b) grant the referrer p_reward_credits into the purchased bucket + a
-- 'purchase' ledger row noted 'referral:<id>'. Exactly-once by construction: the
-- status guard means only the first call performs the transition + grant; later
-- calls (webhook retries / duplicate events) update no row and return granted
-- false. Mirrors ai_credit_grant_purchased for the grant itself.
create or replace function public.referral_claim_reward(
  p_invitee        text,
  p_reward_credits integer
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_referral_id uuid;
  v_referrer    text;
  v_account_id  uuid;
begin
  update public.referrals
    set status        = 'rewarded',
        reward_credits = p_reward_credits,
        converted_at  = coalesce(converted_at, now()),
        rewarded_at   = now()
    where invitee_user = p_invitee
      and status in ('pending', 'signed_up', 'converted')
    returning id, referrer_user into v_referral_id, v_referrer;

  if v_referral_id is null then
    -- No attribution, or already rewarded -> nothing to do (idempotent).
    return jsonb_build_object('ok', true, 'granted', false);
  end if;

  if p_reward_credits > 0 then
    insert into public.ai_credit_accounts (user_id, monthly_credits, purchased_credits, monthly_reset_at)
    values (v_referrer, 0, 0, now())
    on conflict (user_id) do nothing;

    update public.ai_credit_accounts
      set purchased_credits = purchased_credits + p_reward_credits
      where user_id = v_referrer
      returning id into v_account_id;

    insert into public.ai_credit_ledger (account_id, type, credits, note)
    values (v_account_id, 'purchase', p_reward_credits, 'referral:' || v_referral_id::text);
  end if;

  return jsonb_build_object(
    'ok', true, 'granted', true,
    'referral_id', v_referral_id, 'referrer_user', v_referrer
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down EXECUTE to service_role only.
-- ---------------------------------------------------------------------------
revoke all on function public.referral_get_or_create_code(text, text) from public, anon, authenticated;
revoke all on function public.referral_attribute(text, text) from public, anon, authenticated;
revoke all on function public.referral_claim_reward(text, integer) from public, anon, authenticated;

grant execute on function public.referral_get_or_create_code(text, text) to service_role;
grant execute on function public.referral_attribute(text, text) to service_role;
grant execute on function public.referral_claim_reward(text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- RLS — referrer may read their own code + their invitees' rows. Writes via
-- service role only.
-- ---------------------------------------------------------------------------
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

drop policy if exists referral_codes_select_owner on public.referral_codes;
create policy referral_codes_select_owner
  on public.referral_codes for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists referrals_select_referrer on public.referrals;
create policy referrals_select_referrer
  on public.referrals for select to authenticated
  using (auth.uid()::text = referrer_user);
