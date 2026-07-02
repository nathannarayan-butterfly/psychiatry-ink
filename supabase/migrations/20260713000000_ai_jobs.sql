-- Persisted AI generation jobs.
--
-- Every long-running LLM generation (workspace "Zusammenfassen", "Therapie und
-- Verlauf zusammenfassen", long-document pipeline) becomes a row here so the
-- result survives navigation, refresh, logout/login, and leaving the
-- patient-less workspace. The Express API is the sole writer (service role);
-- clients read their own rows through the API (RLS is defense-in-depth for a
-- possible future authenticated read path).
--
-- PHI stance: `input_text` and `result_text` are stored ONLY AFTER the same
-- server-side de-identification floor that gates LLM egress
-- (`applyServerPhiGuard` / `sanitizeText`) has been applied. Patient name, DOB,
-- dates, emails, phone numbers, case codes and insurance numbers are scrubbed
-- before the row is written — the table never stores more than what the LLM
-- provider is allowed to see. Job metadata (`params`, `result_meta`) carries
-- tier/model/word-count telemetry only, never free text.

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- Workspace case id ('__default' for the patient-less workspace) or null.
  -- Case ids are client-generated workspace identifiers, not patient identity.
  case_id text,
  kind text not null check (kind in ('summarize', 'workspace_generate')),
  feature_key text not null default 'document_generation',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  -- Pipeline phase for user-facing step text. Real steps, no fake percentages:
  --   queued → analyzing → summarizing (chunk map) → synthesizing →
  --   compressing (length enforcement) → saving → done
  phase text not null default 'queued',
  -- Real progress units (chunks completed / total). 0/0 = indeterminate.
  progress_current integer not null default 0,
  progress_total integer not null default 0,
  -- Request parameters: tier, mode, lengthMode, targetWords, directions,
  -- language, componentId, tool, sectionLabel. No free clinical text except
  -- the clinician's own instruction strings (scrubbed like prompts).
  params jsonb not null default '{}'::jsonb,
  input_text text not null default '',
  input_chars integer not null default 0,
  result_text text,
  -- Telemetry: models used per stage, word counts, chunk stats, credits,
  -- compression-pass info. For debugging; not exposed verbatim in the UI.
  result_meta jsonb,
  error_code text,
  error_message text,
  attempts integer not null default 0,
  -- Terminal-state acknowledgement for the in-app notification badge.
  seen boolean not null default false,
  -- user_notes id when the result was auto-saved (patient-less workspace).
  saved_note_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists ai_jobs_user_created_idx
  on public.ai_jobs (user_id, created_at desc);
create index if not exists ai_jobs_user_status_idx
  on public.ai_jobs (user_id, status);
-- For the TTL purge below.
create index if not exists ai_jobs_finished_idx
  on public.ai_jobs (finished_at);

drop trigger if exists ai_jobs_set_updated_at on public.ai_jobs;
create trigger ai_jobs_set_updated_at
  before update on public.ai_jobs
  for each row execute function public.psy_set_updated_at();

alter table public.ai_jobs enable row level security;

drop policy if exists ai_jobs_select_owner on public.ai_jobs;
create policy ai_jobs_select_owner
  on public.ai_jobs for select to authenticated
  using (auth.uid()::text = user_id);

-- Writes go through the Express API with the service role key only.

-- ---------------------------------------------------------------------------
-- TTL purge: drop de-identified job text 30 days after the job finished, and
-- clean up jobs stuck non-terminal for 30 days (server crash leftovers).
-- Mirrors dc_purge_abandoned / ks_purge_abandoned semantics.
-- ---------------------------------------------------------------------------
create or replace function public.ai_jobs_purge_expired(p_ttl interval default interval '30 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purged integer := 0;
begin
  -- Finished jobs past TTL: delete the row (result was long since delivered
  -- and, where configured, auto-saved to user_notes).
  delete from public.ai_jobs
  where finished_at is not null
    and finished_at < now() - p_ttl;
  get diagnostics v_purged = row_count;

  -- Never-finished leftovers (crashed before reaching a terminal state).
  delete from public.ai_jobs
  where finished_at is null
    and created_at < now() - p_ttl;

  return v_purged;
end;
$$;

revoke all on function public.ai_jobs_purge_expired(interval) from public, anon, authenticated;

-- Schedule a daily purge via pg_cron (same pattern as the TTL auto-expiry
-- migration; cron.schedule upserts by job name, so re-applying is safe).
create extension if not exists pg_cron;

select cron.schedule(
  'ai-jobs-purge-expired',
  '20 3 * * *',
  $job$select public.ai_jobs_purge_expired();$job$
);
