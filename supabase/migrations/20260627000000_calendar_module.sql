-- Calendar module — Small Praxis uses these tables via /api/calendar (encrypted_payload).
-- single_use tier stores items in browser localStorage only (see src/utils/calendarStore.ts).

create table if not exists public.cal_calendar_items (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.org_organisations (id) on delete cascade,
  type              text not null
                      check (type in (
                        'consultation', 'follow_up', 'lab_test', 'phone_call', 'video_call',
                        'medication_review', 'document_task', 'external_consultation', 'other'
                      )),
  title             text not null,
  patient_id        text,
  case_id           text,
  start_time        timestamptz not null,
  end_time          timestamptz not null,
  status            text not null default 'scheduled'
                      check (status in (
                        'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
                      )),
  priority          text check (priority in ('low', 'normal', 'high')),
  assigned_user_id  text,
  location          text,
  notes             text,
  reason            text,
  created_by        text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  audit_metadata    jsonb not null default '{"rescheduleHistory":[]}'::jsonb
);

create index if not exists cal_calendar_items_org_start_idx
  on public.cal_calendar_items (organisation_id, start_time);

create index if not exists cal_calendar_items_org_assigned_idx
  on public.cal_calendar_items (organisation_id, assigned_user_id, start_time);

create index if not exists cal_calendar_items_org_case_idx
  on public.cal_calendar_items (organisation_id, case_id)
  where case_id is not null;

create table if not exists public.cal_reschedule_log (
  id                uuid primary key default gen_random_uuid(),
  calendar_item_id  uuid not null references public.cal_calendar_items (id) on delete cascade,
  previous_start    timestamptz not null,
  previous_end      timestamptz not null,
  new_start         timestamptz not null,
  new_end           timestamptz not null,
  user_id           text not null,
  reason            text,
  created_at        timestamptz not null default now()
);

create index if not exists cal_reschedule_log_item_idx
  on public.cal_reschedule_log (calendar_item_id, created_at desc);

alter table public.cal_calendar_items enable row level security;
alter table public.cal_reschedule_log enable row level security;

-- Members may read org calendar metadata; writes via service role API only.
drop policy if exists cal_calendar_items_select_member on public.cal_calendar_items;
create policy cal_calendar_items_select_member
  on public.cal_calendar_items for select to authenticated
  using (public.org_is_member(organisation_id));

drop policy if exists cal_reschedule_log_select_member on public.cal_reschedule_log;
create policy cal_reschedule_log_select_member
  on public.cal_reschedule_log for select to authenticated
  using (
    exists (
      select 1 from public.cal_calendar_items c
      where c.id = calendar_item_id and public.org_is_member(c.organisation_id)
    )
  );
