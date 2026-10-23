create table public.account_ideas (
 id uuid primary key,
 user_id uuid not null references public.account_profiles(id),
 submitter_name text not null,
 submitter_email text not null,
 idea text not null check(char_length(btrim(idea)) between 3 and 200),
 description text not null check(char_length(btrim(description)) between 10 and 5000),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.account_ideas enable row level security;
revoke all on public.account_ideas from public,anon,authenticated;
grant select on public.account_ideas to authenticated;
create policy ideas_admin_read on public.account_ideas for select to authenticated using((select public.account_is_admin()));
create index account_ideas_created on public.account_ideas(created_at desc,id);
create index account_ideas_sender_created on public.account_ideas(user_id,created_at desc);
create function account_admin_private.submit_idea(p_id uuid,p_idea text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid;existing public.account_ideas;sender public.account_profiles;
begin
 uid:=account_admin_private.require_user();
 if p_id is null or p_idea is null or p_description is null or char_length(btrim(p_idea)) not between 3 and 200 or char_length(btrim(p_description)) not between 10 and 5000 then raise exception 'INVALID_IDEA';end if;
 select * into existing from public.account_ideas where id=p_id;
 if found then
  if existing.user_id<>uid or existing.idea<>btrim(p_idea) or existing.description<>btrim(p_description) then raise exception 'INVALID_IDEA';end if;
  return existing.id;
 end if;
 if (select count(*) from public.account_ideas where user_id=uid and created_at>clock_timestamp()-interval '1 minute')>=2 or
 (select count(*) from public.account_ideas where user_id=uid and created_at>clock_timestamp()-interval '1 day')>=20 then raise exception 'REQUEST_LIMIT';end if;
 select * into sender from public.account_profiles where id=uid;
 insert into public.account_ideas(id,user_id,submitter_name,submitter_email,idea,description) values(p_id,uid,coalesce(sender.display_name,''),sender.email,btrim(p_idea),btrim(p_description));
 return p_id;
end;$$;
revoke all on function account_admin_private.submit_idea(uuid,text,text) from public,anon,authenticated;
grant execute on function account_admin_private.submit_idea(uuid,text,text) to authenticated;
create function public.account_submit_idea(p_id uuid,p_idea text,p_description text)
returns uuid language sql security invoker set search_path='' as $$select account_admin_private.submit_idea(p_id,p_idea,p_description);$$;
revoke all on function public.account_submit_idea(uuid,text,text) from public,anon,authenticated;
grant execute on function public.account_submit_idea(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
