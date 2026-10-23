-- Reserve identifiers from the first signup, including unconfirmed accounts.
-- Existing duplicate accounts are preserved; their identifiers stay unavailable.
create schema if not exists account_signup_private;
revoke all on schema account_signup_private from public,anon,authenticated;
create table account_signup_private.identifiers(
 kind text not null check(kind in('email','phone')), value text not null,
 user_id uuid not null, created_at timestamptz not null default now(),
 primary key(kind,value)
);
alter table account_signup_private.identifiers enable row level security;
revoke all on account_signup_private.identifiers from public,anon,authenticated;
create function account_signup_private.phone(value text) returns text language plpgsql immutable security invoker set search_path='' as $$
declare result text:=translate(btrim(coalesce(value,'')),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789');
begin
 result:=regexp_replace(result,'[[:space:]()-]','','g');
 if left(result,2)='00' then result:='+'||substr(result,3);end if;
 if result~'^05[0-9]{8}$' then result:='+966'||substr(result,2);
 elsif result~'^5[0-9]{8}$' then result:='+966'||result;
 elsif result~'^9665[0-9]{8}$' then result:='+'||result;end if;
 if result!~'^\+[1-9][0-9]{7,14}$' then return null;end if;
 return result;
end;$$;
-- Claim every historically used valid identifier, including duplicates and metadata.
insert into account_signup_private.identifiers(kind,value,user_id)
select 'email',lower(btrim(email)),id from auth.users where coalesce(btrim(email),'')<>'' order by created_at,id on conflict do nothing;
insert into account_signup_private.identifiers(kind,value,user_id)
select 'phone',account_signup_private.phone(raw_user_meta_data->>'phone'),id from auth.users where account_signup_private.phone(raw_user_meta_data->>'phone') is not null order by created_at,id on conflict do nothing;
insert into account_signup_private.identifiers(kind,value,user_id)
select 'phone',account_signup_private.phone(phone),id from public.account_profiles where account_signup_private.phone(phone) is not null order by created_at,id on conflict do nothing;
create function account_signup_private.claim(p_kind text,p_value text,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 insert into account_signup_private.identifiers(kind,value,user_id) values(p_kind,p_value,p_user) on conflict do nothing;
 select user_id into owner_id from account_signup_private.identifiers where kind=p_kind and value=p_value;
 if owner_id is distinct from p_user then
  if p_kind='phone' then raise exception 'PHONE_IN_USE';else raise exception 'EMAIL_IN_USE';end if;
 end if;
end;$$;
create function account_signup_private.auth_identifiers() returns trigger language plpgsql security definer set search_path='' as $$
declare normalized text;
begin
 if coalesce(btrim(new.email),'')<>'' then perform account_signup_private.claim('email',lower(btrim(new.email)),new.id);end if;
 if tg_op='INSERT' then
  normalized:=account_signup_private.phone(new.raw_user_meta_data->>'phone');
  if normalized is null then raise exception 'INVALID_PHONE';end if;
  perform account_signup_private.claim('phone',normalized,new.id);
  update public.account_profiles set phone=normalized where id=new.id;
 end if;
 return new;
end;$$;
create trigger z_account_signup_identifiers after insert or update of email on auth.users for each row execute function account_signup_private.auth_identifiers();
create function account_signup_private.profile_phone() returns trigger language plpgsql security definer set search_path='' as $$
declare normalized text;
begin
 if tg_op='UPDATE' and new.phone is not distinct from old.phone then return new;end if;
 if coalesce(btrim(new.phone),'')='' then
  if tg_op='UPDATE' and coalesce(btrim(old.phone),'')<>'' then raise exception 'INVALID_PHONE';end if;
  return new;
 end if;
 normalized:=account_signup_private.phone(new.phone);
 if normalized is null then raise exception 'INVALID_PHONE';end if;
 perform account_signup_private.claim('phone',normalized,new.id);new.phone:=normalized;return new;
end;$$;
create trigger account_profile_phone_unique before insert or update of phone on public.account_profiles for each row execute function account_signup_private.profile_phone();
create function account_signup_private.availability(p_email text,p_phone text) returns text language plpgsql security definer set search_path='' as $$
declare normalized text:=account_signup_private.phone(p_phone);email text:=lower(btrim(coalesce(p_email,'')));
begin
 if email='' or char_length(email)>254 then raise exception 'INVALID_EMAIL';end if;
 if normalized is null then raise exception 'INVALID_PHONE';end if;
 if exists(select 1 from account_signup_private.identifiers where kind='email' and value=email) then return 'email_in_use';end if;
 if exists(select 1 from account_signup_private.identifiers where kind='phone' and value=normalized) then return 'phone_in_use';end if;
 return 'available';
end;$$;
revoke all on all functions in schema account_signup_private from public,anon,authenticated;
grant usage on schema account_signup_private to anon,authenticated;
grant execute on function account_signup_private.availability(text,text) to anon,authenticated;
create function public.account_signup_availability(p_email text,p_phone text) returns text language sql security invoker set search_path='' as $$select account_signup_private.availability(p_email,p_phone);$$;
revoke all on function public.account_signup_availability(text,text) from public;
grant execute on function public.account_signup_availability(text,text) to anon,authenticated;
