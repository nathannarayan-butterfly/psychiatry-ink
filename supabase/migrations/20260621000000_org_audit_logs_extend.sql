-- Extend org_audit_logs for foundational audit logging (Step 1b)

alter table public.org_audit_logs
  add column if not exists case_id text,
  add column if not exists document_id text,
  add column if not exists ip text,
  add column if not exists user_agent text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'org_audit_logs'
      and column_name = 'actor_user_id'
  ) then
    alter table public.org_audit_logs rename column actor_user_id to user_id;
  end if;
end $$;

alter table public.org_audit_logs drop column if exists resource_type;
alter table public.org_audit_logs drop column if exists resource_id;

create index if not exists org_audit_logs_action_idx
  on public.org_audit_logs (organisation_id, action, created_at desc);

create index if not exists org_audit_logs_case_id_idx
  on public.org_audit_logs (organisation_id, case_id, created_at desc)
  where case_id is not null;
