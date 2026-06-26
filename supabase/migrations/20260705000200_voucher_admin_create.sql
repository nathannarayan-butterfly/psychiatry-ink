-- ===========================================================================
-- Gutschein (voucher) — ADMIN/OWNER-managed PROMO code creation + management.
--
-- Adds an Owner/operator-only path to mint and review promo (source='admin')
-- vouchers, replacing the previous raw-SQL-insert workflow. The user-bought
-- gift flow (source='purchase', voucher_create_from_purchase) is untouched.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive and idempotent-safe:
--         only CREATE OR REPLACE FUNCTION is used; no table/column/grant of the
--         existing voucher system is dropped, retyped or loosened. Apply during
--         the billing go-live phase together with 20260705000000_voucher_system.sql
--         and 20260705000100_referral_system.sql.
--
-- Security: both functions are SECURITY DEFINER with a pinned empty search_path,
-- fully schema-qualified, EXECUTE revoked from public/anon/authenticated and
-- granted to service_role only — matching the credit/voucher-RPC lock pattern.
-- Authorization of the *caller* (Owner/operator allowlist) is enforced in the
-- Express layer before these are ever invoked via the service-role client.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- voucher_create_admin: mint a source='admin' promo voucher.
--
-- The code is caller-provided (validated unique) or, when omitted, auto-generated
-- with a PROMO- prefix using the same unambiguous alphabet (no 0/O/1/I) and the
-- two-group shape as the server-side generateVoucherCode helper.
--
-- Validity window end is resolved from p_valid_until when given, else now() +
-- p_valid_days, else a 365-day default. The validity window gates *when a code
-- may be redeemed*; the post-redemption grant schedule still runs for
-- total_periods periods (see voucher_grant_period).
--
-- Returns a jsonb result: { ok, code, credits_per_period, period_months,
-- total_periods, max_redemptions, valid_until } on success, or { ok:false, error }.
-- ---------------------------------------------------------------------------
create or replace function public.voucher_create_admin(
  p_created_by         text,
  p_code               text,
  p_credits_per_period integer,
  p_period_months      integer,
  p_total_periods      integer,
  p_max_redemptions    integer,
  p_valid_until        timestamptz,
  p_valid_days         integer
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_code            text := upper(btrim(coalesce(p_code, '')));
  v_period_months   integer := coalesce(p_period_months, 1);
  v_max_redemptions integer := coalesce(p_max_redemptions, 1);
  v_valid_until     timestamptz;
  v_alphabet        text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_group_a         text;
  v_group_b         text;
  v_attempts        integer := 0;
  i                 integer;
begin
  -- Sane numeric checks.
  if p_credits_per_period is null or p_credits_per_period <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_credits');
  end if;
  if v_period_months <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_period_months');
  end if;
  if p_total_periods is null or p_total_periods <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_total_periods');
  end if;
  if v_max_redemptions < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_max_redemptions');
  end if;

  -- Resolve the validity window end.
  if p_valid_until is not null then
    v_valid_until := p_valid_until;
  elsif p_valid_days is not null and p_valid_days > 0 then
    v_valid_until := now() + make_interval(days => p_valid_days);
  else
    v_valid_until := now() + make_interval(days => 365);
  end if;
  if v_valid_until <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_valid_until');
  end if;

  -- Resolve the code: caller-provided (must be unique) or auto-generated.
  if v_code <> '' then
    if exists (select 1 from public.vouchers where code = v_code) then
      return jsonb_build_object('ok', false, 'error', 'code_exists');
    end if;
  else
    loop
      v_attempts := v_attempts + 1;
      v_group_a := '';
      v_group_b := '';
      for i in 1..4 loop
        v_group_a := v_group_a || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
        v_group_b := v_group_b || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      end loop;
      v_code := 'PROMO-' || v_group_a || '-' || v_group_b;
      exit when not exists (select 1 from public.vouchers where code = v_code);
      if v_attempts >= 12 then
        return jsonb_build_object('ok', false, 'error', 'code_generation_failed');
      end if;
    end loop;
  end if;

  insert into public.vouchers
    (code, credits_per_period, period_months, total_periods, max_redemptions,
     valid_from, valid_until, status, source, created_by)
  values
    (v_code, p_credits_per_period, v_period_months, p_total_periods, v_max_redemptions,
     now(), v_valid_until, 'active', 'admin', nullif(btrim(coalesce(p_created_by, '')), ''));

  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'credits_per_period', p_credits_per_period,
    'period_months', v_period_months,
    'total_periods', p_total_periods,
    'max_redemptions', v_max_redemptions,
    'valid_until', v_valid_until
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- voucher_list_admin: list all source='admin' vouchers with redemption counts
-- for the operator management view. Returns a jsonb array ordered newest-first.
-- ---------------------------------------------------------------------------
create or replace function public.voucher_list_admin()
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_result jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'code', v.code,
        'credits_per_period', v.credits_per_period,
        'period_months', v.period_months,
        'total_periods', v.total_periods,
        'max_redemptions', v.max_redemptions,
        'redemptions_used', coalesce(r.cnt, 0),
        'valid_from', v.valid_from,
        'valid_until', v.valid_until,
        'status', v.status,
        'created_by', v.created_by,
        'created_at', v.created_at
      )
      order by v.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.vouchers v
  left join (
    select voucher_id, count(*)::int as cnt
    from public.voucher_redemptions
    group by voucher_id
  ) r on r.voucher_id = v.id
  where v.source = 'admin';

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down EXECUTE to service_role only (matches the existing voucher RPCs).
-- ---------------------------------------------------------------------------
revoke all on function public.voucher_create_admin(text, text, integer, integer, integer, integer, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.voucher_list_admin() from public, anon, authenticated;

grant execute on function public.voucher_create_admin(text, text, integer, integer, integer, integer, timestamptz, integer) to service_role;
grant execute on function public.voucher_list_admin() to service_role;
