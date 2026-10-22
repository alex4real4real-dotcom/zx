-- Account support tickets. Safe to run again; preserves existing site data.
begin;
create table if not exists public.account_support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  subject text not null check (char_length(subject) between 3 and 160),
  category text not null check (category in ('order','account','payment','technical','other')),
  priority text not null check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  customer_name text not null default '',
  last_message text not null default '',
  last_sender text not null default 'user' check (last_sender in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  user_read_at timestamptz,
  staff_read_at timestamptz,
  closed_at timestamptz,
  unique(user_id,request_id)
);
create index if not exists account_support_tickets_user_updated on public.account_support_tickets(user_id,updated_at desc);
create index if not exists account_support_tickets_status_updated on public.account_support_tickets(status,updated_at desc);
create table if not exists public.account_support_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.account_support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  request_id uuid not null,
  sender_role text not null check (sender_role in ('user','admin')),
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  unique(ticket_id,sender_id,request_id)
);
create index if not exists account_support_replies_ticket_created on public.account_support_replies(ticket_id,created_at,id);
create index if not exists account_support_replies_sender_created on public.account_support_replies(sender_id,created_at desc);

alter table public.account_support_tickets enable row level security;
alter table public.account_support_replies enable row level security;
revoke all on public.account_support_tickets,public.account_support_replies from public,anon,authenticated;
grant select on public.account_support_tickets,public.account_support_replies to authenticated;

create or replace function public.account_support_allowed(p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.account_profiles p where p.id=(select auth.uid())
    and not p.banned and (p.id=p_owner or p.role='admin'));
$$;
revoke all on function public.account_support_allowed(uuid) from public,anon;
grant execute on function public.account_support_allowed(uuid) to authenticated;
drop policy if exists account_support_ticket_read on public.account_support_tickets;
create policy account_support_ticket_read on public.account_support_tickets for select to authenticated
  using(public.account_support_allowed(user_id));
drop policy if exists account_support_reply_read on public.account_support_replies;
create policy account_support_reply_read on public.account_support_replies for select to authenticated
  using(exists(select 1 from public.account_support_tickets t where t.id=ticket_id and public.account_support_allowed(t.user_id)));

-- Internal helper: serializes each sender's writes and reads their real profile.
create or replace function public.account_support_actor()
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); blocked boolean;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.banned into blocked from public.account_profiles p where p.id=uid for update;
  if not found then raise exception 'PROFILE_NOT_READY'; end if;
  if blocked then raise exception 'ACCOUNT_BANNED'; end if;
  return uid;
end;
$$;
revoke all on function public.account_support_actor() from public,anon,authenticated;

