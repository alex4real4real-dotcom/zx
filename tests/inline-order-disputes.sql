begin;
select set_config('inline_test.buyer',(select id::text from public.account_profiles where role='buyer' and not banned limit 1),true),
 set_config('inline_test.seller',(select id::text from public.account_profiles where role='admin' and not banned limit 1),true),
 set_config('inline_test.outsider',(select id::text from public.account_profiles where role='buyer' and not banned offset 1 limit 1),true),
 set_config('inline_test.product','qa-inline-'||gen_random_uuid()::text,true);
create temp table inline_qa_fixture(label text primary key,item_id uuid,order_id uuid,open_key uuid default gen_random_uuid(),close_key uuid default gen_random_uuid(),dispute_id uuid);
grant select,update on inline_qa_fixture to authenticated;
insert into public.account_products(id,title,description,price,seller_id,active,listing_type) values
(current_setting('inline_test.product'),'Inline QA','Rollback only',25,current_setting('inline_test.seller')::uuid,true,'service'),
(current_setting('inline_test.product')||'-other','Other seller QA','Rollback only',9,current_setting('inline_test.outsider')::uuid,true,'service');
do $$ declare name text; oid uuid; iid uuid; begin
 if current_setting('inline_test.buyer') is null or current_setting('inline_test.seller') is null or current_setting('inline_test.outsider') is null then raise exception 'THREE_QA_ROLES_REQUIRED'; end if;
 foreach name in array array['refund','seller','legacy','expired'] loop
  insert into public.account_orders(user_id,request_id,total,created_at) values(current_setting('inline_test.buyer')::uuid,gen_random_uuid(),50,clock_timestamp()-case when name='expired' then interval '13 hours' else interval '1 hour' end) returning id into oid;
  insert into public.account_order_items(order_id,product_id,title,unit_price,quantity) values(oid,current_setting('inline_test.product'),'Inline QA',25,2) returning id into iid;
  insert into inline_qa_fixture(label,item_id,order_id) values(name,iid,oid);
 end loop;
 select order_id into oid from inline_qa_fixture where label='refund';
 insert into public.account_order_items(order_id,product_id,title,unit_price,quantity) values(oid,current_setting('inline_test.product'),'Sibling QA',25,1) returning id into iid;
 insert into inline_qa_fixture(label,item_id,order_id) values('sibling',iid,oid);
 insert into public.account_order_items(order_id,product_id,title,unit_price,quantity) values(oid,current_setting('inline_test.product')||'-other','Private other seller QA',9,1) returning id into iid;
 insert into inline_qa_fixture(label,item_id,order_id) values('other_seller',iid,oid);
 -- Simulate a pre-policy item without touching any existing orders.
 delete from account_settlement_private.events where order_item_id=(select item_id from inline_qa_fixture where label='legacy');
 delete from public.account_order_settlements where order_item_id=(select item_id from inline_qa_fixture where label='legacy');
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('inline_test.buyer'),true);
do $$ declare f record; result jsonb; begin
 for f in select * from inline_qa_fixture where label in('refund','seller','legacy') loop
  result:=public.account_dispute_open(f.item_id,f.open_key,'Inline dispute test');
  update inline_qa_fixture set dispute_id=(result->>'id')::uuid where label=f.label;
 end loop;
 begin
  perform public.account_dispute_open((select item_id from inline_qa_fixture where label='expired'),gen_random_uuid(),'Expired dispute test');raise exception 'EXPIRED_ALLOWED';
 exception when raise_exception then if sqlerrm<>'DISPUTE_WINDOW_EXPIRED' then raise; end if; end;
 begin
  perform public.account_dispute_party_close((select dispute_id from inline_qa_fixture where label='seller'),(select open_key from inline_qa_fixture where label='seller'));raise exception 'REUSED_CHAT_KEY_ALLOWED';
 exception when raise_exception then if sqlerrm<>'REQUEST_ID_REUSED' then raise; end if; end;
 select * into f from inline_qa_fixture where label='seller';
 result:=public.account_dispute_party_close(f.dispute_id,f.close_key);
 if result->>'status'<>'resolved_seller' or result->>'is_test'<>'true' then raise exception 'BUYER_DID_NOT_AWARD_SELLER'; end if;
 if public.account_dispute_party_close(f.dispute_id,f.close_key)->>'status'<>'resolved_seller' then raise exception 'BUYER_CLOSE_RETRY_FAILED'; end if;
 begin perform public.account_dispute_reply(f.dispute_id,gen_random_uuid(),'Late reply test');raise exception 'REPLY_AFTER_CLOSE';exception when raise_exception then if sqlerrm<>'DISPUTE_CLOSED' then raise; end if;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('inline_test.outsider'),true);
