-- Acceptance checks use temporary fixture users without passwords or sessions.
-- The entire transaction is rolled back; no account or learning record remains.
begin;
select set_config('qe.test.teacher',(select user_id::text from public.qe_members where role='teacher' limit 1),true);
select set_config('qe.test.user_a',gen_random_uuid()::text,true);
select set_config('qe.test.user_b',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,created_at,updated_at)
values(current_setting('qe.test.user_a')::uuid,'authenticated','authenticated','acceptance-a-'||gen_random_uuid()::text||'@example.invalid',now(),now()),
      (current_setting('qe.test.user_b')::uuid,'authenticated','authenticated','acceptance-b-'||gen_random_uuid()::text||'@example.invalid',now(),now());

select set_config('request.jwt.claims',json_build_object('sub',current_setting('qe.test.teacher'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('qe.test.invite_a',public.qe_create_invite()->>'code',true);
select set_config('qe.test.invite_b',public.qe_create_invite()->>'code',true);
reset role;

select set_config('request.jwt.claims',json_build_object('sub',current_setting('qe.test.user_a'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  perform public.qe_join_invite(current_setting('qe.test.invite_a'),'Acceptance A');
  perform public.qe_join_invite(current_setting('qe.test.invite_a'),'Acceptance A');
  if public.qe_my_role()<>'learner' then raise exception 'FAIL: enrollment did not create a learner'; end if;
  insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload)
    values(gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-24','answer','{"registration_acceptance":true}');
  begin
    perform public.qe_create_invite();
    raise exception 'FAIL: learner could issue invitations';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims',json_build_object('sub',current_setting('qe.test.user_b'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin
    perform public.qe_join_invite(current_setting('qe.test.invite_a'),'Acceptance B');
    raise exception 'FAIL: a used invitation enrolled another account';
  exception when invalid_parameter_value then null; end;
  perform public.qe_join_invite(current_setting('qe.test.invite_b'),'Acceptance B');
  if exists(select 1 from public.qe_events where payload->>'registration_acceptance'='true') then
    raise exception 'FAIL: learner could see another learner''s answers';
  end if;
  if exists(select 1 from public.qe_members where user_id=current_setting('qe.test.user_a')::uuid) then
    raise exception 'FAIL: learner could see another learner''s profile';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims',json_build_object('sub',current_setting('qe.test.teacher'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if not exists(select 1 from public.qe_events where payload->>'registration_acceptance'='true') then
    raise exception 'FAIL: coach cannot see invited learner progress';
  end if;
end $$;
reset role;
rollback;
select 'PASS: two new learners enrolled; role fixed to learner; single-use invite; idempotent retry; private progress; coach visibility. All fixtures rolled back.' as verification;
