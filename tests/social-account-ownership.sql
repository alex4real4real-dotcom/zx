-- All fixtures, approvals and product changes are rolled back.
begin;
select set_config('bio_test.owner',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where p.role='admin' and not p.banned and u.email_confirmed_at is not null limit 1),true),
 set_config('bio_test.other',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where p.role<>'admin' and not p.banned and u.email_confirmed_at is not null limit 1),true),
 set_config('bio_test.product',gen_random_uuid()::text,true),set_config('bio_test.draft',gen_random_uuid()::text,true);
set local role authenticated;
do $$declare owner_id uuid:=current_setting('bio_test.owner')::uuid;other_id uuid:=current_setting('bio_test.other')::uuid;p text:=current_setting('bio_test.product');proof jsonb;
begin
 if owner_id is null or other_id is null then raise exception 'TEST_ROLES_REQUIRED';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 proof:=public.account_bio_start(p,'x','@qa_bio_owner');
 if proof->>'username'<>'qa_bio_owner' or proof->>'status'<>'issued' or proof->>'code'!~'^ACCT-[A-F0-9]{16}$' then raise exception 'BAD_CHALLENGE';end if;
 perform set_config('bio_test.proof',proof->>'id',true);perform set_config('bio_test.code',proof->>'code',true);
 if public.account_bio_start(p,'x','qa_bio_owner')->>'id'<>proof->>'id' then raise exception 'CHALLENGE_NOT_IDEMPOTENT';end if;
 begin perform public.account_seller_save_product(p,'qa_bio_owner',10,'x','QA','{"account_email":"qa@example.test","email_password":"dummy","account_username":"qa_bio_owner","account_password":"dummy"}',true);raise exception 'UNVERIFIED_PUBLISH_ALLOWED';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
 begin insert into public.account_products(id,title,price,listing_type,seller_id,active)values(p,'qa_bio_owner',10,'x',owner_id,true);raise exception 'DIRECT_INSERT_BYPASSED_PROOF';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
 begin perform * from account_bio_private.challenges;raise exception 'PRIVATE_PROOF_READABLE';exception when insufficient_privilege then null;end;
 begin perform public.account_bio_service('finish',owner_id,(proof->>'id')::uuid,true,'');raise exception 'CLIENT_CAN_SELF_APPROVE';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',other_id::text,true);
 if public.account_bio_status(p) is not null then raise exception 'CROSS_USER_PROOF_LEAK';end if;
 begin perform public.account_bio_review((proof->>'id')::uuid,true,proof->>'code',true,'');raise exception 'NON_ADMIN_APPROVED';exception when raise_exception then if sqlerrm<>'ADMIN_REQUIRED' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.account_seller_save_product(current_setting('bio_test.draft'),'qa_draft',10,'x','QA','{"account_email":"qa@example.test","email_password":"dummy","account_username":"qa_draft","account_password":"dummy"}',false);
 begin perform public.account_seller_set_visibility(current_setting('bio_test.draft'),true);raise exception 'VISIBILITY_BYPASSED_PROOF';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
end;$$;
set local role service_role;
do $$declare result jsonb;begin
 perform public.account_bio_service('claim',current_setting('bio_test.owner')::uuid,current_setting('bio_test.proof')::uuid);
 result:=public.account_bio_service('finish',current_setting('bio_test.owner')::uuid,current_setting('bio_test.proof')::uuid,false,'manual_review');
 if result->>'status'<>'pending' then raise exception 'FAILED_SCAN_APPROVED';end if;
end;$$;
set local role authenticated;
do $$declare p text:=current_setting('bio_test.product');owner_id uuid:=current_setting('bio_test.owner')::uuid;proof uuid:=current_setting('bio_test.proof')::uuid;credentials jsonb:='{"account_email":"qa@example.test","email_password":"dummy","account_username":"qa_bio_owner","account_password":"dummy"}';result jsonb;
begin
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 begin perform public.account_bio_review(proof,true,'wrong-code',true,'');raise exception 'WRONG_CODE_APPROVED';exception when raise_exception then if sqlerrm<>'BIO_CODE_MISMATCH' then raise;end if;end;
 begin perform public.account_bio_review(proof,true,current_setting('bio_test.code'),false,'');raise exception 'UNCHECKED_BIO_APPROVED';exception when raise_exception then if sqlerrm<>'BIO_CODE_MISMATCH' then raise;end if;end;
 perform public.account_bio_review(proof,true,current_setting('bio_test.code'),true,'Transactional fixture only');
 begin perform public.account_seller_save_product(gen_random_uuid()::text,'qa_bio_owner',10,'x','QA',credentials,true);raise exception 'PROOF_REUSED_FOR_ANOTHER_LISTING';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
 begin perform public.account_seller_save_product(p,'another_user',10,'x','QA',jsonb_set(credentials,'{account_username}','"another_user"'),true);raise exception 'PROOF_REUSED_FOR_ANOTHER_HANDLE';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
 begin perform public.account_seller_save_product(p,'qa_bio_owner',10,'instagram','QA',credentials,true);raise exception 'PROOF_REUSED_FOR_ANOTHER_PLATFORM';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
 begin perform public.account_seller_save_product(p,'qa_bio_owner',10,'x','QA',jsonb_set(credentials,'{account_username}','"different"'),true);raise exception 'DELIVERY_USERNAME_MISMATCH';exception when raise_exception then if sqlerrm<>'BIO_USERNAME_MISMATCH' then raise;end if;end;
 result:=public.account_seller_save_product(p,'qa_bio_owner',10,'x','QA',credentials,true);
 if result->>'active'<>'true' then raise exception 'VERIFIED_PUBLISH_FAILED';end if;
 perform public.account_seller_set_visibility(p,false);perform public.account_seller_set_visibility(p,true);
 begin insert into public.account_products(id,title,price,listing_type,seller_id,active)values(gen_random_uuid()::text,'qa_bio_owner',10,'x',current_setting('bio_test.other')::uuid,true);raise exception 'OTHER_SELLER_USED_PROOF';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
end;$$;
reset role;
-- An approved but unused code must still expire before publication.
insert into account_bio_private.challenges(user_id,product_id,platform,username,status,verified_at,expires_at)
 values(current_setting('bio_test.owner')::uuid,current_setting('bio_test.draft'),'x','qa_draft','approved',clock_timestamp()-interval '2 days',clock_timestamp()-interval '1 day');
set local role authenticated;
do $$begin
 perform set_config('request.jwt.claim.sub',current_setting('bio_test.owner'),true);
 begin perform public.account_seller_set_visibility(current_setting('bio_test.draft'),true);raise exception 'EXPIRED_PROOF_PUBLISHED';exception when raise_exception then if sqlerrm<>'BIO_VERIFICATION_REQUIRED' then raise;end if;end;
end;$$;
set local role anon;
do $$begin
 if has_function_privilege('anon','public.account_bio_start(text,text,text)','execute') or has_function_privilege('anon','public.account_bio_status(text)','execute') or has_function_privilege('authenticated','public.account_bio_service(text,uuid,uuid,boolean,text)','execute') then raise exception 'PROOF_RPC_EXPOSED';end if;
end;$$;
rollback;
select jsonb_build_object('ownership_bound_to_seller_listing_platform_username',true,'wrong_expired_missing_codes_blocked',true,'draft_visibility_and_direct_insert_protected',true,'client_self_approval_and_private_reads_denied',true,'admin_review_and_verified_publish',true,'all_test_changes_rolled_back',true) as checks;
