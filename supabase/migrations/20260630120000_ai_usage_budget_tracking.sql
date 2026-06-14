-- AI usage logging, budget configuration, and threshold warnings.
-- No PHI: logs store token counts and feature keys only.

-- ---------------------------------------------------------------------------
-- ai_usage_logs
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage_logs (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  user_id                 text,
  organisation_id         uuid references public.org_organisations (id) on delete set null,
  case_id                 text,
  feature_key             text not null,
  provider                text not null,
  model                   text not null,
  request_kind            text not null default 'chat'
                            check (request_kind in ('chat', 'transcription', 'batch')),
  input_tokens            integer not null default 0,
  cached_input_tokens     integer not null default 0,
  cache_miss_input_tokens integer not null default 0,
  output_tokens           integer not null default 0,
  total_tokens            integer not null default 0,
  audio_minutes           numeric(12, 4),
  estimated_cost_usd      numeric(14, 8),
  estimated_cost_eur      numeric(14, 8),
  currency_rate_used      numeric(10, 6),
  usage_source            text not null default 'estimated_from_chars'
                            check (usage_source in ('provider_reported', 'estimated_from_chars')),
  success                 boolean not null default true,
  error_code              text,
  request_id              text,
  latency_ms              integer,
  raw_usage_json          jsonb,
  metadata_json           jsonb not null default '{}'::jsonb
);

create index if not exists ai_usage_logs_org_created_idx
  on public.ai_usage_logs (organisation_id, created_at desc);

create index if not exists ai_usage_logs_org_feature_idx
  on public.ai_usage_logs (organisation_id, feature_key, created_at desc);

create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc)
  where user_id is not null;

create index if not exists ai_usage_logs_period_idx
  on public.ai_usage_logs (organisation_id, created_at)
  where organisation_id is not null;

comment on table public.ai_usage_logs is
  'Token/cost usage per AI call. Never stores prompts, clinical text, or patient names.';

-- ---------------------------------------------------------------------------
-- ai_budget_configs (one row per organisation)
-- ---------------------------------------------------------------------------

create table if not exists public.ai_budget_configs (
  id                    uuid primary key default gen_random_uuid(),
  organisation_id       uuid not null references public.org_organisations (id) on delete cascade,
  monthly_budget_usd    numeric(12, 2),
  monthly_budget_eur    numeric(12, 2),
  warn_at_50            boolean not null default true,
  warn_at_80            boolean not null default true,
  warn_at_100           boolean not null default true,
  hard_limit_enabled    boolean not null default false,
  hard_limit_usd        numeric(12, 2),
  hard_limit_eur        numeric(12, 2),
  notify_emails         text[],
  updated_at            timestamptz not null default now(),
  updated_by            text,
  constraint ai_budget_configs_org_unique unique (organisation_id)
);

comment on table public.ai_budget_configs is
  'Organisation AI budget settings. hard_limit_enabled defaults false.';

-- ---------------------------------------------------------------------------
-- ai_budget_warnings (threshold events)
-- ---------------------------------------------------------------------------

create table if not exists public.ai_budget_warnings (
  id                  uuid primary key default gen_random_uuid(),
  organisation_id     uuid not null references public.org_organisations (id) on delete cascade,
  created_at          timestamptz not null default now(),
  threshold_percent   integer not null check (threshold_percent in (50, 80, 100)),
  period_start        date not null,
  budget_amount       numeric(12, 2) not null,
  current_usage       numeric(12, 2) not null,
  currency            text not null default 'EUR',
  acknowledged        boolean not null default false
);

create index if not exists ai_budget_warnings_org_period_idx
  on public.ai_budget_warnings (organisation_id, period_start desc, threshold_percent);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ai_usage_logs enable row level security;
alter table public.ai_budget_configs enable row level security;
alter table public.ai_budget_warnings enable row level security;

-- Usage logs: org members can read org logs (server filters by role).
drop policy if exists ai_usage_logs_select_member on public.ai_usage_logs;
create policy ai_usage_logs_select_member
  on public.ai_usage_logs for select to authenticated
  using (public.org_is_member(organisation_id));

-- Budget config: org members can read; writes via service role only.
drop policy if exists ai_budget_configs_select_member on public.ai_budget_configs;
create policy ai_budget_configs_select_member
  on public.ai_budget_configs for select to authenticated
  using (public.org_is_member(organisation_id));

-- Warnings: org members can read.
drop policy if exists ai_budget_warnings_select_member on public.ai_budget_warnings;
create policy ai_budget_warnings_select_member
  on public.ai_budget_warnings for select to authenticated
  using (public.org_is_member(organisation_id));

-- Writes: service role only (Express API). No insert/update/delete for authenticated.
