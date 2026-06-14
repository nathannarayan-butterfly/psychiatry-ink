-- Fix DiscussCase package insert failure: identified + de-identified packages share
-- the same version number (both v1 on create) but the original unique constraint
-- was only on (discussion_id, version), blocking the second insert.

alter table public.dc_discussion_packages
  drop constraint if exists dc_discussion_packages_version_unique;

alter table public.dc_discussion_packages
  add constraint dc_discussion_packages_version_unique
  unique (discussion_id, version, is_deidentified);
