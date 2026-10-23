-- Restore the RPC already used by the profile editor.
alter table public.account_profiles add column if not exists avatar_path text;
create function account_signup_private.update_profile(p_name text,p_phone text,p_avatar_path text)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid; normalized text;name text:=btrim(coalesce(p_name,''));
begin
 uid:=account_admin_private.require_user();
 if char_length(name) not between 2 and 120 then raise exception 'INVALID_NAME';end if;
 normalized:=account_signup_private.phone(p_phone);
 if normalized is null then raise exception 'INVALID_PHONE';end if;
 if p_avatar_path is not null and p_avatar_path not in(uid::text||'/avatar.png',uid::text||'/avatar.jpg',uid::text||'/avatar.webp') then raise exception 'INVALID_AVATAR';end if;
 -- The profile phone trigger atomically reserves and rejects duplicate numbers.
 update public.account_profiles set display_name=name,phone=normalized,avatar_path=coalesce(p_avatar_path,avatar_path) where id=uid;
end;$$;
revoke all on function account_signup_private.update_profile(text,text,text) from public,anon,authenticated;
grant execute on function account_signup_private.update_profile(text,text,text) to authenticated;
create function public.account_update_profile(p_name text,p_phone text,p_avatar_path text default null)
returns void language sql security invoker set search_path='' as $$select account_signup_private.update_profile(p_name,p_phone,p_avatar_path);$$;
revoke all on function public.account_update_profile(text,text,text) from public,anon,authenticated;
grant execute on function public.account_update_profile(text,text,text) to authenticated;
notify pgrst,'reload schema';