do $$ declare f record; rows jsonb; begin
 select * into f from inline_qa_fixture where label='refund';
 begin perform public.account_dispute_party_close(f.dispute_id,gen_random_uuid());raise exception 'OUTSIDER_CLOSED';exception when raise_exception then if sqlerrm<>'RECORD_NOT_FOUND' then raise; end if;end;
 rows:=public.account_seller_orders(0);
 if exists(select 1 from jsonb_array_elements(rows) o cross join lateral jsonb_array_elements(o->'items') i where i->>'id' in(select item_id::text from inline_qa_fixture where label<>'other_seller')) then raise exception 'CROSS_SELLER_ITEMS_LEAKED'; end if;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('inline_test.seller'),true);
do $$ declare f record; result jsonb; rows jsonb; begin
 for f in select * from inline_qa_fixture where label in('refund','legacy') loop
  result:=public.account_dispute_party_close(f.dispute_id,f.close_key);
  if result->>'status'<>'resolved_buyer' then raise exception 'SELLER_DID_NOT_AWARD_BUYER'; end if;
  perform public.account_dispute_party_close(f.dispute_id,f.close_key);
 end loop;
 for f in select * from inline_qa_fixture where label in('refund','seller','legacy') loop
  begin perform public.account_dispute_party_close(f.dispute_id,gen_random_uuid());raise exception 'SECOND_CLOSE_ALLOWED';exception when raise_exception then if sqlerrm<>'DISPUTE_CLOSED' then raise; end if;end;
  begin perform public.account_admin_dispute(f.dispute_id,'open','Reopen QA',gen_random_uuid());raise exception 'ADMIN_REOPEN_ALLOWED';exception when raise_exception then if sqlerrm<>'SETTLEMENT_FINAL' then raise; end if;end;
  begin perform public.account_admin_dispute(f.dispute_id,case when f.label='seller' then 'resolved_buyer' else 'resolved_seller' end,'Reverse QA',gen_random_uuid());raise exception 'ADMIN_REVERSE_ALLOWED';exception when raise_exception then if sqlerrm<>'SETTLEMENT_FINAL' then raise; end if;end;
 end loop;
 rows:=public.account_seller_orders(0);
 if exists(select 1 from jsonb_array_elements(rows) o cross join lateral jsonb_array_elements(o->'items') i where i->>'id'=(select item_id::text from inline_qa_fixture where label='other_seller')) then raise exception 'MULTI_SELLER_ORDER_LEAKED'; end if;
 if (select count(*) from jsonb_array_elements(rows) o cross join lateral jsonb_array_elements(o->'items') i where i->>'id' in(select item_id::text from inline_qa_fixture where label<>'other_seller'))<>5 then raise exception 'SELLER_OWN_ITEMS_MISSING'; end if;
 if exists(select 1 from jsonb_array_elements(rows) o where o ? 'email' or o ? 'buyer_email' or o ? 'request_id') then raise exception 'BUYER_PRIVATE_FIELDS_LEAKED'; end if;
 if has_function_privilege('authenticated','account_settlement_private.release_due()','execute') then raise exception 'WORKER_ACCESS_WIDENED'; end if;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('inline_test.buyer'),true);
do $$ declare f record; begin
 for f in select * from inline_qa_fixture where label in('refund','seller','legacy') loop
  begin perform public.account_dispute_open(f.item_id,gen_random_uuid(),'Reopen dispute QA');raise exception 'NEW_DISPUTE_AFTER_CLOSE';exception when raise_exception then if sqlerrm<>'DISPUTE_EXISTS' then raise; end if;end;
 end loop;
end;$$;
reset role;
do $$ begin
 if (select state from public.account_order_settlements where order_item_id=(select item_id from inline_qa_fixture where label='refund'))<>'refunded' then raise exception 'SELLER_CLOSE_REFUND_FAILED'; end if;
 if (select state from public.account_order_settlements where order_item_id=(select item_id from inline_qa_fixture where label='seller'))<>'released' then raise exception 'BUYER_CLOSE_RELEASE_FAILED'; end if;
 if (select state from public.account_order_settlements where order_item_id=(select item_id from inline_qa_fixture where label='sibling'))<>'held' then raise exception 'SIBLING_ITEM_AFFECTED'; end if;
 if (select count(*) from account_settlement_private.events where order_item_id=(select item_id from inline_qa_fixture where label='refund') and new_state='refunded')<>1 then raise exception 'DOUBLE_REFUND'; end if;
 if (select count(*) from account_settlement_private.events where order_item_id=(select item_id from inline_qa_fixture where label='seller') and new_state='released')<>1 then raise exception 'DOUBLE_PAYOUT'; end if;
end;$$;
set local role anon;
do $$ begin
 if has_function_privilege('anon','public.account_dispute_party_close(uuid,uuid)','execute') or has_function_privilege('anon','public.account_seller_orders(integer)','execute') then raise exception 'ANON_RPC_ACCESS'; end if;
end;$$;
rollback;
