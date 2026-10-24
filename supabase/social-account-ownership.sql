-- Public RPCs delegate to a private schema. Proofs cannot be written by sellers.
create schema if not exists account_bio_private;
revoke all on schema account_bio_private from public, anon, authenticated;
grant usage on schema account_bio_private to authenticated, service_role;

-- Rollout is explicit: activate after the matching frontend has deployed.
create table account_bio_private.settings (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
alter table account_bio_private.settings enable row level security;
revoke all on account_bio_private.settings from public,anon,authenticated,service_role;
insert into account_bio_private.settings(singleton,enabled) values(true,false);
create function account_bio_private.enabled() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from account_bio_private.settings where singleton),false);
$$;

create function account_bio_private.is_social(p_kind text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_kind in ('x','instagram','snapchat','tiktok','tellonym','discord','telegram'),false);
$$;
create function account_bio_private.username(p_kind text,p_name text) returns text
language plpgsql immutable set search_path='' as $$
declare name text:=lower(regexp_replace(btrim(coalesce(p_name,'')),'^@',''));
begin
 if not account_bio_private.is_social(p_kind) or name !~ '^[a-z0-9][a-z0-9_.-]{0,63}$' then raise exception 'BIO_INVALID_USERNAME';end if;
 return name;
end;$$;
create function account_bio_private.profile_url(p_kind text,p_name text) returns text
language sql immutable set search_path='' as $$
 select case p_kind when 'x' then 'https://x.com/'||p_name when 'instagram' then 'https://www.instagram.com/'||p_name||'/'
 when 'snapchat' then 'https://www.snapchat.com/add/'||p_name when 'tiktok' then 'https://www.tiktok.com/@'||p_name
 when 'tellonym' then 'https://tellonym.me/'||p_name when 'telegram' then 'https://t.me/'||p_name else null end;
