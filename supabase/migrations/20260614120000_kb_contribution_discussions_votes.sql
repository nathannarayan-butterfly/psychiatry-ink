-- KB admin discussions and voting for contribution review workflow

create table if not exists public.kb_contribution_discussions (
  id                  uuid primary key default gen_random_uuid(),
  contribution_id     uuid references public.kb_contributions (id) on delete cascade,
  substance_id        uuid references public.kb_substances (id) on delete cascade,
  author_user_id      text not null,
  author_display_name text,
  body                text not null,
  created_at          timestamptz not null default now(),
  constraint kb_contribution_discussions_target_check check (
    contribution_id is not null or substance_id is not null
  )
);

create index if not exists kb_contribution_discussions_contribution_id_idx
  on public.kb_contribution_discussions (contribution_id, created_at asc);
create index if not exists kb_contribution_discussions_substance_id_idx
  on public.kb_contribution_discussions (substance_id, created_at asc);

create table if not exists public.kb_contribution_votes (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.kb_contributions (id) on delete cascade,
  voter_user_id   text not null,
  vote            text not null check (vote in ('approve', 'reject', 'abstain')),
  created_at      timestamptz not null default now(),
  constraint kb_contribution_votes_unique unique (contribution_id, voter_user_id)
);

create index if not exists kb_contribution_votes_contribution_id_idx
  on public.kb_contribution_votes (contribution_id);

alter table public.kb_contribution_discussions enable row level security;
alter table public.kb_contribution_votes enable row level security;

drop policy if exists kb_contribution_discussions_select_all on public.kb_contribution_discussions;
create policy kb_contribution_discussions_select_all
  on public.kb_contribution_discussions for select to anon, authenticated
  using (true);

drop policy if exists kb_contribution_votes_select_all on public.kb_contribution_votes;
create policy kb_contribution_votes_select_all
  on public.kb_contribution_votes for select to anon, authenticated
  using (true);
