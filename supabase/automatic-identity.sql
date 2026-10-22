-- Automatic identity verification. Run after admin.sql. Disabled until configured.
-- No document images, selfies, templates or provider reports are stored here.
begin;
create schema if not exists account_identity_private;
revoke all on schema account_identity_private from public,anon,authenticated;
grant usage on schema account_identity_private to service_role;
create table if not exists account_identity_private.settings (
  singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into account_identity_private.settings(singleton) values(true) on conflict do nothing;
alter table account_identity_private.settings enable row level security;
revoke all on account_identity_private.settings from public,anon,authenticated;
alter table public.account_verifications add column if not exists verification_method text not null default 'manual';
alter table public.account_verifications alter column legal_name drop not null;
alter table public.account_verifications alter column phone drop not null;
alter table public.account_verifications drop constraint if exists account_verification_manual_contact_required;
alter table public.account_verifications add constraint account_verification_manual_contact_required check(verification_method<>'manual' or (legal_name is not null and phone is not null));
create table if not exists account_identity_private.sessions (
  verification_id uuid primary key references public.account_verifications(id) on delete cascade,
  user_id uuid not null references public.account_profiles(id),
  session_id uuid unique, session_url text, workflow_id text,
  state text not null default 'creating' check(state in ('creating','not_started','in_progress','processing','retry','approved','rejected','cancelled')),
  reason text not null default '', id_status text, liveness_status text, face_status text,
  consent_version text not null, consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(), checked_at timestamptz, last_sync_at timestamptz
);
create index if not exists account_identity_session_owner on account_identity_private.sessions(user_id,created_at desc);
alter table account_identity_private.sessions enable row level security;
revoke all on account_identity_private.sessions from public,anon,authenticated;

create or replace function account_identity_private.guard_verification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.verification_method='didit' and coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception 'AUTOMATIC_VERIFICATION_REQUIRED';
  end if;
  if new.verification_method<>'didit' and (select enabled from account_identity_private.settings where singleton)
     and (tg_op='INSERT' or new.status='approved' and old.status is distinct from new.status) then
    raise exception 'AUTOMATIC_VERIFICATION_REQUIRED';
  end if;
  return new;
end;$$;
revoke all on function account_identity_private.guard_verification() from public,anon,authenticated;
drop trigger if exists account_automatic_identity_guard on public.account_verifications;
create trigger account_automatic_identity_guard before insert or update on public.account_verifications
for each row execute function account_identity_private.guard_verification();

create or replace function account_identity_private.dispatch(
  p_action text,p_user_id uuid default null,p_id uuid default null,p_request_id uuid default null,p_fields jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  s account_identity_private.sessions; v public.account_verifications; profile public.account_profiles;
  ident uuid; enabled boolean; output jsonb; fresh boolean:=false; next_state text; note text;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'SERVICE_REQUIRED'; end if;
  if p_fields is null or jsonb_typeof(p_fields)<>'object' then raise exception 'INVALID_REQUEST'; end if;
  select settings.enabled into enabled from account_identity_private.settings where singleton;
  if p_action='lookup' then
    select * into s from account_identity_private.sessions where session_id=(p_fields->>'session_id')::uuid;
    if not found then return null; end if;
    return jsonb_build_object('id',s.verification_id,'user_id',s.user_id,'session_id',s.session_id,'workflow_id',s.workflow_id,'state',s.state);
  end if;
  select * into profile from public.account_profiles where id=p_user_id for update;
  if not found then raise exception 'AUTH_REQUIRED'; end if;
  if profile.banned then raise exception 'ACCOUNT_BANNED'; end if;
  if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null) then raise exception 'EMAIL_NOT_CONFIRMED'; end if;
  if p_action='config' then return jsonb_build_object('enabled',coalesce(enabled,false),'verified',profile.is_verified); end if;
  if p_action='prepare' then
    if not coalesce(enabled,false) then raise exception 'IDENTITY_NOT_CONFIGURED'; end if;
    if profile.is_verified then raise exception 'ALREADY_VERIFIED'; end if;
    if p_request_id is null or p_fields->>'consent_version' is distinct from 'identity-v1' then raise exception 'INVALID_REQUEST'; end if;
    -- Finish timed-out creation attempts without fabricating a verification decision.
    update public.account_verifications a set status='cancelled'
      where a.user_id=p_user_id and a.status='uploading' and a.verification_method='didit'
      and a.created_at<now()-interval '10 minutes';
    update account_identity_private.sessions b set state='cancelled',reason='creation_timeout'
      where b.user_id=p_user_id and b.state='creating' and b.created_at<now()-interval '10 minutes';
    select * into v from public.account_verifications where user_id=p_user_id and request_id=p_request_id;
    if not found then
      select * into v from public.account_verifications where user_id=p_user_id and status in ('uploading','pending') order by created_at desc limit 1;
      if found and v.verification_method<>'didit' then raise exception 'VERIFICATION_PENDING'; end if;
      if not found then
        if (select count(*) from account_identity_private.sessions where user_id=p_user_id and created_at>now()-interval '1 day')>=3 then raise exception 'REQUEST_LIMIT'; end if;
        ident:=gen_random_uuid();
        insert into public.account_verifications(id,user_id,request_id,store_name,legal_name,phone,document_path,verification_method)
          values(ident,p_user_id,p_request_id,'توثيق الهوية',null,null,p_user_id::text||'/'||ident::text||'.didit','didit') returning * into v;
        insert into account_identity_private.sessions(verification_id,user_id,consent_version) values(ident,p_user_id,'identity-v1');
        fresh:=true;
      end if;
    end if;
    if v.verification_method<>'didit' then raise exception 'INVALID_REQUEST'; end if;
    select * into s from account_identity_private.sessions where verification_id=v.id;
  elsif p_action='latest' then
    select * into s from account_identity_private.sessions where user_id=p_user_id order by created_at desc,verification_id desc limit 1;
    if not found then return jsonb_build_object('verified',profile.is_verified,'record',null); end if;
  else
    select * into s from account_identity_private.sessions where verification_id=p_id and user_id=p_user_id for update;
    if not found then raise exception 'RECORD_NOT_FOUND'; end if;
    if p_action='attach' then
      if s.state<>'creating' then raise exception 'INVALID_REQUEST'; end if;
      if coalesce(p_fields->>'url','')!~'^https://verify\.didit\.me/[A-Za-z0-9_/?=&.-]+$'
        or char_length(p_fields->>'url')>2000 or char_length(coalesce(p_fields->>'workflow_id','')) not between 1 and 150 then raise exception 'INVALID_PROVIDER_RESPONSE'; end if;
      update account_identity_private.sessions set session_id=(p_fields->>'session_id')::uuid,session_url=p_fields->>'url',workflow_id=p_fields->>'workflow_id',state='not_started' where verification_id=p_id returning * into s;
      update public.account_verifications set status='pending' where id=p_id;
    elsif p_action='creation_failed' then
      if s.state='creating' then
        update account_identity_private.sessions set state='cancelled',reason='service_unavailable' where verification_id=p_id returning * into s;
        update public.account_verifications set status='cancelled' where id=p_id;
      end if;
    elsif p_action='claim_sync' then
      if s.last_sync_at>now()-interval '15 seconds' then raise exception 'CHECK_RATE_LIMIT'; end if;
      update account_identity_private.sessions set last_sync_at=clock_timestamp() where verification_id=p_id returning * into s;
    elsif p_action='apply' then
      if p_fields->>'session_id' is distinct from s.session_id::text or p_fields->>'workflow_id' is distinct from s.workflow_id
        or p_fields->>'vendor_data' is distinct from s.verification_id::text then raise exception 'INVALID_PROVIDER_RESPONSE'; end if;
      if not coalesce(enabled,false) then raise exception 'IDENTITY_NOT_CONFIGURED'; end if;
      if s.state not in ('approved','rejected','cancelled') then
        next_state:=p_fields->>'state';
        if next_state not in ('not_started','in_progress','processing','retry','approved','rejected','cancelled') or next_state is null then raise exception 'INVALID_PROVIDER_RESPONSE'; end if;
        if next_state='approved' and (p_fields->>'id_status' is distinct from 'approved'
          or p_fields->>'liveness_status' is distinct from 'approved' or p_fields->>'face_status' is distinct from 'approved') then raise exception 'INCOMPLETE_CHECKS'; end if;
        note:=case next_state when 'approved' then 'تم التوثيق آليًا بعد نجاح فحص الهوية وحيوية الوجه ومطابقة السيلفي.'
          when 'rejected' then case when p_fields->>'reason'='face_mismatch' then 'رُفض الطلب آليًا: لم تتطابق صورة السيلفي مع صورة الهوية.' else 'لم ينجح فحص الهوية أو حيوية الوجه. يمكنك تقديم طلب جديد.' end
          when 'retry' then 'تعذّر إكمال الفحص. أعد التقاط الهوية والسيلفي بوضوح.' when 'cancelled' then 'انتهت جلسة التحقق. ابدأ طلبًا جديدًا.' else 'جارٍ التحقق الآلي من الهوية والسيلفي.' end;
        update account_identity_private.sessions set state=next_state,reason=case when p_fields->>'reason' in ('face_mismatch','verification_failed','capture_retry','incomplete_checks','expired') then p_fields->>'reason' else '' end,
          id_status=left(p_fields->>'id_status',30),liveness_status=left(p_fields->>'liveness_status',30),face_status=left(p_fields->>'face_status',30),checked_at=clock_timestamp() where verification_id=p_id returning * into s;
        update public.account_verifications set status=case next_state when 'approved' then 'approved' when 'rejected' then 'rejected' when 'cancelled' then 'cancelled' else 'pending' end,
          review_note=note,reviewed_by=null,reviewed_at=case when next_state in ('approved','rejected','cancelled') then clock_timestamp() else null end where id=p_id;
        if next_state='approved' then
          update public.account_profiles set is_verified=true,verified_at=clock_timestamp(),role=case when role='buyer' then 'seller' else role end where id=p_user_id;
          update public.account_admin_members set previous_role='seller' where user_id=p_user_id;
        end if;
        if next_state in ('approved','rejected','cancelled') then
          insert into public.account_admin_audit(actor_id,action,target_id,details) values(null,'identity_'||next_state,p_id::text,jsonb_build_object('method','didit'));
          update account_identity_private.sessions set session_url=null where verification_id=p_id returning * into s;
        end if;
      end if;
    else raise exception 'INVALID_REQUEST'; end if;
  end if;
  select * into v from public.account_verifications where id=s.verification_id;
  output:=jsonb_build_object('id',s.verification_id,'state',s.state,'reason',s.reason,'url',s.session_url,'session_id',s.session_id,'workflow_id',s.workflow_id,'store_name',v.store_name,'created_at',v.created_at,'note',v.review_note);
  return jsonb_build_object('verified',profile.is_verified or s.state='approved','create_allowed',fresh,'record',output);
end;$$;
revoke all on function account_identity_private.dispatch(text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function account_identity_private.dispatch(text,uuid,uuid,uuid,jsonb) to service_role;
create or replace function public.account_identity_service(p_action text,p_user_id uuid default null,p_id uuid default null,p_request_id uuid default null,p_fields jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$ select account_identity_private.dispatch(p_action,p_user_id,p_id,p_request_id,p_fields); $$;
revoke all on function public.account_identity_service(text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.account_identity_service(text,uuid,uuid,uuid,jsonb) to service_role;
commit;
