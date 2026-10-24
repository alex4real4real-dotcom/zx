-- Upgrade an existing automatic-only ownership installation. No listing data is removed.

create or replace function account_bio_private.is_social(p_kind text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_kind in ('x','instagram','snapchat','tiktok','tellonym','discord','telegram','playstation','xbox'),false);
$$;

create or replace function account_bio_private.username(p_kind text,p_name text) returns text
language plpgsql immutable set search_path='' as $$
declare name text:=lower(case when p_kind='xbox' then btrim(coalesce(p_name,'')) else regexp_replace(btrim(coalesce(p_name,'')),'^@','') end);
begin
 if not account_bio_private.is_social(p_kind) then raise exception 'BIO_INVALID_USERNAME';end if;
 if p_kind='xbox' then
  if char_length(name)>64 or name !~ '^[[:alnum:]][[:alnum:] ,]*(#[0-9]{1,4})?$' then raise exception 'BIO_INVALID_USERNAME';end if;
 elsif name !~ '^[a-z0-9][a-z0-9_.-]{0,63}$' then raise exception 'BIO_INVALID_USERNAME';end if;
 return name;
end;$$;

alter table account_bio_private.challenges drop constraint challenges_platform_check;

alter table account_bio_private.challenges add constraint challenges_platform_check check(platform in ('x','instagram','snapchat','tiktok','tellonym','discord','telegram','playstation','xbox'));

alter table account_bio_private.challenges drop constraint challenges_username_check;

alter table account_bio_private.challenges add constraint challenges_username_check check ((platform='xbox' and char_length(username)<=64 and username ~ '^[[:alnum:]][[:alnum:] ,]*(#[0-9]{1,4})?$') or (platform<>'xbox' and username ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'));

create or replace function account_bio_private.service(p_action text,p_user_id uuid,p_id uuid,p_success boolean default false,p_reason text default '') returns jsonb
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
  if p_success and proof.platform not in ('telegram','tiktok','tellonym','x','snapchat') then raise exception 'INVALID_REQUEST';end if;
  update account_bio_private.challenges set status=case when p_success then 'approved' else 'issued' end,
   verified_at=case when p_success then clock_timestamp() else null end,method=case when p_success then 'public_bio' else null end,
   submitted_at=coalesce(submitted_at,clock_timestamp()),check_reason=case when p_reason in ('code_missing','automatic_unavailable','profile_unavailable') then p_reason else '' end
   where id=p_id returning * into proof;
 else raise exception 'INVALID_REQUEST';end if;
 return account_bio_private.visible(proof);
end;$$;

notify pgrst, 'reload schema';