$$;
create function account_bio_private.new_code() returns text
language plpgsql volatile set search_path='' as $$
declare value bigint;
begin
 -- Reject the incomplete modulo bucket so all 100,000,000 codes are equally likely.
 loop
  value:=('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint;
  exit when value<4200000000;
 end loop;
 return lpad((value%100000000)::text,8,'0');
end;$$;

create table account_bio_private.challenges (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.account_profiles(id) on delete cascade,
 product_id text not null,
 platform text not null check(platform in ('x','instagram','snapchat','tiktok','tellonym','discord','telegram')),
 username text not null,
 code text not null unique default account_bio_private.new_code() check(code ~ '^[0-9]{8}$'),
 profile_url text,
 status text not null default 'issued' check(status in ('issued','pending','approved','rejected')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default (clock_timestamp()+interval '24 hours'),
 submitted_at timestamptz, verified_at timestamptz, consumed_at timestamptz,
 reviewer_id uuid references public.account_profiles(id) on delete set null,
 review_note text not null default '', method text,
 attempts integer not null default 0, last_checked_at timestamptz,
 check_reason text not null default '',
 check (username ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
 check (product_id ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'),
 check (status<>'approved' or verified_at is not null)
);
alter table account_bio_private.challenges enable row level security;
revoke all on account_bio_private.challenges from public,anon,authenticated,service_role;
create index account_bio_seller_product on account_bio_private.challenges(user_id,product_id,created_at desc);
create index account_bio_review_queue on account_bio_private.challenges(status,submitted_at,id) where status='pending';

create function account_bio_private.visible(p_record account_bio_private.challenges) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p_record.id,'product_id',p_record.product_id,'platform',p_record.platform,'username',p_record.username,
 'code',p_record.code,'profile_url',p_record.profile_url,'status',p_record.status,'expires_at',p_record.expires_at,
 'method',p_record.method,'verified_at',p_record.verified_at,'consumed_at',p_record.consumed_at,'review_note',p_record.review_note,
 'server_now',clock_timestamp(),'check_reason',p_record.check_reason);
$$;
create function account_bio_private.start(p_product_id text,p_platform text,p_username text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;name text;proof account_bio_private.challenges;owner_id uuid;attempt integer;
begin
 uid:=account_admin_private.require_user();name:=account_bio_private.username(p_platform,p_username);
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'EMAIL_CONFIRMATION_REQUIRED';end if;
 if p_product_id is null or p_product_id !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'INVALID_PRODUCT';end if;
 select seller_id into owner_id from public.account_products where id=p_product_id;
 if found and owner_id is distinct from uid then raise exception 'PRODUCT_NOT_FOUND';end if;
 if exists(select 1 from public.account_products where id=p_product_id and (deleted_at is not null or sold_at is not null)) then raise exception 'PRODUCT_NOT_FOUND';end if;
 select * into proof from account_bio_private.challenges where user_id=uid and product_id=p_product_id and platform=p_platform and username=name
  and status<>'rejected' and (expires_at>clock_timestamp() or (status='approved' and consumed_at is not null)) order by created_at desc limit 1;
 if found then return account_bio_private.visible(proof);end if;
 if (select count(*) from account_bio_private.challenges where user_id=uid and created_at>clock_timestamp()-interval '1 hour')>=20 then raise exception 'BIO_REQUEST_LIMIT';end if;
 for attempt in 1..10 loop
  begin
   insert into account_bio_private.challenges(user_id,product_id,platform,username,profile_url)
   values(uid,p_product_id,p_platform,name,account_bio_private.profile_url(p_platform,name)) returning * into proof;
   return account_bio_private.visible(proof);
  exception when unique_violation then null;
  end;
 end loop;
 raise exception 'BIO_REQUEST_LIMIT';
end;$$;
create function account_bio_private.latest(p_product_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;proof account_bio_private.challenges;
begin
 uid:=account_admin_private.require_user();
 select * into proof from account_bio_private.challenges where user_id=uid and product_id=p_product_id order by created_at desc limit 1;
 return case when found then account_bio_private.visible(proof) else null end;
end;$$;

create function account_bio_private.require_claim(p_owner uuid,p_product_id text,p_platform text,p_username text,p_consume boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare proof account_bio_private.challenges;name text;
begin
 if not account_bio_private.is_social(p_platform) then return null;end if;
 name:=account_bio_private.username(p_platform,p_username);
 select * into proof from account_bio_private.challenges where user_id=p_owner and product_id=p_product_id and platform=p_platform and username=name
  and status='approved' and method in ('public_bio','official_api') and (expires_at>clock_timestamp() or consumed_at is not null) order by verified_at desc limit 1 for update;
 if not found then raise exception 'BIO_VERIFICATION_REQUIRED';end if;
 if p_consume and proof.consumed_at is null then update account_bio_private.challenges set consumed_at=clock_timestamp() where id=proof.id;end if;
 return proof.id;
end;$$;
create function account_bio_private.enforce_listing() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not account_bio_private.enabled() then return new;end if;
 if new.active and account_bio_private.is_social(new.listing_type) then
  if tg_op='UPDATE' then
   -- Background changes to price, bans and settlement do not republish a listing.
   if old.active and (new.id,new.seller_id,new.listing_type,new.title) is not distinct from (old.id,old.seller_id,old.listing_type,old.title) then return new;end if;
  end if;
  if new.seller_id is null then raise exception 'BIO_VERIFICATION_REQUIRED';end if;
  perform account_bio_private.require_claim(new.seller_id,new.id,new.listing_type,new.title,true);
 end if;
 return new;
end;$$;
create trigger account_require_social_ownership before insert or update on public.account_products
 for each row execute function account_bio_private.enforce_listing();

create function account_bio_private.admin_list(p_offset integer,p_filter text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform account_admin_private.require_admin();
 if p_offset is null or p_offset<0 or p_offset>100000 or p_filter is null or p_filter not in ('','pending','issued','approved','rejected') then raise exception 'INVALID_REQUEST';end if;
 select coalesce(jsonb_agg(value order by submitted_at,id),'[]'::jsonb) into result from (
  select account_bio_private.visible(c)||jsonb_build_object('seller_email',p.email,'seller_name',p.display_name,'created_at',c.created_at) value,
   coalesce(c.submitted_at,c.created_at) submitted_at,c.id
  from account_bio_private.challenges c join public.account_profiles p on p.id=c.user_id
  where (p_filter='' or c.status=p_filter) order by coalesce(c.submitted_at,c.created_at),c.id limit 51 offset p_offset
 ) q;
 return jsonb_build_object('rows',case when jsonb_array_length(result)>50 then result-50 else result end,'more',jsonb_array_length(result)>50);
end;$$;
-- This RPC is callable only by the authenticated Edge Function's service role.
create function account_bio_private.service(p_action text,p_user_id uuid,p_id uuid,p_success boolean default false,p_reason text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare proof account_bio_private.challenges;
begin
 if p_user_id is null or not exists(select 1 from public.account_profiles p join auth.users u on u.id=p.id where p.id=p_user_id and not p.banned and u.email_confirmed_at is not null) then raise exception 'AUTH_REQUIRED';end if;
 select * into proof from account_bio_private.challenges where id=p_id and user_id=p_user_id for update;
 if not found then raise exception 'RECORD_NOT_FOUND';end if;
 if proof.status='approved' and proof.method in ('public_bio','official_api') then return account_bio_private.visible(proof);end if;
 if proof.status='rejected' or proof.expires_at<=clock_timestamp() then raise exception 'BIO_CODE_EXPIRED';end if;
 if p_action='claim' then
  if proof.last_checked_at>clock_timestamp()-interval '20 seconds' then raise exception 'BIO_CHECK_RATE_LIMIT';end if;
  if proof.attempts>=30 then raise exception 'BIO_REQUEST_LIMIT';end if;
  update account_bio_private.challenges set attempts=attempts+1,last_checked_at=clock_timestamp() where id=p_id returning * into proof;
 elsif p_action='finish' then
  if proof.last_checked_at is null or proof.last_checked_at<clock_timestamp()-interval '30 seconds' then raise exception 'INVALID_REQUEST';end if;
  if p_success and proof.platform not in ('telegram','tiktok') then raise exception 'INVALID_REQUEST';end if;
  update account_bio_private.challenges set status=case when p_success then 'approved' else 'issued' end,
   verified_at=case when p_success then clock_timestamp() else null end,method=case when p_success then 'public_bio' else null end,
   submitted_at=coalesce(submitted_at,clock_timestamp()),check_reason=case when p_reason in ('code_missing','automatic_unavailable','profile_unavailable') then p_reason else '' end
   where id=p_id returning * into proof;
 else raise exception 'INVALID_REQUEST';end if;
 return account_bio_private.visible(proof);
end;$$;

revoke all on all functions in schema account_bio_private from public,anon,authenticated,service_role;
grant execute on function account_bio_private.start(text,text,text),account_bio_private.latest(text),account_bio_private.admin_list(integer,text) to authenticated;
grant execute on function account_bio_private.service(text,uuid,uuid,boolean,text) to service_role;
create function public.account_bio_start(p_product_id text,p_platform text,p_username text) returns jsonb language sql security invoker set search_path='' as $$select account_bio_private.start(p_product_id,p_platform,p_username);$$;
create function public.account_bio_status(p_product_id text) returns jsonb language sql security invoker set search_path='' as $$select account_bio_private.latest(p_product_id);$$;
create function public.account_bio_admin_list(p_offset integer default 0,p_filter text default 'pending') returns jsonb language sql security invoker set search_path='' as $$select account_bio_private.admin_list(p_offset,p_filter);$$;
create function public.account_bio_service(p_action text,p_user_id uuid,p_id uuid,p_success boolean default false,p_reason text default '') returns jsonb language sql security invoker set search_path='' as $$select account_bio_private.service(p_action,p_user_id,p_id,p_success,p_reason);$$;
revoke all on function public.account_bio_start(text,text,text),public.account_bio_status(text),public.account_bio_admin_list(integer,text),public.account_bio_service(text,uuid,uuid,boolean,text) from public,anon,authenticated,service_role;
grant execute on function public.account_bio_start(text,text,text),public.account_bio_status(text),public.account_bio_admin_list(integer,text) to authenticated;
grant execute on function public.account_bio_service(text,uuid,uuid,boolean,text) to service_role;
notify pgrst,'reload schema';
CREATE OR REPLACE FUNCTION account_seller_private.save_product(p_id text, p_title text, p_price numeric, p_listing_type text, p_description text, p_credentials jsonb, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid; existing_owner uuid; verified boolean; social boolean; credentials jsonb; saved public.account_products;
begin
  uid:=account_admin_private.require_user();
  if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'EMAIL_CONFIRMATION_REQUIRED'; end if;
  select (is_verified or role='admin') into verified from public.account_profiles where id=uid;
  if p_active is null then raise exception 'INVALID_PRODUCT'; end if;
  if p_active and not verified then raise exception 'SELLER_VERIFICATION_REQUIRED'; end if;
  if p_id is null or p_id!~'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    or char_length(btrim(coalesce(p_title,''))) not between 2 and 200
    or p_price is null or p_price::text in ('NaN','Infinity','-Infinity') or p_price<0.01 or p_price>1000000
    or p_listing_type is null or p_listing_type not in ('x','instagram','snapchat','tiktok','tellonym','discord','playstation','xbox','telegram','service','game')
    or char_length(coalesce(p_description,''))>5000 then raise exception 'INVALID_PRODUCT'; end if;
  social:=p_listing_type not in ('service','game');
  credentials:=coalesce(p_credentials,'{}'::jsonb);
  if jsonb_typeof(credentials)<>'object' then raise exception 'INVALID_CREDENTIALS'; end if;
  if social and (
    coalesce(credentials->>'account_email','')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(coalesce(credentials->>'account_email',''))>254
    or char_length(coalesce(credentials->>'email_password','')) not between 1 and 512
    or char_length(btrim(coalesce(credentials->>'account_username',''))) not between 1 and 200
    or char_length(coalesce(credentials->>'account_password','')) not between 1 and 512
  ) then raise exception 'INVALID_CREDENTIALS'; end if;
  select seller_id into existing_owner from public.account_products where id=p_id for update;
  if found and existing_owner is distinct from uid then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if exists(select 1 from public.account_products where id=p_id and seller_id=uid and deleted_at is not null) then raise exception 'PRODUCT_DELETED';end if;
  if not found and (select count(*) from public.account_products where seller_id=uid)>=500 then raise exception 'PRODUCT_LIMIT'; end if;
  if p_active and account_bio_private.enabled() and account_bio_private.is_social(p_listing_type) then
    if account_bio_private.username(p_listing_type,p_title) is distinct from account_bio_private.username(p_listing_type,credentials->>'account_username') then raise exception 'BIO_USERNAME_MISMATCH';end if;
    perform account_bio_private.require_claim(uid,p_id,p_listing_type,p_title,true);
  end if;
  insert into public.account_products(id,title,price,description,listing_type,seller_id,active)
    values(p_id,btrim(p_title),round(p_price,2),btrim(coalesce(p_description,'')),p_listing_type,uid,p_active)
    on conflict(id) do update set title=excluded.title,price=excluded.price,description=excluded.description,
      listing_type=excluded.listing_type,active=excluded.active,updated_at=clock_timestamp()
    where account_products.seller_id=uid
    returning * into saved;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if social then
    insert into account_seller_private.product_secrets(product_id,account_email,email_password,account_username,account_password,test_delivery)
      values(p_id,btrim(credentials->>'account_email'),credentials->>'email_password',btrim(credentials->>'account_username'),credentials->>'account_password',coalesce(credentials->>'test_delivery','false')='true')
      on conflict(product_id) do update set account_email=excluded.account_email,email_password=excluded.email_password,
        account_username=excluded.account_username,account_password=excluded.account_password,test_delivery=excluded.test_delivery,updated_at=clock_timestamp();
  else
    delete from account_seller_private.product_secrets where product_id=p_id;
  end if;
  return to_jsonb(saved);
end;$function$;
