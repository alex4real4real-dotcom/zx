-- Account administration. Preserves existing accounts, orders and support history.
-- Payments and credit-review records remain test-only.
begin;
create schema if not exists account_admin_private;
revoke all on schema account_admin_private from public,anon,authenticated;
grant usage on schema account_admin_private to authenticated;
alter table public.account_profiles add column if not exists is_verified boolean not null default false;
alter table public.account_profiles add column if not exists verified_at timestamptz;
alter table public.account_products add column if not exists seller_id uuid references public.account_profiles(id);
alter table public.account_products add column if not exists ban_hidden boolean not null default false;
create index if not exists account_products_seller on public.account_products(seller_id);
alter table public.account_order_items add column if not exists seller_id uuid references public.account_profiles(id);
create index if not exists account_order_items_seller on public.account_order_items(seller_id);

create table if not exists public.account_admin_members (
  user_id uuid primary key references public.account_profiles(id) on delete cascade,
  display_name text not null check(char_length(display_name)<=120),
  previous_role text not null default 'buyer' check(previous_role in ('buyer','seller')),
  is_owner boolean not null default false,
  created_by uuid references public.account_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists account_admin_single_owner on public.account_admin_members(is_owner) where is_owner;
create index if not exists account_admin_created_by on public.account_admin_members(created_by);
create table if not exists public.account_admin_audit (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.account_profiles(id) on delete set null,
  action text not null, target_id text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists account_admin_audit_actor on public.account_admin_audit(actor_id,created_at desc);
create table if not exists public.account_verifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.account_profiles(id),
  request_id uuid not null, store_name text not null check(char_length(store_name) between 2 and 120),
  legal_name text not null check(char_length(legal_name) between 2 and 120),
  phone text not null check(char_length(phone) between 8 and 40), document_path text not null unique,
  status text not null default 'uploading' check(status in ('uploading','pending','approved','rejected','cancelled')),
  review_note text not null default '', reviewed_by uuid references public.account_profiles(id),
  created_at timestamptz not null default now(), reviewed_at timestamptz,
  unique(user_id,request_id)
);
create unique index if not exists account_verification_active on public.account_verifications(user_id) where status in ('uploading','pending');
create index if not exists account_verification_status_created on public.account_verifications(status,created_at desc);
create index if not exists account_verification_reviewer on public.account_verifications(reviewed_by);
create table if not exists public.account_disputes (
  id uuid primary key default gen_random_uuid(), case_number bigint generated always as identity unique,
  order_item_id uuid not null unique references public.account_order_items(id),
  buyer_id uuid not null references public.account_profiles(id), seller_id uuid references public.account_profiles(id),
  request_id uuid not null, product_title text not null,
  reason text not null check(char_length(reason) between 5 and 2000),
  status text not null default 'open' check(status in ('open','resolved_buyer','resolved_seller','closed')),
  decision_note text not null default '', decided_by uuid references public.account_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), decided_at timestamptz,
  unique(buyer_id,request_id)
);
create index if not exists account_dispute_buyer on public.account_disputes(buyer_id,updated_at desc);
create index if not exists account_dispute_seller on public.account_disputes(seller_id,updated_at desc);
create index if not exists account_dispute_status on public.account_disputes(status,updated_at desc);
create index if not exists account_dispute_decider on public.account_disputes(decided_by);
create table if not exists public.account_dispute_replies (
  id uuid primary key default gen_random_uuid(), dispute_id uuid not null references public.account_disputes(id) on delete cascade,
  sender_id uuid references public.account_profiles(id) on delete set null, request_id uuid not null,
  sender_role text not null check(sender_role in ('buyer','seller','admin')), sender_name text not null,
  body text not null check(char_length(body) between 1 and 5000),
  event_status text check(event_status in ('open','resolved_buyer','resolved_seller','closed')),
  created_at timestamptz not null default now(), unique(dispute_id,sender_id,request_id)
);
create index if not exists account_dispute_reply_thread on public.account_dispute_replies(dispute_id,created_at,id);
create index if not exists account_dispute_reply_sender on public.account_dispute_replies(sender_id,created_at desc);
create table if not exists public.account_topup_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.account_profiles(id), request_id uuid not null,
  amount numeric(12,2) not null check(amount>0 and amount<=10000), note text not null default '' check(char_length(note)<=1000),
  payment_mode text not null default 'test' check(payment_mode='test'),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by uuid references public.account_profiles(id),review_note text not null default '',
  created_at timestamptz not null default now(),reviewed_at timestamptz,unique(user_id,request_id)
);
create index if not exists account_topup_user_created on public.account_topup_requests(user_id,created_at desc);
create index if not exists account_topup_status on public.account_topup_requests(status,created_at desc);
create index if not exists account_topup_reviewer on public.account_topup_requests(reviewed_by);

