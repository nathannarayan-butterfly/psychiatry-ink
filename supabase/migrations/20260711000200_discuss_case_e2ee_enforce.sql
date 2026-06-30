-- ===========================================================================
-- Design D — DiscussCase identified packages must be E2EE ciphertext.
--
-- STATUS: AUTHORED, NOT YET APPLIED TO PRODUCTION. Additive only.
--
-- The `dc_discussion_packages.content` jsonb column already accepts both
-- plaintext `DiscussPackageContent` and `EncryptedEnvelope`. Existing rows
-- that pre-date the E2EE rollout may legitimately be plaintext; we therefore
-- enforce the invariant only on NEW inserts (and on updates that touch the
-- content column) via a non-validated CHECK constraint.
--
-- The check is a JSON shape probe: identified packages (is_deidentified=false)
-- must carry an `enc` discriminator that matches the EncryptedEnvelope shape
-- (`src/utils/e2ee.ts`). De-identified packages stay plaintext by design — the
-- server's AI pipeline relies on reading them server-side.
-- ===========================================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dc_discussion_packages_identified_e2ee'
  ) then
    alter table public.dc_discussion_packages
      add constraint dc_discussion_packages_identified_e2ee
        check (
          is_deidentified = true
          or (content ? 'enc' and (content ->> 'enc') = 'aes-gcm-256-v1')
        )
        not valid;
  end if;
end
$$;

comment on constraint dc_discussion_packages_identified_e2ee
  on public.dc_discussion_packages is
  'Identified (is_deidentified=false) packages must be E2EE EncryptedEnvelope JSON. '
  'De-identified packages stay plaintext for server-side AI use.';
