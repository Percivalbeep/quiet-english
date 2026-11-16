begin;
create table if not exists public.qe_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 60),
 avatar_data text not null default '' check(avatar_data='' or (char_length(avatar_data)<=90000 and avatar_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))
);
alter table public.qe_profiles enable row level security;
revoke all on public.qe_profiles from anon, authenticated;
grant select,insert,update on public.qe_profiles to authenticated;
drop policy if exists qe_profile_read_self on public.qe_profiles;
create policy qe_profile_read_self on public.qe_profiles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists qe_profile_insert_self on public.qe_profiles;
create policy qe_profile_insert_self on public.qe_profiles for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.qe_members where user_id=(select auth.uid())));
drop policy if exists qe_profile_update_self on public.qe_profiles;
create policy qe_profile_update_self on public.qe_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
commit;
