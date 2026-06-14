-- Member settings: permission overrides + AI usage quota (Small Praxis)
alter table public.org_members
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.org_members.settings is
  'Member-specific settings: permissionOverrides {grant,revoke}, aiQuotaMonthly, aiQuotaUsed, aiQuotaPeriodStart';
