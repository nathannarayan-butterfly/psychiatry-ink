-- Demo patient canonical: split the single-row fixture into per-locale rows.
--
-- The v8 locale split publishes two canonical fixtures, keyed `canonical-en` and
-- `canonical-de`. The original `demo_patient_canonical_singleton` check only
-- allowed `id = 'canonical'`, so the locale publish failed with 23514. This
-- migration replaces that check with one that allows exactly the two locale ids
-- (still rejecting arbitrary ids), migrates any legacy `canonical` row to its
-- locale-specific id, and preserves the existing RLS setup.
--
-- Columns are unchanged and match what scripts/publish-demo-patient-canonical.ts
-- writes: id, seed_version, fixture, published_by, published_by_email, published_at.

-- 1. Drop the legacy single-row check so per-locale ids can exist.
alter table public.demo_patient_canonical
  drop constraint if exists demo_patient_canonical_singleton;

-- The old default ('canonical') would insert an id that the new check rejects;
-- the publish path always supplies an explicit id, so drop the default.
alter table public.demo_patient_canonical
  alter column id drop default;

-- 2. Migrate any legacy `canonical` row to its locale-specific id, preserving
--    its data. Locale is derived from the stored fixture (defaults to 'en'). If
--    the locale row already exists, the legacy row is removed instead.
do $$
declare
  legacy_locale text;
  target_id text;
begin
  if exists (select 1 from public.demo_patient_canonical where id = 'canonical') then
    select case
             when (fixture->>'demoLocale') in ('en', 'de') then fixture->>'demoLocale'
             else 'en'
           end
      into legacy_locale
      from public.demo_patient_canonical
      where id = 'canonical';

    target_id := 'canonical-' || legacy_locale;

    if exists (select 1 from public.demo_patient_canonical where id = target_id) then
      delete from public.demo_patient_canonical where id = 'canonical';
    else
      update public.demo_patient_canonical set id = target_id where id = 'canonical';
    end if;
  end if;
end $$;

-- 3. Re-add the check, now scoped to the allowed per-locale ids.
alter table public.demo_patient_canonical
  add constraint demo_patient_canonical_singleton
  check (id in ('canonical-en', 'canonical-de'));

-- 4. Preserve RLS: keep row level security on and re-assert the authenticated
--    read policy (idempotent). Writes still go through the service role only.
alter table public.demo_patient_canonical enable row level security;

drop policy if exists demo_patient_canonical_select_authenticated on public.demo_patient_canonical;
create policy demo_patient_canonical_select_authenticated
  on public.demo_patient_canonical for select to authenticated
  using (true);
