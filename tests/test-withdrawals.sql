begin;
select set_config('withdraw_test.buyer',(select id::text from public.account_profiles where role='buyer' and not banned limit 1),true),
 set_config('withdraw_test.seller',(select id::text from public.account_profiles where role='admin' and not banned limit 1),true),
 set_config('withdraw_test.product','qa-withdraw-'||gen_random_uuid()::text,true);
create temp table withdraw_qa(label text primary key,id uuid,key uuid default gen_random_uuid());grant select,insert,update on withdraw_qa to authenticated;
create function pg_temp.iban(body text) returns text language sql as $$ select 'SA'||lpad((98-mod((body||'281000')::numeric,97))::text,2,'0')||body;$$;
select set_config('withdraw_test.iban',pg_temp.iban('80'||lpad('987654321',18,'0')),true);
insert into public.account_products(id,title,description,price,seller_id,active,listing_type) values(current_setting('withdraw_test.product'),'Withdrawal QA','Rollback only',100,current_setting('withdraw_test.seller')::uuid,true,'service');
do $$ declare oid uuid; iid uuid; label text; begin
 foreach label in array array['released','held','disputed'] loop
  insert into public.account_orders(user_id,request_id,total,created_at) values(current_setting('withdraw_test.buyer')::uuid,gen_random_uuid(),100,clock_timestamp()-case when label='released' then interval '13 hours' else interval '1 hour' end) returning id into oid;
  insert into public.account_order_items(order_id,product_id,title,unit_price,quantity) values(oid,current_setting('withdraw_test.product'),'Withdrawal QA',100,1) returning id into iid;
  insert into withdraw_qa(label,id) values(label,iid);
 end loop;
 perform account_settlement_private.release_due();
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('withdraw_test.buyer'),true);
do $$ declare result jsonb; begin
 perform public.account_dispute_open((select id from withdraw_qa where label='disputed'),gen_random_uuid(),'QA open dispute');
 result:=public.account_add_bank(gen_random_uuid(),'QA bank','Fixture buyer',current_setting('withdraw_test.iban'));
 insert into withdraw_qa(label,id) values('buyer_bank',(result->>'id')::uuid);
 begin perform public.account_request_withdrawal(gen_random_uuid(),(result->>'id')::uuid,1,'Zero balance test');raise exception 'ZERO_BALANCE_WITHDRAW_ALLOWED';exception when raise_exception then if sqlerrm<>'INSUFFICIENT_BALANCE' then raise; end if;end;
 begin perform public.account_admin_withdrawals(0,'');raise exception 'BUYER_ADMIN_READ_ALLOWED';exception when raise_exception then if sqlerrm<>'ADMIN_REQUIRED' then raise; end if;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('withdraw_test.seller'),true);
