begin;
select set_config('account_test.owner',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where p.role='admin' and not p.banned and u.email_confirmed_at is not null limit 1),true),
       set_config('account_test.buyer',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where p.role='buyer' and not p.banned and not p.is_verified and u.email_confirmed_at is not null limit 1),true),
       set_config('account_test.product',gen_random_uuid()::text,true);
set local role authenticated;
do $tests$
declare owner_id uuid:=current_setting('account_test.owner')::uuid; buyer_id uuid:=current_setting('account_test.buyer')::uuid;
  product_id text:=current_setting('account_test.product'); draft_id text:=gen_random_uuid()::text; record jsonb;
begin
  if owner_id is null or buyer_id is null then raise exception 'TWO_TEST_ROLES_REQUIRED'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  record:=public.account_seller_save_product(product_id,'qa_fixture',25.50,'x','QA transaction, rolled back',
    '{"account_email":"fixture@example.test","email_password":"fictional-mail-password","account_username":"qa_fixture","account_password":"fictional-account-password"}'::jsonb,true);
  if record->>'seller_id'<>owner_id::text or record->>'active'<>'true' then raise exception 'PUBLISH_FAILED'; end if;
  if record ? 'credentials' or record ? 'account_password' then raise exception 'PUBLIC_RESPONSE_LEAK'; end if;
  record:=public.account_seller_read_product(product_id);
  if record->'credentials'->>'account_password'<>'fictional-account-password' then raise exception 'PRIVATE_ROUNDTRIP_FAILED'; end if;
  begin
    perform 1 from account_seller_private.product_secrets;
    raise exception 'DIRECT_PRIVATE_READ_ALLOWED';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',buyer_id::text,true);
  begin
    perform public.account_seller_read_product(product_id);
    raise exception 'CROSS_SELLER_READ_ALLOWED';
  exception when raise_exception then if sqlerrm<>'PRODUCT_NOT_FOUND' then raise; end if; end;
  begin
    perform public.account_seller_set_visibility(product_id,false);
    raise exception 'CROSS_SELLER_WRITE_ALLOWED';
  exception when raise_exception then if sqlerrm<>'PRODUCT_NOT_FOUND' then raise; end if; end;
  begin
    perform public.account_seller_save_product(draft_id,'QA service',12,'service','QA', '{}'::jsonb,true);
    raise exception 'UNVERIFIED_PUBLISH_ALLOWED';
  exception when raise_exception then if sqlerrm<>'SELLER_VERIFICATION_REQUIRED' then raise; end if; end;
  record:=public.account_seller_save_product(draft_id,'QA service draft',12,'service','QA','{}'::jsonb,false);
  if record->>'active'<>'false' or record->>'seller_id'<>buyer_id::text then raise exception 'DRAFT_SAVE_FAILED'; end if;
  if not exists(select 1 from public.account_products where id=draft_id) then raise exception 'OWNER_CANNOT_READ_DRAFT'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  record:=public.account_seller_save_product(product_id,'QA updated game',40,'game','Updated','{}'::jsonb,true);
  record:=public.account_seller_read_product(product_id);
  if record->'credentials'<>'{}'::jsonb or record->'product'->>'listing_type'<>'game' then raise exception 'TYPE_CHANGE_RETAINS_SECRETS'; end if;
  perform public.account_seller_set_visibility(product_id,false);
  record:=public.account_seller_read_product(product_id);
  if record->'product'->>'active'<>'false' then raise exception 'HIDE_FAILED'; end if;
  perform public.account_seller_set_visibility(product_id,true);
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.account_seller_read_product(product_id);
    raise exception 'MISSING_IDENTITY_ALLOWED';
  exception when raise_exception then if sqlerrm<>'AUTH_REQUIRED' then raise; end if; end;
end;$tests$;
set local role anon;
do $anonymous$
begin
  if has_function_privilege('anon','public.account_seller_read_product(text)','execute')
    or has_function_privilege('anon','public.account_seller_save_product(text,text,numeric,text,text,jsonb,boolean)','execute')
    or has_function_privilege('anon','public.account_seller_set_visibility(text,boolean)','execute') then raise exception 'ANONYMOUS_RPC_ALLOWED'; end if;
  if exists(select 1 from public.account_products where title='QA service draft') then raise exception 'DRAFT_PUBLICLY_VISIBLE'; end if;
  if not exists(select 1 from public.account_products where id=current_setting('account_test.product') and title='QA updated game') then raise exception 'CATALOG_PUBLISH_FAILED'; end if;
end;$anonymous$;
rollback;
select jsonb_build_object('publish_edit_hide',true,'private_details_roundtrip',true,'cross_seller_access_denied',true,'unverified_draft_only',true,'anonymous_draft_and_rpc_denied',true,'test_data_rolled_back',true) as checks;
