-- Publish/hide/republish without a code on every account platform; roll back fixtures.
begin;
do $$begin
 if account_bio_private.enabled() then raise exception 'BIO_REQUIREMENT_STILL_ENABLED';end if;
 if has_function_privilege('authenticated','public.account_bio_start(text,text,text)','execute')
 or has_function_privilege('service_role','public.account_bio_service(text,uuid,uuid,boolean,text)','execute') then raise exception 'RETIRED_RPC_STILL_ENABLED';end if;
end;$$;
select set_config('removed_bio.owner',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where p.role='admin' and not p.banned and u.email_confirmed_at is not null limit 1),true);
set local role authenticated;
do $$declare kind text;p text;result jsonb;credentials jsonb;
begin
 perform set_config('request.jwt.claim.sub',current_setting('removed_bio.owner'),true);
 foreach kind in array array['x','instagram','snapchat','tiktok','tellonym','discord','playstation','xbox','telegram'] loop
  p:=gen_random_uuid()::text;
  credentials:=jsonb_build_object('account_email','qa@example.test','email_password','dummy','account_username','qa_removed_bio','account_password','dummy');
  result:=public.account_seller_save_product(p,'qa_removed_bio',10,kind,'QA rollback',credentials,true);
  if result->>'active'<>'true' then raise exception 'PUBLISH_FAILED: %',kind;end if;
  perform public.account_seller_set_visibility(p,false);
  result:=public.account_seller_set_visibility(p,true);
  if result->>'active'<>'true' then raise exception 'REPUBLISH_FAILED: %',kind;end if;
 end loop;
end;$$;
rollback;
select jsonb_build_object('all_nine_platforms_publish_without_bio_code',true,'hide_and_republish_work',true,'retired_rpc_access_revoked',true,'all_fixtures_rolled_back',true) as checks;
