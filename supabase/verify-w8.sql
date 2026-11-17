begin;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from public.qe_members where role='learner' order by created_at limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload) values
 (gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-25','answer','{"acceptance_check":true}'),
 (gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-48','answer','{"acceptance_check":true}');
 begin
  insert into public.qe_events(id,family_id,actor_id,lesson_id,kind,payload) values(gen_random_uuid(),public.qe_my_family(),auth.uid(),'day-49','answer','{}');
  raise exception 'Unexpected acceptance of day-49';
 exception when check_violation then null;
 end;
end $$;
rollback;
select 'PASS: authenticated learner can save day-25 and day-48; day-49 rejected; all fixtures rolled back' as verification;
