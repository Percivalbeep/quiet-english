-- Run after member initialization in the SQL Editor.
-- All test writes are rolled back; no learning records are retained.
begin;
select set_config('request.jwt.claims',json_build_object('sub',
  (select user_id from public.qe_members where role='learner' limit 1),
  'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if public.qe_my_role() is distinct from 'learner' then
    raise exception 'Learner membership is missing';
  end if;
  insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload)
  values(gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-24','answer','{"acceptance_check":true}');
  begin
    insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload)
    values(gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-24','feedback',
      jsonb_build_object('targetId',auth.uid()::text,'text','permission check'));
    raise exception 'FAIL: learner could create teacher feedback';
  exception when insufficient_privilege then null; end;
  if has_table_privilege(current_user,'public.qe_events','UPDATE')
     or has_table_privilege(current_user,'public.qe_events','DELETE') then
    raise exception 'FAIL: events are mutable';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',
  (select user_id from public.qe_members where role='teacher' limit 1),
  'role','authenticated')::text,true);
set local role authenticated;
do $$ declare learner uuid; begin
  if public.qe_my_role() is distinct from 'teacher' then
    raise exception 'Teacher membership is missing';
  end if;
  select user_id into learner from public.qe_members where role='learner';
  if not exists(select 1 from public.qe_events where payload->>'acceptance_check'='true') then
    raise exception 'FAIL: teacher cannot see learner progress';
  end if;
  insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload)
  values(gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-24','feedback',
    jsonb_build_object('targetId',learner::text,'text','permission check'));
  begin
    insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload)
    values(gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-24','answer','{}');
    raise exception 'FAIL: teacher could submit learner answers';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload)
    values(gen_random_uuid(),gen_random_uuid(),auth.uid(),'day-24','feedback',
      jsonb_build_object('targetId',learner::text,'text','permission check'));
    raise exception 'FAIL: teacher could write to another family';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: learner write, teacher read and feedback, role separation, family isolation, immutable events. Test writes rolled back.' as verification;
