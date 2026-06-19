-- To-Do / Aufgaben feature
-- Personal + organisation task assignment. Writes go through the Express API
-- (service role); RLS below is defense-in-depth for any direct client reads.
-- Idempotent — safe to re-run.

create table if not exists public.todos (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid references public.org_organisations (id) on delete cascade,
  owner_user_id     text not null,
  text              text not null,
  done              boolean not null default false,
  due_date          date,
  priority          text check (priority in ('low', 'normal', 'high')),
  case_id           text,
  patient_label     text,
  assigned_by       text,
  assigned_to       text,
  assigned_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists todos_owner_user_id_idx
  on public.todos (owner_user_id);
create index if not exists todos_assigned_to_idx
  on public.todos (assigned_to);
create index if not exists todos_org_case_idx
  on public.todos (organisation_id, case_id);
create index if not exists todos_due_date_idx
  on public.todos (due_date);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.todos enable row level security;

-- Owner, assignee, and assigner may read a todo. Org-hierarchy delegation and
-- all mutations are enforced server-side via the service role (Express).
drop policy if exists todos_select_participant on public.todos;
create policy todos_select_participant
  on public.todos for select to authenticated
  using (
    owner_user_id = auth.uid()::text
    or assigned_to = auth.uid()::text
    or assigned_by = auth.uid()::text
  );

-- Writes: service role only (Express enforces ownership + assignment hierarchy).
-- No insert/update/delete policies for authenticated clients.
