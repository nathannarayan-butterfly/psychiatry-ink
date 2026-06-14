-- Konsil / External Consultant Mode
-- Formal consultation request + structured report return (separate from DiscussCase).
-- Tables prefixed ks_ to avoid collisions.

create table if not exists public.ks_consultation_requests (
  id                      uuid primary key default gen_random_uuid(),
  case_id                 text not null,
  clinician_user_id       text not null,
  specialty               text not null,
  consultant_user_id      text,
  consultant_email        text,
  consultant_username     text,
  access_type             text not null
                            check (access_type in ('internal_consultant', 'external_consultant', 'one_time_external')),
  urgency                 text not null default 'routine'
                            check (urgency in ('routine', 'urgent', 'emergency')),
  title                   text not null,
  clinical_question       text not null,
  kurzanamnese            text not null default '',
  examination_requested     boolean not null default false,
  deadline                timestamptz,
  legal_consent_note      text,
  patient_identifier_mode text not null default 'deidentified'
                            check (patient_identifier_mode in ('full', 'pseudonymized', 'deidentified')),
  status                  text not null default 'draft'
                            check (status in (
                              'draft', 'sent', 'viewed', 'in_progress', 'more_info_requested',
                              'submitted', 'cancelled', 'archived'
                            )),
  expires_at              timestamptz,
  revoked_at              timestamptz,
  reviewed_at             timestamptz,
  reviewed_by             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists ks_consultation_requests_case_id_idx
  on public.ks_consultation_requests (case_id, updated_at desc);
create index if not exists ks_consultation_requests_clinician_idx
  on public.ks_consultation_requests (clinician_user_id);
create index if not exists ks_consultation_requests_consultant_idx
  on public.ks_consultation_requests (consultant_user_id)
  where consultant_user_id is not null;
create index if not exists ks_consultation_requests_status_idx
  on public.ks_consultation_requests (status, updated_at desc);

create table if not exists public.ks_shared_items (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.ks_consultation_requests (id) on delete cascade,
  item_type       text not null
                    check (item_type in ('section', 'attachment', 'befunde', 'custom_text')),
  item_key        text not null,
  label           text not null,
  content         text not null default '',
  metadata        jsonb not null default '{}'::jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists ks_shared_items_request_id_idx
  on public.ks_shared_items (request_id, sort_order asc);

create table if not exists public.ks_reports (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null unique references public.ks_consultation_requests (id) on delete cascade,
  status            text not null default 'draft'
                      check (status in ('draft', 'submitted', 'withdrawn')),
  patient_examined  text not null default 'not_applicable'
                      check (patient_examined in ('yes', 'no', 'not_applicable')),
  findings          text not null default '',
  assessment        text not null default '',
  recommendations     text not null default '',
  limitations       text not null default '',
  follow_up           text not null default '',
  submitted_at      timestamptz,
  submitted_by      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists ks_reports_request_id_idx
  on public.ks_reports (request_id);

create table if not exists public.ks_messages (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.ks_consultation_requests (id) on delete cascade,
  author_user_id  text not null,
  message_type    text not null
                    check (message_type in ('message', 'request_more_information', 'clinician_response')),
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists ks_messages_request_id_idx
  on public.ks_messages (request_id, created_at asc);

create table if not exists public.ks_invites (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references public.ks_consultation_requests (id) on delete cascade,
  invited_by        text not null,
  invitee_email     text not null,
  token_hash        text not null,
  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at        timestamptz,
  revoked_at        timestamptz,
  accepted_at       timestamptz,
  accepted_user_id  text,
  created_at        timestamptz not null default now()
);

create index if not exists ks_invites_request_id_idx
  on public.ks_invites (request_id);
create unique index if not exists ks_invites_token_hash_idx
  on public.ks_invites (token_hash);

create table if not exists public.ks_participants (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.ks_consultation_requests (id) on delete cascade,
  user_id         text not null,
  role            text not null
                    check (role in ('clinician', 'internal_consultant', 'external_consultant', 'one_time_external_consultant')),
  invite_id       uuid references public.ks_invites (id) on delete set null,
  joined_at       timestamptz not null default now(),
  constraint ks_participants_unique unique (request_id, user_id)
);

create index if not exists ks_participants_user_id_idx
  on public.ks_participants (user_id);
create index if not exists ks_participants_request_id_idx
  on public.ks_participants (request_id);

create table if not exists public.ks_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.ks_consultation_requests (id) on delete cascade,
  actor_user_id   text,
  action          text not null
                    check (action in (
                      'created', 'sent', 'opened', 'attachment_viewed', 'report_saved',
                      'report_submitted', 'more_info_requested', 'access_revoked', 'archived'
                    )),
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists ks_audit_logs_request_id_idx
  on public.ks_audit_logs (request_id, created_at desc);

-- RLS: service-role writes via Express; authenticated reads scoped to participants.
alter table public.ks_consultation_requests enable row level security;
alter table public.ks_shared_items enable row level security;
alter table public.ks_reports enable row level security;
alter table public.ks_messages enable row level security;
alter table public.ks_invites enable row level security;
alter table public.ks_participants enable row level security;
alter table public.ks_audit_logs enable row level security;

create or replace function public.ks_is_participant(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ks_participants p
    where p.request_id = p_request_id
      and p.user_id = auth.uid()::text
  );
$$;

drop policy if exists ks_requests_select_participant on public.ks_consultation_requests;
create policy ks_requests_select_participant
  on public.ks_consultation_requests for select to authenticated
  using (
    public.ks_is_participant(id)
    or clinician_user_id = auth.uid()::text
  );

drop policy if exists ks_shared_items_select_participant on public.ks_shared_items;
create policy ks_shared_items_select_participant
  on public.ks_shared_items for select to authenticated
  using (public.ks_is_participant(request_id));

drop policy if exists ks_reports_select_participant on public.ks_reports;
create policy ks_reports_select_participant
  on public.ks_reports for select to authenticated
  using (public.ks_is_participant(request_id));

drop policy if exists ks_messages_select_participant on public.ks_messages;
create policy ks_messages_select_participant
  on public.ks_messages for select to authenticated
  using (public.ks_is_participant(request_id));

drop policy if exists ks_participants_select_member on public.ks_participants;
create policy ks_participants_select_member
  on public.ks_participants for select to authenticated
  using (public.ks_is_participant(request_id));

drop policy if exists ks_audit_logs_select_clinician on public.ks_audit_logs;
create policy ks_audit_logs_select_clinician
  on public.ks_audit_logs for select to authenticated
  using (
    exists (
      select 1 from public.ks_participants p
      where p.request_id = ks_audit_logs.request_id
        and p.user_id = auth.uid()::text
        and p.role = 'clinician'
    )
  );

drop policy if exists ks_invites_deny_all on public.ks_invites;
create policy ks_invites_deny_all
  on public.ks_invites for select to authenticated
  using (false);