do $$ declare result jsonb; snapshot jsonb; nonce uuid:=gen_random_uuid(); bank uuid; request uuid; begin
 result:=public.account_add_bank(nonce,'QA bank','Fixture seller',lower(current_setting('withdraw_test.iban')));
 bank:=(result->>'id')::uuid;insert into withdraw_qa(label,id) values('seller_bank',bank);
 if public.account_add_bank(nonce,'QA bank','Fixture seller',current_setting('withdraw_test.iban'))->>'id'<>bank::text then raise exception 'BANK_RETRY_FAILED';end if;
 begin perform public.account_add_bank(nonce,'Different bank','Fixture seller',current_setting('withdraw_test.iban'));raise exception 'BANK_KEY_REUSED';exception when raise_exception then if sqlerrm<>'REQUEST_ID_REUSED' then raise;end if;end;
 begin perform public.account_add_bank(gen_random_uuid(),'QA bank','Fixture seller','SA0000000000000000000000');raise exception 'BAD_IBAN_ACCEPTED';exception when raise_exception then if sqlerrm<>'INVALID_BANK_ACCOUNT' then raise;end if;end;
 snapshot:=public.account_withdrawal_dashboard(0);
 if (snapshot->'balances'->>'available')::numeric<>100 or (snapshot->'balances'->>'earned')::numeric<>100 then raise exception 'HELD_OR_DISPUTED_COUNTED_AS_AVAILABLE';end if;
 if snapshot::text like '%'||current_setting('withdraw_test.iban')||'%' or (snapshot->'bank_accounts'->0) ? 'iban' then raise exception 'RAW_IBAN_EXPOSED';end if;
 begin perform public.account_request_withdrawal(gen_random_uuid(),(select id from withdraw_qa where label='buyer_bank'),10,'Cross user bank test');raise exception 'CROSS_BANK_WITHDRAW_ALLOWED';exception when raise_exception then if sqlerrm<>'BANK_ACCOUNT_REQUIRED' then raise;end if;end;
 nonce:=gen_random_uuid();result:=public.account_request_withdrawal(nonce,bank,60,'Reserve sixty');request:=(result->>'id')::uuid;insert into withdraw_qa(label,id,key) values('sixty',request,nonce);
 if public.account_request_withdrawal(nonce,bank,60,'Reserve sixty')->>'id'<>request::text then raise exception 'WITHDRAW_RETRY_FAILED';end if;
 begin perform public.account_request_withdrawal(nonce,bank,61,'Reserve sixty');raise exception 'WITHDRAW_KEY_REUSED';exception when raise_exception then if sqlerrm<>'REQUEST_ID_REUSED' then raise;end if;end;
 if (public.account_withdrawal_dashboard(0)->'balances'->>'available')::numeric<>40 then raise exception 'RESERVATION_NOT_SUBTRACTED';end if;
 begin perform public.account_request_withdrawal(gen_random_uuid(),bank,41,'Overspend reserved funds');raise exception 'OVERDRAFT_ALLOWED';exception when raise_exception then if sqlerrm<>'INSUFFICIENT_BALANCE' then raise;end if;end;
 result:=public.account_request_withdrawal(gen_random_uuid(),bank,40,'Reserve forty');insert into withdraw_qa(label,id) values('forty',(result->>'id')::uuid);
 if (public.account_withdrawal_dashboard(0)->'balances'->>'available')::numeric<>0 then raise exception 'SECOND_RESERVATION_FAILED';end if;
 foreach nonce in array array[gen_random_uuid()] loop
  perform public.account_admin_withdrawal_review((select id from withdraw_qa where label='sixty'),false,'QA rejection',nonce);
  perform public.account_admin_withdrawal_review((select id from withdraw_qa where label='sixty'),false,'QA rejection',nonce);
 end loop;
 if (public.account_withdrawal_dashboard(0)->'balances'->>'available')::numeric<>60 then raise exception 'REJECTION_DID_NOT_RELEASE_ONCE';end if;
 begin perform public.account_admin_withdrawal_review((select id from withdraw_qa where label='sixty'),true,'Change rejected outcome',gen_random_uuid());raise exception 'REVIEW_REVERSAL_ALLOWED';exception when raise_exception then if sqlerrm<>'ALREADY_REVIEWED' then raise;end if;end;
 perform public.account_admin_withdrawal_review((select id from withdraw_qa where label='forty'),true,'Test only approval',gen_random_uuid());
 snapshot:=public.account_withdrawal_dashboard(0);
 if (snapshot->'balances'->>'available')::numeric<>60 or (snapshot->'balances'->>'approved')::numeric<>40 or (snapshot->'balances'->>'pending')::numeric<>0 then raise exception 'APPROVAL_BALANCE_INCORRECT';end if;
 perform public.account_request_withdrawal(gen_random_uuid(),bank,60,'Spend restored reservation');
 begin perform public.account_request_withdrawal(gen_random_uuid(),bank,0.001,'Fraction test');raise exception 'FRACTION_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_WITHDRAWAL_AMOUNT' then raise;end if;end;
 begin perform public.account_request_withdrawal(gen_random_uuid(),bank,'NaN'::numeric,'NaN test');raise exception 'NAN_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_WITHDRAWAL_AMOUNT' then raise;end if;end;
 begin perform public.account_request_withdrawal(gen_random_uuid(),bank,'Infinity'::numeric,'Infinity test');raise exception 'INFINITY_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_WITHDRAWAL_AMOUNT' then raise;end if;end;
 begin perform public.account_request_withdrawal(gen_random_uuid(),bank,-1,'Negative test');raise exception 'NEGATIVE_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_WITHDRAWAL_AMOUNT' then raise;end if;end;
 if (public.account_withdrawal_dashboard(0)->'balances'->>'available')::numeric<>0 then raise exception 'FINAL_BALANCE_INCORRECT';end if;
 begin perform 1 from account_withdrawal_private.bank_accounts;raise exception 'DIRECT_BANK_READ_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform account_withdrawal_private.balances(current_setting('withdraw_test.buyer')::uuid);raise exception 'OTHER_WALLET_READ_ALLOWED';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('withdraw_test.buyer'),true);
do $$ declare snapshot jsonb;begin
 snapshot:=public.account_withdrawal_dashboard(0);
 if jsonb_array_length(snapshot->'requests')<>0 or jsonb_array_length(snapshot->'bank_accounts')<>1 or (snapshot->'balances'->>'available')::numeric<>0 then raise exception 'CROSS_USER_DATA_LEAK';end if;
 begin perform public.account_admin_withdrawal_review((select id from withdraw_qa where label='forty'),false,'Unauthorized review',gen_random_uuid());raise exception 'USER_REVIEW_ALLOWED';exception when raise_exception then if sqlerrm<>'ADMIN_REQUIRED' then raise;end if;end;
end;$$;
set local role anon;
do $$ begin
 if has_function_privilege('anon','public.account_withdrawal_dashboard(integer)','execute') or has_function_privilege('anon','public.account_request_withdrawal(uuid,uuid,numeric,text)','execute') or has_function_privilege('anon','public.account_add_bank(uuid,text,text,text)','execute') then raise exception 'ANON_WITHDRAWAL_ACCESS';end if;
end;$$;
rollback;
