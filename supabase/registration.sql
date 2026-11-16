-- Invite-only learning-space enrollment. Existing users and events are retained.
begin;
-- One coach can support several separately tracked learners in the same family.
drop index if exists public.qe_one_role_per_family;
create unique index if not exists qe_one_teacher_per_family
  on public.qe_members(family_id) where role='teacher';

create table if not exists public.qe_invites (
  token_hash text primary key,
  family_id uuid not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references auth.users(id),
  used_at timestamptz
);
alter table public.qe_invites enable row level security;
revoke all on public.qe_invites from anon,authenticated;

create or replace function public.qe_create_invite() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  member public.qe_members;
  token text := replace(gen_random_uuid()::text,'-','');
  expiry timestamptz := now()+interval '7 days';
begin
  select * into member from public.qe_members where user_id=auth.uid();
  if member.role is distinct from 'teacher' then
    raise exception '只有陪练账号可以生成邀请。' using errcode='42501';
  end if;
  if (select count(*) from public.qe_invites where created_by=auth.uid() and created_at>now()-interval '1 day')>=20 then
    raise exception '今天创建的邀请较多，请明天再试。' using errcode='22023';
  end if;
  insert into public.qe_invites(token_hash,family_id,created_by,expires_at)
    values(encode(sha256(convert_to(token,'UTF8')),'hex'),member.family_id,auth.uid(),expiry);
  return jsonb_build_object('code',token,'expires_at',expiry);
end $$;
revoke all on function public.qe_create_invite() from public,anon,authenticated;
grant execute on function public.qe_create_invite() to authenticated;

create or replace function public.qe_join_invite(invite_code text,learner_name text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  invitation public.qe_invites;
  existing public.qe_members;
  chosen_name text;
begin
  if auth.uid() is null then raise exception '请先登录或注册。' using errcode='42501'; end if;
  if invite_code is null or invite_code !~ '^[a-f0-9]{32}$' then
    raise exception '邀请链接格式不正确，请向陪练获取新的链接。' using errcode='22023';
  end if;
  select * into invitation from public.qe_invites
    where token_hash=encode(sha256(convert_to(invite_code,'UTF8')),'hex') for update;
  if not found then raise exception '邀请不存在，请向陪练获取新的链接。' using errcode='22023'; end if;
  if invitation.used_by is not null and invitation.used_by<>auth.uid() then
    raise exception '此邀请已被使用，请向陪练获取新的链接。' using errcode='22023';
  end if;
  if invitation.expires_at<now() and invitation.used_by is distinct from auth.uid() then
    raise exception '邀请已过期，请向陪练获取新的链接。' using errcode='22023';
  end if;
  select * into existing from public.qe_members where user_id=auth.uid();
  if found then
    if existing.family_id<>invitation.family_id or existing.role<>'learner' then
      raise exception '这个账号已属于另一个身份或学习空间，请使用另一个邮箱。' using errcode='22023';
    end if;
  else
    chosen_name=left(coalesce(nullif(trim(learner_name),''),'学习者'),60);
    insert into public.qe_members(user_id,family_id,role,display_name)
      values(auth.uid(),invitation.family_id,'learner',chosen_name);
  end if;
  update public.qe_invites set used_by=auth.uid(),used_at=coalesce(used_at,now())
    where token_hash=invitation.token_hash;
  return jsonb_build_object('joined',true,'role','learner');
end $$;
revoke all on function public.qe_join_invite(text,text) from public,anon,authenticated;
grant execute on function public.qe_join_invite(text,text) to authenticated;

-- Learners see only their own records plus messages addressed to them.
-- Coaches see each learner in their own family, selectable in the interface.
drop policy if exists qe_read_members on public.qe_members;
create policy qe_read_members on public.qe_members for select to authenticated
using (family_id=(select public.qe_my_family()) and
  ((select public.qe_my_role())='teacher' or user_id=(select auth.uid()) or role='teacher'));
drop policy if exists qe_read_events on public.qe_events;
create policy qe_read_events on public.qe_events for select to authenticated
using (family_id=(select public.qe_my_family()) and
  ((select public.qe_my_role())='teacher' or actor_id=(select auth.uid())
    or (kind in ('assignment','feedback') and payload->>'targetId'=(select auth.uid())::text)));
commit;
