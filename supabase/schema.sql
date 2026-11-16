-- Run once in your own Supabase SQL Editor. Safe to rerun; no learning data is deleted.
begin;
create table if not exists public.qe_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null,
  role text not null check (role in ('learner','teacher')),
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index if not exists qe_one_teacher_per_family on public.qe_members(family_id) where role='teacher';

create table if not exists public.qe_events (
  id uuid primary key,
  seq bigint generated always as identity unique,
  family_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^day-(0[1-9]|1[0-9]|2[0-4])$'),
  kind text not null check (kind in ('answer','complete','review','review_answer','speaking','assignment','feedback')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=16384),
  created_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);
create index if not exists qe_events_family_sequence on public.qe_events(family_id,seq);
create index if not exists qe_members_family on public.qe_members(family_id);

-- Read the current account's membership without recursive RLS policies.
create or replace function public.qe_my_family() returns uuid
language sql stable security definer set search_path = ''
as $$ select family_id from public.qe_members where user_id = (select auth.uid()) $$;
create or replace function public.qe_my_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.qe_members where user_id = (select auth.uid()) $$;
revoke all on function public.qe_my_family() from public;
revoke all on function public.qe_my_role() from public;
grant execute on function public.qe_my_family() to authenticated;
grant execute on function public.qe_my_role() to authenticated;

alter table public.qe_members enable row level security;
alter table public.qe_events enable row level security;
revoke all on public.qe_members, public.qe_events from anon, authenticated;
grant select on public.qe_members to authenticated;
grant select, insert on public.qe_events to authenticated;
grant usage, select on sequence public.qe_events_seq_seq to authenticated;

drop policy if exists qe_read_members on public.qe_members;
create policy qe_read_members on public.qe_members for select to authenticated
using (family_id=(select public.qe_my_family()) and
  ((select public.qe_my_role())='teacher' or user_id=(select auth.uid()) or role='teacher'));
drop policy if exists qe_read_events on public.qe_events;
create policy qe_read_events on public.qe_events for select to authenticated
using (family_id=(select public.qe_my_family()) and
  ((select public.qe_my_role())='teacher' or actor_id=(select auth.uid())
    or (kind in ('assignment','feedback') and payload->>'targetId'=(select auth.uid())::text)));
drop policy if exists qe_write_own_events on public.qe_events;
create policy qe_write_own_events on public.qe_events for insert to authenticated
with check (
  actor_id=(select auth.uid()) and family_id=(select public.qe_my_family())
  and (
    ((select public.qe_my_role())='learner' and kind in ('answer','complete','review','review_answer','speaking'))
    or
    ((select public.qe_my_role())='teacher' and kind in ('assignment','feedback')
      and exists (select 1 from public.qe_members m
        where m.family_id=qe_events.family_id and m.role='learner'
        and m.user_id::text=qe_events.payload->>'targetId'))
  )
);
commit;
