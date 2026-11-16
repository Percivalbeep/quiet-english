begin;
insert into public.qe_profiles(user_id,display_name) select user_id,'Profile test' from public.qe_members where role in ('teacher','learner') on conflict do nothing;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from public.qe_profiles order by user_id limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare affected integer; other_id uuid; begin
 select user_id into other_id from public.qe_members where user_id<>auth.uid() limit 1;
 update public.qe_profiles set display_name='Own profile saved',avatar_data='data:image/jpeg;base64,YQ==' where user_id=auth.uid();
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Own profile update failed';end if;
 if exists(select 1 from public.qe_profiles where user_id<>auth.uid()) then raise exception 'Another profile was visible';end if;
 update public.qe_profiles set display_name='Should be blocked' where user_id<>auth.uid();
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cross-account update allowed';end if;
 begin
 insert into public.qe_profiles(user_id,display_name) values(coalesce(other_id,'00000000-0000-0000-0000-000000000001'::uuid),'Blocked');
 raise exception 'Cross-account insert allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
select 'PASS: own profile saved; other profiles unreadable and unmodifiable; all test changes rolled back' as verification;
