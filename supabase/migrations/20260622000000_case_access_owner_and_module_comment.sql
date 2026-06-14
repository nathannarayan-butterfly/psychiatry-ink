-- Case sharing hardening: owner flag in JSONB metadata; module overrides deferred.
-- granted_permissions may include: { "level": "full_access", "isOwner": true }

comment on table public.org_module_access is
  'Module-level permission overrides (enterprise). Not used in Small Praxis MVP — case-level org_case_access only.';

comment on column public.org_case_access.granted_permissions is
  'JSONB: { "level": "read_only"|"admin_only"|"clinical_edit"|"full_access"|"no_access", "isOwner": true? }. Legacy levels (none, full, edit_documents) normalized server-side.';
