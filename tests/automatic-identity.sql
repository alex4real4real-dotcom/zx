-- Run after automatic-identity.sql. All data changes roll back.
begin;
select set_config('account_identity_test.buyer',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id
  where p.role='buyer' and not p.banned and not p.is_verified and u.email_confirmed_at is not null
  and not exists(select 1 from public.account_verifications v where v.user_id=p.id and v.status in ('uploading','pending')) limit 1),true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $tests$
declare uid uuid:=current_setting('account_identity_test.buyer')::uuid; row_id uuid; provider_id uuid:=gen_random_uuid();
  workflow text:=gen_random_uuid()::text; result jsonb; fields jsonb;
begin
  if uid is null then raise exception 'UNVERIFIED_FIXTURE_REQUIRED'; end if;
  fields:=jsonb_build_object('store','Fictional QA store','legal','Fictional QA name','phone','+966500000000','consent_version','identity-v1');
  update account_identity_private.settings set enabled=false where singleton;
  begin
    perform public.account_identity_service('prepare',uid,null,gen_random_uuid(),fields);
    raise exception 'DISABLED_SERVICE_ALLOWED';
  exception when raise_exception then if sqlerrm<>'IDENTITY_NOT_CONFIGURED' then raise; end if; end;
  update account_identity_private.settings set enabled=true where singleton;
  result:=public.account_identity_service('prepare',uid,null,gen_random_uuid(),fields);
  if result->>'create_allowed'<>'true' then raise exception 'SESSION_CREATION_FAILED'; end if;
  row_id:=(result->'record'->>'id')::uuid;
  perform public.account_identity_service('attach',uid,row_id,null,jsonb_build_object('session_id',provider_id,'url','https://verify.didit.me/ar/session/fictional','workflow_id',workflow));
  perform set_config('account_identity_test.row',row_id::text,true);
  fields:=jsonb_build_object('session_id',provider_id,'workflow_id',workflow,'vendor_data',row_id,'state','approved','id_status','approved','liveness_status','approved');
  begin
    perform public.account_identity_service('apply',uid,row_id,null,fields);
    raise exception 'MISSING_FACE_CHECK_APPROVED';
  exception when raise_exception then if sqlerrm<>'INCOMPLETE_CHECKS' then raise; end if; end;
  begin
    perform public.account_identity_service('apply',uid,row_id,null,fields||jsonb_build_object('vendor_data',gen_random_uuid(),'face_status','approved'));
    raise exception 'WRONG_REQUEST_APPROVED';
  exception when raise_exception then if sqlerrm<>'INVALID_PROVIDER_RESPONSE' then raise; end if; end;
  result:=public.account_identity_service('apply',uid,row_id,null,fields||'{"state":"retry","reason":"capture_retry"}'::jsonb);
  if result->>'verified'<>'false' or result->'record'->>'state'<>'retry' then raise exception 'UNCERTAIN_CAPTURE_VERIFIED'; end if;
  result:=public.account_identity_service('apply',uid,row_id,null,fields||'{"state":"rejected","reason":"face_mismatch","face_status":"declined"}'::jsonb);
  if result->>'verified'<>'false' or result->'record'->>'state'<>'rejected' or result->'record'->>'url' is not null then raise exception 'MISMATCH_NOT_REJECTED'; end if;
  result:=public.account_identity_service('apply',uid,row_id,null,fields||'{"face_status":"approved"}'::jsonb);
  if result->'record'->>'state'<>'rejected' then raise exception 'TERMINAL_REJECTION_CHANGED'; end if;
  if (select is_verified from public.account_profiles where id=uid) then raise exception 'REJECTED_USER_VERIFIED'; end if;
  -- A fresh request can succeed; no site-admin approval is involved.
  fields:=jsonb_build_object('store','Fictional QA store','legal','Fictional QA name','phone','+966500000000','consent_version','identity-v1');
  result:=public.account_identity_service('prepare',uid,null,gen_random_uuid(),fields);row_id:=(result->'record'->>'id')::uuid;provider_id:=gen_random_uuid();
  perform public.account_identity_service('attach',uid,row_id,null,jsonb_build_object('session_id',provider_id,'url','https://verify.didit.me/ar/session/fictional2','workflow_id',workflow));
  fields:=jsonb_build_object('session_id',provider_id,'workflow_id',workflow,'vendor_data',row_id,'state','approved','id_status','approved','liveness_status','approved','face_status','approved');
  update public.account_profiles set banned=true where id=uid;
  begin
    perform public.account_identity_service('apply',uid,row_id,null,fields);
    raise exception 'BANNED_USER_VERIFIED';
  exception when raise_exception then if sqlerrm<>'ACCOUNT_BANNED' then raise; end if; end;
  update public.account_profiles set banned=false where id=uid;
  result:=public.account_identity_service('apply',uid,row_id,null,fields);
  if result->>'verified'<>'true' or result->'record'->>'state'<>'approved' then raise exception 'VALID_VERIFICATION_FAILED'; end if;
  if not exists(select 1 from public.account_profiles where id=uid and is_verified and role='seller') then raise exception 'SELLER_NOT_ACTIVATED'; end if;
  if not exists(select 1 from public.account_verifications where id=row_id and status='approved' and reviewed_by is null and verification_method='didit') then raise exception 'ADMIN_APPROVAL_REQUIRED'; end if;
  result:=public.account_identity_service('apply',uid,row_id,null,fields||'{"state":"rejected","face_status":"declined"}'::jsonb);
  if result->'record'->>'state'<>'approved' then raise exception 'DELAYED_EVENT_CHANGED_RESULT'; end if;
end;$tests$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('account_identity_test.buyer'),'role','authenticated')::text,true);
do $authorization$
begin
  if has_function_privilege('authenticated','public.account_identity_service(text,uuid,uuid,uuid,jsonb)','execute')
    or has_function_privilege('anon','public.account_identity_service(text,uuid,uuid,uuid,jsonb)','execute') then raise exception 'SERVICE_RPC_EXPOSED'; end if;
  if has_column_privilege('authenticated','public.account_profiles','is_verified','update') then raise exception 'SELF_VERIFICATION_ALLOWED'; end if;
  begin
    perform public.account_identity_service('apply',current_setting('account_identity_test.buyer')::uuid,current_setting('account_identity_test.row')::uuid,null,'{}');
    raise exception 'SELLER_CAN_FINALIZE';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from account_identity_private.sessions;
    raise exception 'PRIVATE_SESSION_LINKS_EXPOSED';
  exception when insufficient_privilege then null; end;
end;$authorization$;
reset role;
-- Exercise the old manual path as an unverified user while auto-only mode is enabled.
update public.account_profiles set is_verified=false,verified_at=null,role='buyer' where id=current_setting('account_identity_test.buyer')::uuid;
set local role authenticated;
do $manual_bypass$
begin
  begin
    perform public.account_verification_prepare(gen_random_uuid(),'Fictional QA store','Fictional QA name','+966500000000','image/jpeg');
    raise exception 'MANUAL_BYPASS_ALLOWED';
  exception when raise_exception then if sqlerrm<>'AUTOMATIC_VERIFICATION_REQUIRED' then raise; end if; end;
end;$manual_bypass$;
reset role;
rollback;
select 'Automatic identity database checks passed; fixtures rolled back' as result;
