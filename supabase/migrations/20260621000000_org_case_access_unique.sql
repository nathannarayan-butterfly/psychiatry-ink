-- Unique constraint for per-user case access grants (Small Praxis MVP)
create unique index if not exists org_case_access_user_case_unique
  on public.org_case_access (organisation_id, case_id, user_id)
  where user_id is not null;
