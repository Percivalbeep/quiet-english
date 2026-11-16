-- First create TWO email/password users in Supabase Authentication > Users.
-- Replace the two UUID placeholders below with their Auth User IDs, not emails.
-- Run only in the SQL Editor; do not put admin keys or passwords in the website.
do $$
declare
  learner uuid := '00000000-0000-0000-0000-000000000001';
  teacher uuid := '00000000-0000-0000-0000-000000000002';
  family uuid := gen_random_uuid();
begin
  if not exists(select 1 from auth.users where id=learner)
     or not exists(select 1 from auth.users where id=teacher) then
    raise exception 'Replace both placeholders with real Authentication user UUIDs first.';
  end if;
  if exists(select 1 from public.qe_members where user_id in(learner,teacher)) then
    raise exception 'Membership already exists. Inspect existing rows before changing a family.';
  end if;
  insert into public.qe_members(user_id,family_id,role,display_name) values
    (learner,family,'learner','学习者'),
    (teacher,family,'teacher','陪练老师');
end $$;
