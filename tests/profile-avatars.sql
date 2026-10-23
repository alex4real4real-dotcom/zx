begin;
select set_config('avatar_qa.owner',(select id::text from public.account_profiles where not banned order by created_at limit 1),true),
set_config('avatar_qa.other',(select id::text from public.account_profiles where not banned order by created_at offset 1 limit 1),true);
do $$begin
 if not exists(select 1 from storage.buckets where id='account-avatars' and public=false and file_size_limit=2097152 and allowed_mime_types=array['image/png','image/jpeg','image/webp']) then raise exception 'AVATAR_BUCKET_CONFIGURATION';end if;
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('avatar_qa.owner'),true);
insert into storage.objects(bucket_id,name,metadata) values('account-avatars',current_setting('avatar_qa.owner')||'/avatar.png','{"mimetype":"image/png","size":1}');
do $$begin
 if (select count(*) from storage.objects where bucket_id='account-avatars' and name=current_setting('avatar_qa.owner')||'/avatar.png')<>1 then raise exception 'OWNER_READ_DENIED';end if;
 update storage.objects set metadata='{"mimetype":"image/png","size":2}' where bucket_id='account-avatars' and name=current_setting('avatar_qa.owner')||'/avatar.png';
 if not found then raise exception 'OWNER_REPLACE_DENIED';end if;
 begin insert into storage.objects(bucket_id,name)values('account-avatars',current_setting('avatar_qa.other')||'/avatar.png');raise exception 'OTHER_UPLOAD_ALLOWED';exception when insufficient_privilege then null;end;
 begin update storage.objects set name=current_setting('avatar_qa.other')||'/avatar.png' where bucket_id='account-avatars' and name=current_setting('avatar_qa.owner')||'/avatar.png';raise exception 'OTHER_RENAME_ALLOWED';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name)values('account-avatars',current_setting('avatar_qa.owner')||'/avatar.svg');raise exception 'INVALID_PATH_ALLOWED';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('avatar_qa.other'),true);
do $$begin
 if exists(select 1 from storage.objects where bucket_id='account-avatars' and name=current_setting('avatar_qa.owner')||'/avatar.png') then raise exception 'OTHER_READ_ALLOWED';end if;
 update storage.objects set metadata='{}' where bucket_id='account-avatars' and name=current_setting('avatar_qa.owner')||'/avatar.png';
 if found then raise exception 'OTHER_REPLACE_ALLOWED';end if;
end;$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 if exists(select 1 from storage.objects where bucket_id='account-avatars') then raise exception 'ANON_READ_ALLOWED';end if;
 begin insert into storage.objects(bucket_id,name)values('account-avatars','anonymous/avatar.png');raise exception 'ANON_UPLOAD_ALLOWED';exception when insufficient_privilege then null;end;
end;$$;
rollback;
