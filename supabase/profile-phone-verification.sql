begin;

create schema if not exists account_phone_private;
revoke all on schema account_phone_private from public, anon, authenticated;
grant usage on schema account_phone_private to authenticated;

create or replace function account_phone_private.auth_phone(value text)
returns text language sql immutable set search_path = '' as $$
  select account_signup_private.phone('+' || ltrim(coalesce(value, ''), '+'));
$$;

-- Initialize the existing signup phone when the profile row is created.
create or replace function public.account_sync_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_profiles (id, email, display_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data->>'name', ''), 120),
    case when tg_op = 'INSERT'
      then coalesce(account_signup_private.phone(new.raw_user_meta_data->>'phone'), '')
      else ''
    end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function account_phone_private.check_available(p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := account_admin_private.require_user();
  normalized text := account_signup_private.phone(p_phone);
begin
  if normalized is null then raise exception 'INVALID_PHONE'; end if;
  if exists (
    select 1 from account_signup_private.identifiers
    where kind = 'phone' and value = normalized and user_id <> uid
  ) then
    raise exception 'PHONE_IN_USE';
  end if;
end;
$$;

create or replace function public.account_check_profile_phone(p_phone text)
returns void language sql security invoker set search_path = '' as $$
  select account_phone_private.check_available(p_phone);
$$;

-- This guard covers both the profile RPC and direct Data API updates.
create or replace function account_phone_private.require_verified_profile_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  normalized text;
begin
  if new.phone is not distinct from old.phone then return new; end if;
  normalized := account_signup_private.phone(new.phone);
  if normalized is null then raise exception 'INVALID_PHONE'; end if;
  if normalized = account_signup_private.phone(old.phone) then return new; end if;
  if not exists (
    select 1 from auth.users
    where id = old.id and phone_confirmed_at is not null
      and account_phone_private.auth_phone(phone) = normalized
  ) then
    raise exception 'PHONE_VERIFICATION_REQUIRED' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Keep phone confirmation enabled on the Auth provider. GoTrue moves the
-- pending phone into phone and clears the challenge when it confirms the code.
-- Update the profile in the same transaction to preserve phone uniqueness.
create or replace function account_phone_private.sync_verified_auth_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  normalized text := account_phone_private.auth_phone(new.phone);
  blocked boolean;
begin
  select banned into blocked from public.account_profiles where id = new.id;
  if not found or nullif(new.phone, '') is null then return new; end if;
  if normalized is not null and normalized = account_phone_private.auth_phone(old.phone) then
    return new;
  end if;
  if blocked then raise exception 'ACCOUNT_BANNED'; end if;
  if normalized is null
    or account_phone_private.auth_phone(old.phone_change) is distinct from normalized
    or old.phone_change_sent_at is null
    or nullif(new.phone_change, '') is not null
    or nullif(new.phone_change_token, '') is not null
    or new.phone_confirmed_at is null
    or new.phone_confirmed_at is not distinct from old.phone_confirmed_at then
    raise exception 'PHONE_VERIFICATION_REQUIRED' using errcode = '42501';
  end if;

  update public.account_profiles set phone = normalized
  where id = new.id and phone is distinct from normalized;
  return new;
end;
$$;

drop trigger if exists account_phone_verified_update on public.account_profiles;
create trigger account_phone_verified_update
before update of phone on public.account_profiles
for each row execute function account_phone_private.require_verified_profile_phone();

drop trigger if exists account_verified_auth_phone_sync on auth.users;
create trigger account_verified_auth_phone_sync
after update of phone on auth.users
for each row when (old.phone is distinct from new.phone)
execute function account_phone_private.sync_verified_auth_phone();

revoke all on all functions in schema account_phone_private from public, anon, authenticated;
grant execute on function account_phone_private.check_available(text) to authenticated;
revoke all on function public.account_check_profile_phone(text) from public, anon, authenticated;
grant execute on function public.account_check_profile_phone(text) to authenticated;
notify pgrst, 'reload schema';

commit;