create or replace function account_admin_private.require_user()
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); blocked boolean;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select banned into blocked from public.account_profiles where id=uid for update;
  if not found then raise exception 'PROFILE_NOT_READY'; end if;
  if blocked then raise exception 'ACCOUNT_BANNED'; end if;
  return uid;
end;$$;
create or replace function account_admin_private.require_admin(p_write boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
  if p_write then perform pg_advisory_xact_lock(hashtextextended('account-admin-control',0)); end if;
  if uid is null or not public.account_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return uid;
end;$$;
create or replace function account_admin_private.participant(p_buyer uuid,p_seller uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.account_profiles where id=(select auth.uid()) and not banned
    and (id=p_buyer or id=p_seller or role='admin'));
$$;
revoke all on all functions in schema account_admin_private from public,anon,authenticated;
grant execute on function account_admin_private.participant(uuid,uuid) to authenticated;

alter table public.account_admin_members enable row level security;
alter table public.account_admin_audit enable row level security;
alter table public.account_verifications enable row level security;
alter table public.account_disputes enable row level security;
alter table public.account_dispute_replies enable row level security;
alter table public.account_topup_requests enable row level security;
revoke all on public.account_admin_members,public.account_admin_audit,public.account_verifications,public.account_disputes,
  public.account_dispute_replies,public.account_topup_requests from public,anon,authenticated;
grant select on public.account_admin_members,public.account_admin_audit,public.account_verifications,public.account_disputes,
  public.account_dispute_replies,public.account_topup_requests to authenticated;
drop policy if exists account_admin_members_read on public.account_admin_members;
create policy account_admin_members_read on public.account_admin_members for select to authenticated using((select public.account_is_admin()));
drop policy if exists account_admin_audit_read on public.account_admin_audit;
create policy account_admin_audit_read on public.account_admin_audit for select to authenticated using((select public.account_is_admin()));
drop policy if exists account_verification_read on public.account_verifications;
create policy account_verification_read on public.account_verifications for select to authenticated
  using(account_admin_private.participant(user_id,null));
drop policy if exists account_dispute_read on public.account_disputes;
create policy account_dispute_read on public.account_disputes for select to authenticated
  using(account_admin_private.participant(buyer_id,seller_id));
drop policy if exists account_dispute_replies_read on public.account_dispute_replies;
create policy account_dispute_replies_read on public.account_dispute_replies for select to authenticated
  using(exists(select 1 from public.account_disputes d where d.id=dispute_id and account_admin_private.participant(d.buyer_id,d.seller_id)));
drop policy if exists account_topup_read on public.account_topup_requests;
create policy account_topup_read on public.account_topup_requests for select to authenticated
  using(account_admin_private.participant(user_id,null));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('account-verification','account-verification',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists account_verification_document_read on storage.objects;
create policy account_verification_document_read on storage.objects for select to authenticated using(
  bucket_id='account-verification' and exists(select 1 from public.account_verifications v where v.document_path=name
  and account_admin_private.participant(v.user_id,null)));
drop policy if exists account_verification_document_upload on storage.objects;
create policy account_verification_document_upload on storage.objects for insert to authenticated with check(
  bucket_id='account-verification' and exists(select 1 from public.account_verifications v where v.document_path=name
    and v.user_id=(select auth.uid()) and v.status='uploading' and v.created_at>now()-interval '15 minutes'
    and account_admin_private.participant(v.user_id,null)));

create or replace function public.account_admin_membership(p_email text,p_name text default '',p_remove boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; target public.account_profiles; member public.account_admin_members;
begin
  actor:=account_admin_private.require_admin(true);
  select * into target from public.account_profiles where lower(email)=lower(btrim(p_email)) for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  if char_length(coalesce(p_name,''))>120 then raise exception 'INVALID_NAME'; end if;
  select * into member from public.account_admin_members where user_id=target.id;
  if p_remove then
    if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
    if member.is_owner then raise exception 'OWNER_PROTECTED'; end if;
    if target.id=actor then raise exception 'SELF_PROTECTED'; end if;
    update public.account_profiles set role=member.previous_role where id=target.id;
    delete from public.account_admin_members where user_id=target.id;
  else
    if target.banned then raise exception 'ACCOUNT_BANNED'; end if;
    if target.role='admin' then return jsonb_build_object('success',true); end if;
    insert into public.account_admin_members(user_id,display_name,previous_role,created_by)
      values(target.id,coalesce(nullif(btrim(p_name),''),nullif(target.display_name,''),target.email),target.role,actor);
    update public.account_profiles set role='admin' where id=target.id;
  end if;
  insert into public.account_admin_audit(actor_id,action,target_id) values(actor,case when p_remove then 'admin_removed' else 'admin_added' end,target.id::text);
  return jsonb_build_object('success',true);
end;$$;

create or replace function public.account_admin_ban(p_user_id uuid,p_banned boolean,p_reason text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; target public.account_profiles;
begin
  actor:=account_admin_private.require_admin(true);
  select * into target from public.account_profiles where id=p_user_id for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  if p_banned is null or char_length(coalesce(p_reason,''))>1000 then raise exception 'INVALID_REQUEST'; end if;
  if p_banned then
    if p_user_id=actor then raise exception 'SELF_PROTECTED'; end if;
    if exists(select 1 from public.account_admin_members where user_id=p_user_id and is_owner) then raise exception 'OWNER_PROTECTED'; end if;
    if char_length(btrim(coalesce(p_reason,'')))<3 then raise exception 'REASON_REQUIRED'; end if;
  end if;
  if target.banned is distinct from p_banned then
    update public.account_profiles set banned=p_banned,ban_reason=case when p_banned then btrim(p_reason) else '' end where id=p_user_id;
    if p_banned then
      update public.account_products set active=false,ban_hidden=true where seller_id=p_user_id and active;
    else
      update public.account_products set active=true,ban_hidden=false where seller_id=p_user_id and ban_hidden;
    end if;
    insert into public.account_admin_audit(actor_id,action,target_id,details)
      values(actor,case when p_banned then 'account_banned' else 'account_unbanned' end,p_user_id::text,jsonb_build_object('reason',case when p_banned then btrim(p_reason) else '' end));
  end if;
  return jsonb_build_object('success',true);
end;$$;

create or replace function public.account_verification_prepare(p_request_id uuid,p_store_name text,p_legal_name text,p_phone text,p_file_type text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; record public.account_verifications; ident uuid:=gen_random_uuid(); ext text;
begin
  uid:=account_admin_private.require_user();
  select * into record from public.account_verifications where user_id=uid and request_id=p_request_id;
  if found then return to_jsonb(record); end if;
  if p_request_id is null or char_length(btrim(coalesce(p_store_name,''))) not between 2 and 120
    or char_length(btrim(coalesce(p_legal_name,''))) not between 2 and 120
    or btrim(coalesce(p_phone,''))!~'^\+?[0-9]{8,15}$' then raise exception 'INVALID_VERIFICATION'; end if;
  ext:=case p_file_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'application/pdf' then 'pdf' end;
  if ext is null then raise exception 'INVALID_DOCUMENT'; end if;
  if exists(select 1 from public.account_profiles where id=uid and is_verified) then raise exception 'ALREADY_VERIFIED'; end if;
  update public.account_verifications set status='cancelled' where user_id=uid and status='uploading' and created_at<now()-interval '15 minutes';
  if exists(select 1 from public.account_verifications where user_id=uid and status in ('uploading','pending')) then raise exception 'VERIFICATION_PENDING'; end if;
  if (select count(*) from public.account_verifications where user_id=uid and created_at>now()-interval '1 day')>=3 then raise exception 'REQUEST_LIMIT'; end if;
  insert into public.account_verifications(id,user_id,request_id,store_name,legal_name,phone,document_path)
    values(ident,uid,p_request_id,btrim(p_store_name),btrim(p_legal_name),btrim(p_phone),uid::text||'/'||ident::text||'.'||ext) returning * into record;
  return to_jsonb(record);
end;$$;
create or replace function public.account_verification_submit(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; record public.account_verifications;
begin
  uid:=account_admin_private.require_user();
  select * into record from public.account_verifications where id=p_id and user_id=uid for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if record.status in ('pending','approved','rejected') then return to_jsonb(record); end if;
  if record.status<>'uploading' then raise exception 'INVALID_REQUEST'; end if;
  if not exists(select 1 from storage.objects where bucket_id='account-verification' and name=record.document_path) then raise exception 'DOCUMENT_REQUIRED'; end if;
  update public.account_verifications set status='pending' where id=p_id returning * into record;
  return to_jsonb(record);
end;$$;
create or replace function public.account_admin_verify(p_id uuid,p_approve boolean,p_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; record public.account_verifications;
begin
  actor:=account_admin_private.require_admin(true);
  select * into record from public.account_verifications where id=p_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if p_approve is null or char_length(coalesce(p_note,''))>1000 then raise exception 'INVALID_REQUEST'; end if;
  if record.status=(case when p_approve then 'approved' else 'rejected' end) then return jsonb_build_object('success',true); end if;
  if record.status<>'pending' then raise exception 'ALREADY_REVIEWED'; end if;
  if not p_approve and char_length(btrim(coalesce(p_note,'')))<3 then raise exception 'REASON_REQUIRED'; end if;
  if p_approve then
    if not exists(select 1 from storage.objects where bucket_id='account-verification' and name=record.document_path) then raise exception 'DOCUMENT_REQUIRED'; end if;
    if exists(select 1 from public.account_profiles where id=record.user_id and banned) then raise exception 'ACCOUNT_BANNED'; end if;
    update public.account_profiles set is_verified=true,verified_at=clock_timestamp(),role=case when role='buyer' then 'seller' else role end where id=record.user_id;
    update public.account_admin_members set previous_role='seller' where user_id=record.user_id;
  end if;
  update public.account_verifications set status=case when p_approve then 'approved' else 'rejected' end,
    review_note=btrim(coalesce(p_note,'')),reviewed_by=actor,reviewed_at=clock_timestamp() where id=p_id;
  insert into public.account_admin_audit(actor_id,action,target_id) values(actor,case when p_approve then 'verification_approved' else 'verification_rejected' end,p_id::text);
  return jsonb_build_object('success',true);
end;$$;

create or replace function account_admin_private.snapshot_seller()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  select seller_id into new.seller_id from public.account_products where id=new.product_id;
  return new;
end;$$;
revoke all on function account_admin_private.snapshot_seller() from public,anon,authenticated;
drop trigger if exists account_order_seller_snapshot on public.account_order_items;
create trigger account_order_seller_snapshot before insert on public.account_order_items for each row execute function account_admin_private.snapshot_seller();

create or replace function public.account_dispute_open(p_item_id uuid,p_request_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; item public.account_order_items; ident uuid; stamp timestamptz:=clock_timestamp(); label text;
begin
  uid:=account_admin_private.require_user();
  select id into ident from public.account_disputes where buyer_id=uid and request_id=p_request_id;
  if found then return jsonb_build_object('id',ident); end if;
  if p_request_id is null or char_length(btrim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'INVALID_DISPUTE'; end if;
  select i.* into item from public.account_order_items i join public.account_orders o on o.id=i.order_id where i.id=p_item_id and o.user_id=uid;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if exists(select 1 from public.account_disputes where order_item_id=p_item_id) then raise exception 'DISPUTE_EXISTS'; end if;
  if (select count(*) from public.account_disputes where buyer_id=uid and created_at>now()-interval '1 hour')>=5 then raise exception 'REQUEST_LIMIT'; end if;
  insert into public.account_disputes(order_item_id,buyer_id,seller_id,request_id,product_title,reason,created_at,updated_at)
    values(item.id,uid,item.seller_id,p_request_id,item.title,btrim(p_reason),stamp,stamp) returning id into ident;
  select coalesce(nullif(display_name,''),email) into label from public.account_profiles where id=uid;
  insert into public.account_dispute_replies(dispute_id,sender_id,request_id,sender_role,sender_name,body,created_at)
    values(ident,uid,p_request_id,'buyer',label,btrim(p_reason),stamp);
  return jsonb_build_object('id',ident);
end;$$;
create or replace function public.account_dispute_reply(p_id uuid,p_request_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; record public.account_disputes; ident uuid; label text; actor_role text;
begin
  uid:=account_admin_private.require_user();
  select * into record from public.account_disputes where id=p_id for update;
  if not found or not account_admin_private.participant(record.buyer_id,record.seller_id) then raise exception 'RECORD_NOT_FOUND'; end if;
  select id into ident from public.account_dispute_replies where dispute_id=p_id and sender_id=uid and request_id=p_request_id;
  if found then return jsonb_build_object('id',ident); end if;
  if record.status<>'open' then raise exception 'DISPUTE_CLOSED'; end if;
  if p_request_id is null or char_length(btrim(coalesce(p_body,''))) not between 1 and 5000 then raise exception 'INVALID_REPLY'; end if;
  if (select count(*) from public.account_dispute_replies where sender_id=uid and created_at>now()-interval '1 minute')>=30 then raise exception 'REQUEST_LIMIT'; end if;
  select coalesce(nullif(display_name,''),email),case when role='admin' then 'admin' when uid=record.buyer_id then 'buyer' else 'seller' end
    into label,actor_role from public.account_profiles where id=uid;
  insert into public.account_dispute_replies(dispute_id,sender_id,request_id,sender_role,sender_name,body)
    values(p_id,uid,p_request_id,actor_role,label,btrim(p_body)) returning id into ident;
  update public.account_disputes set updated_at=clock_timestamp() where id=p_id;
  return jsonb_build_object('id',ident);
end;$$;
create or replace function public.account_admin_dispute(p_id uuid,p_status text,p_note text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; record public.account_disputes; label text;
begin
  actor:=account_admin_private.require_admin(true);
  select * into record from public.account_disputes where id=p_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if p_status is null or p_status not in ('open','resolved_buyer','resolved_seller','closed') or p_request_id is null
    or char_length(btrim(coalesce(p_note,''))) not between 3 and 1000 then raise exception 'REASON_REQUIRED'; end if;
  if exists(select 1 from public.account_dispute_replies where dispute_id=p_id and sender_id=actor and request_id=p_request_id) then return jsonb_build_object('success',true); end if;
  update public.account_disputes set status=p_status,decision_note=btrim(p_note),decided_by=actor,updated_at=clock_timestamp(),
    decided_at=case when p_status='open' then null else clock_timestamp() end where id=p_id;
  select coalesce(nullif(display_name,''),email) into label from public.account_profiles where id=actor;
  insert into public.account_dispute_replies(dispute_id,sender_id,request_id,sender_role,sender_name,body,event_status)
    values(p_id,actor,p_request_id,'admin',label,btrim(p_note),p_status);
  insert into public.account_admin_audit(actor_id,action,target_id,details) values(actor,'dispute_decided',p_id::text,jsonb_build_object('status',p_status));
  return jsonb_build_object('success',true);
end;$$;

create or replace function public.account_test_topup(p_request_id uuid,p_amount numeric,p_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; ident uuid;
begin
  uid:=account_admin_private.require_user();
  select id into ident from public.account_topup_requests where user_id=uid and request_id=p_request_id;
  if found then return jsonb_build_object('id',ident); end if;
  if p_request_id is null or p_amount is null or p_amount<=0 or p_amount>10000 or char_length(coalesce(p_note,''))>1000 then raise exception 'INVALID_REQUEST'; end if;
  if exists(select 1 from public.account_topup_requests where user_id=uid and status='pending') then raise exception 'REQUEST_PENDING'; end if;
  insert into public.account_topup_requests(user_id,request_id,amount,note) values(uid,p_request_id,p_amount,coalesce(p_note,'')) returning id into ident;
  return jsonb_build_object('id',ident);
end;$$;
create or replace function public.account_admin_topup(p_id uuid,p_approve boolean,p_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; record public.account_topup_requests;
begin
  actor:=account_admin_private.require_admin(true);
  select * into record from public.account_topup_requests where id=p_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if p_approve is null or char_length(coalesce(p_note,''))>1000 then raise exception 'INVALID_REQUEST'; end if;
  if record.status=(case when p_approve then 'approved' else 'rejected' end) then return jsonb_build_object('success',true); end if;
  if record.status<>'pending' then raise exception 'ALREADY_REVIEWED'; end if;
  update public.account_topup_requests set status=case when p_approve then 'approved' else 'rejected' end,
    reviewed_by=actor,review_note=btrim(coalesce(p_note,'')),reviewed_at=clock_timestamp() where id=p_id;
  insert into public.account_admin_audit(actor_id,action,target_id) values(actor,case when p_approve then 'test_topup_approved' else 'test_topup_rejected' end,p_id::text);
  return jsonb_build_object('success',true,'payment_mode','test');
end;$$;

create or replace function public.account_admin_data(p_section text,p_offset integer default 0,p_filter text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; rows_json jsonb; off integer:=greatest(0,least(coalesce(p_offset,0),500000)); term text:=left(coalesce(p_filter,''),120);
begin
  actor:=account_admin_private.require_admin();
  if p_section='overview' then
    return jsonb_build_object('email',(select email from public.account_profiles where id=actor),'owner',(select coalesce(bool_or(is_owner),false) from public.account_admin_members where user_id=actor),
      'verifications',(select count(*) from public.account_verifications where status='pending'),
      'disputes',(select count(*) from public.account_disputes where status='open'),
      'banned',(select count(*) from public.account_profiles where banned),
      'topups',(select count(*) from public.account_topup_requests where status='pending'));
  elsif p_section='members' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select m.*,p.email,p.banned from public.account_admin_members m join public.account_profiles p on p.id=m.user_id order by m.is_owner desc,m.created_at,m.user_id limit 50 offset off) x;
  elsif p_section='accounts' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select p.*,coalesce(m.previous_role,p.role) base_role,m.is_owner,(m.user_id is not null) is_admin
      from public.account_profiles p left join public.account_admin_members m on m.user_id=p.id
      where (term='__banned__' and p.banned) or (term<>'__banned__' and (p.email ilike '%'||term||'%' or p.display_name ilike '%'||term||'%')) order by p.created_at desc,p.id limit 50 offset off) x;
  elsif p_section='tickets' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select t.*,p.email customer_email from public.account_support_tickets t join public.account_profiles p on p.id=t.user_id
      where term='' or t.status=term order by t.updated_at desc,t.id limit 50 offset off) x;
  elsif p_section='verifications' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select v.*,p.email,p.banned from public.account_verifications v join public.account_profiles p on p.id=v.user_id
      where v.status<>'uploading' and (term='' or v.status=term) order by v.created_at desc,v.id limit 50 offset off) x;
  elsif p_section='disputes' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select d.*,p.email buyer_email,s.email seller_email from public.account_disputes d
      join public.account_profiles p on p.id=d.buyer_id left join public.account_profiles s on s.id=d.seller_id
      where term<>'open' or d.status='open' order by d.updated_at desc,d.id limit 50 offset off) x;
  elsif p_section='orders' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select o.*,p.email buyer_email,(select coalesce(jsonb_agg(to_jsonb(i)),'[]') from public.account_order_items i where i.order_id=o.id) items
      from public.account_orders o join public.account_profiles p on p.id=o.user_id order by o.created_at desc,o.id limit 50 offset off) x;
  elsif p_section='topups' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows_json from (select r.*,p.email from public.account_topup_requests r join public.account_profiles p on p.id=r.user_id
      where term='' or r.status=term order by r.created_at desc,r.id limit 50 offset off) x;
  else raise exception 'INVALID_SECTION'; end if;
  return jsonb_build_object('rows',rows_json,'more',jsonb_array_length(rows_json)=50);
end;$$;

-- Existing manually assigned administrators stay authorized; ownership is set separately.
insert into public.account_admin_members(user_id,display_name,previous_role)
select id,coalesce(nullif(display_name,''),email),case when is_verified then 'seller' else 'buyer' end
from public.account_profiles where role='admin' on conflict(user_id) do nothing;

revoke all on function public.account_admin_membership(text,text,boolean),public.account_admin_ban(uuid,boolean,text),
  public.account_verification_prepare(uuid,text,text,text,text),public.account_verification_submit(uuid),public.account_admin_verify(uuid,boolean,text),
  public.account_dispute_open(uuid,uuid,text),public.account_dispute_reply(uuid,uuid,text),public.account_admin_dispute(uuid,text,text,uuid),
  public.account_test_topup(uuid,numeric,text),public.account_admin_topup(uuid,boolean,text),public.account_admin_data(text,integer,text) from public,anon,authenticated;
grant execute on function public.account_admin_membership(text,text,boolean),public.account_admin_ban(uuid,boolean,text),
  public.account_verification_prepare(uuid,text,text,text,text),public.account_verification_submit(uuid),public.account_admin_verify(uuid,boolean,text),
  public.account_dispute_open(uuid,uuid,text),public.account_dispute_reply(uuid,uuid,text),public.account_admin_dispute(uuid,text,text,uuid),
  public.account_test_topup(uuid,numeric,text),public.account_admin_topup(uuid,boolean,text),public.account_admin_data(text,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
