-- Therapist role + therapy discipline on org members / invitations

-- org_members: widen role check + discipline columns
alter table public.org_members
  drop constraint if exists org_members_role_check;

alter table public.org_members
  add constraint org_members_role_check check (role in (
    'single_owner', 'org_owner', 'org_admin', 'site_admin',
    'department_admin', 'clinical_lead', 'clinician', 'psychologist',
    'nursing', 'social_worker', 'assistant', 'viewer',
    'external_consultant', 'auditor', 'it_admin', 'therapist'
  ));

alter table public.org_members
  add column if not exists therapy_discipline text,
  add column if not exists therapy_discipline_custom text;

alter table public.org_members
  drop constraint if exists org_members_therapy_discipline_check;

alter table public.org_members
  add constraint org_members_therapy_discipline_check check (
    therapy_discipline is null
    or therapy_discipline in (
      'ergotherapy', 'sports_therapy', 'music_therapy', 'art_therapy',
      'physiotherapy', 'occupational_therapy', 'skills_group',
      'group_therapy', 'custom'
    )
  );

-- org_invitations: same role + discipline for pending invites
alter table public.org_invitations
  drop constraint if exists org_invitations_role_check;

alter table public.org_invitations
  add constraint org_invitations_role_check check (role in (
    'single_owner', 'org_owner', 'org_admin', 'site_admin',
    'department_admin', 'clinical_lead', 'clinician', 'psychologist',
    'nursing', 'social_worker', 'assistant', 'viewer',
    'external_consultant', 'auditor', 'it_admin', 'therapist'
  ));

alter table public.org_invitations
  add column if not exists therapy_discipline text,
  add column if not exists therapy_discipline_custom text;
