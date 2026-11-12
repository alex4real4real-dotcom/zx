begin;

-- Profile edits use the authenticated profile RPC and the unique phone trigger.
drop trigger if exists account_phone_verified_update on public.account_profiles;
drop trigger if exists account_verified_auth_phone_sync on auth.users;
drop function if exists public.account_check_profile_phone(text);
drop function if exists account_phone_private.require_verified_profile_phone();
drop function if exists account_phone_private.sync_verified_auth_phone();
drop function if exists account_phone_private.check_available(text);
drop function if exists account_phone_private.auth_phone(text);
drop schema if exists account_phone_private;

notify pgrst, 'reload schema';

commit;