create or replace function public.account_support_create(p_request_id uuid,p_subject text,p_category text,p_priority text,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; tid uuid; stamp timestamptz; label text;
begin
  uid := public.account_support_actor();
  if p_request_id is null or p_subject is null or char_length(btrim(p_subject)) not between 3 and 160
    or p_body is null or char_length(btrim(p_body)) not between 5 and 5000
    or p_category is null or p_category not in ('order','account','payment','technical','other')
    or p_priority is null or p_priority not in ('low','normal','high','urgent') then
    raise exception 'SUPPORT_INVALID_TICKET';
  end if;
  select t.id into tid from public.account_support_tickets t where t.user_id=uid and t.request_id=p_request_id;
  if found then return jsonb_build_object('id',tid); end if;
  if (select count(*) from public.account_support_tickets where user_id=uid and created_at>now()-interval '1 hour')>=5 then
    raise exception 'SUPPORT_TICKET_LIMIT';
  end if;
  select left(coalesce(nullif(display_name,''),email),120) into label from public.account_profiles where id=uid;
  stamp := clock_timestamp();
  insert into public.account_support_tickets(user_id,request_id,subject,category,priority,customer_name,last_message,created_at,updated_at,last_message_at,user_read_at)
    values(uid,p_request_id,btrim(p_subject),p_category,p_priority,label,left(btrim(p_body),200),stamp,stamp,stamp,stamp) returning id into tid;
  insert into public.account_support_replies(ticket_id,sender_id,request_id,sender_role,sender_name,body,created_at)
    values(tid,uid,p_request_id,'user',label,btrim(p_body),stamp);
  return jsonb_build_object('id',tid);
end;
$$;

create or replace function public.account_support_reply(p_ticket_id uuid,p_request_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; ticket public.account_support_tickets; mid uuid; staff boolean; label text; stamp timestamptz;
begin
  uid := public.account_support_actor();
  if p_request_id is null or p_body is null or char_length(btrim(p_body)) not between 1 and 5000 then raise exception 'SUPPORT_INVALID_REPLY'; end if;
  select * into ticket from public.account_support_tickets where id=p_ticket_id for update;
  if not found or not public.account_support_allowed(ticket.user_id) then raise exception 'SUPPORT_NOT_FOUND'; end if;
  select id into mid from public.account_support_replies where ticket_id=p_ticket_id and sender_id=uid and request_id=p_request_id;
  if found then return jsonb_build_object('id',mid); end if;
  if ticket.status='closed' then raise exception 'SUPPORT_CLOSED'; end if;
  if (select count(*) from public.account_support_replies where sender_id=uid and created_at>now()-interval '1 minute')>=30 then
    raise exception 'SUPPORT_REPLY_LIMIT';
  end if;
  select role='admin',left(coalesce(nullif(display_name,''),email),120) into staff,label from public.account_profiles where id=uid;
  stamp := clock_timestamp();
  insert into public.account_support_replies(ticket_id,sender_id,request_id,sender_role,sender_name,body,created_at)
    values(p_ticket_id,uid,p_request_id,case when staff then 'admin' else 'user' end,label,btrim(p_body),stamp) returning id into mid;
  update public.account_support_tickets set last_message=left(btrim(p_body),200),last_sender=case when staff then 'admin' else 'user' end,
    updated_at=stamp,last_message_at=stamp,status=case when staff and status='open' then 'in_progress' else status end,
    user_read_at=case when not staff then stamp else user_read_at end,staff_read_at=case when staff then stamp else staff_read_at end
    where id=p_ticket_id;
  return jsonb_build_object('id',mid);
end;
$$;

create or replace function public.account_support_status(p_ticket_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; ticket public.account_support_tickets; staff boolean;
begin
  uid := public.account_support_actor();
  select * into ticket from public.account_support_tickets where id=p_ticket_id for update;
  if not found or not public.account_support_allowed(ticket.user_id) then raise exception 'SUPPORT_NOT_FOUND'; end if;
  select role='admin' into staff from public.account_profiles where id=uid;
  if p_status is null or p_status not in ('open','in_progress','closed') then raise exception 'SUPPORT_INVALID_STATUS'; end if;
  if not staff and p_status='in_progress' then raise exception 'SUPPORT_FORBIDDEN'; end if;
  if ticket.status<>p_status then
    update public.account_support_tickets set status=p_status,updated_at=clock_timestamp(),
      closed_at=case when p_status='closed' then clock_timestamp() else null end where id=p_ticket_id;
  end if;
  return jsonb_build_object('id',p_ticket_id,'status',p_status);
end;
$$;

create or replace function public.account_support_read(p_ticket_id uuid,p_as_staff boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; ticket public.account_support_tickets; staff boolean;
begin
  uid := public.account_support_actor();
  select * into ticket from public.account_support_tickets where id=p_ticket_id for update;
  if not found or not public.account_support_allowed(ticket.user_id) then raise exception 'SUPPORT_NOT_FOUND'; end if;
  select role='admin' into staff from public.account_profiles where id=uid;
  if coalesce(p_as_staff,false) then
    if not staff then raise exception 'SUPPORT_FORBIDDEN'; end if;
    update public.account_support_tickets set staff_read_at=clock_timestamp() where id=p_ticket_id;
  else
    if ticket.user_id<>uid then raise exception 'SUPPORT_FORBIDDEN'; end if;
    update public.account_support_tickets set user_read_at=clock_timestamp() where id=p_ticket_id;
  end if;
  return jsonb_build_object('success',true);
end;
$$;

create or replace function public.account_support_health()
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('ready',true,'version',1);
$$;
revoke all on function public.account_support_create(uuid,text,text,text,text),public.account_support_reply(uuid,uuid,text),
  public.account_support_status(uuid,text),public.account_support_read(uuid,boolean),public.account_support_health() from public,anon,authenticated;
grant execute on function public.account_support_create(uuid,text,text,text,text),public.account_support_reply(uuid,uuid,text),
  public.account_support_status(uuid,text),public.account_support_read(uuid,boolean) to authenticated;
grant execute on function public.account_support_health() to anon,authenticated;
notify pgrst,'reload schema';
commit;
