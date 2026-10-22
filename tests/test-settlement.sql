begin;
select set_config('settlement_test.buyer',(select id::text from public.account_profiles where role='buyer' and not banned limit 1),true),
 set_config('settlement_test.seller',(select id::text from public.account_profiles where role='admin' and not banned limit 1),true),
 set_config('settlement_test.outsider',(select id::text from public.account_profiles where role='buyer' and not banned offset 1 limit 1),true),
 set_config('settlement_test.product','qa-settlement-'||gen_random_uuid()::text,true);
create temp table settlement_qa_fixture(label text primary key,item_id uuid,order_id uuid,request_id uuid default gen_random_uuid(),dispute_id uuid);
grant select,update on settlement_qa_fixture to authenticated;
insert into public.account_products(id,title,description,price,seller_id,active,listing_type) values
(current_setting('settlement_test.product'),'Settlement QA','Rollback only',25,current_setting('settlement_test.seller')::uuid,true,'service'),
(current_setting('settlement_test.product')||'-unowned','Unowned QA','Rollback only',25,null,true,'service');
do $$ declare fixture record; oid uuid; iid uuid; begin
 if current_setting('settlement_test.buyer') is null or current_setting('settlement_test.seller') is null or current_setting('settlement_test.outsider') is null then raise exception 'THREE_QA_ROLES_REQUIRED'; end if;
 for fixture in select * from (values ('not_due',false,false),('due',true,false),('expired',true,false),('refund',false,false),('seller',false,false),('no_owner',true,true)) v(label,due,unowned) loop
   insert into public.account_orders(user_id,request_id,total,created_at) values(current_setting('settlement_test.buyer')::uuid,gen_random_uuid(),50,clock_timestamp()-case when fixture.due then interval '13 hours' else interval '11 hours' end) returning id into oid;
   insert into public.account_order_items(order_id,product_id,title,unit_price,quantity) values(oid,current_setting('settlement_test.product')||case when fixture.unowned then '-unowned' else '' end,'Settlement QA',25,2) returning id into iid;
   insert into settlement_qa_fixture(label,item_id,order_id) values(fixture.label,iid,oid);
 end loop;
 if exists(select 1 from public.account_order_settlements s join settlement_qa_fixture f on f.item_id=s.order_item_id where s.amount<>50 or s.release_at<>s.purchased_at+interval '12 hours' or s.payment_mode<>'test') then raise exception 'SNAPSHOT_FAILED'; end if;
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('settlement_test.buyer'),true);
do $$ declare fixture record; result jsonb; begin
 if (select count(*) from public.account_order_settlements where order_item_id in(select item_id from settlement_qa_fixture))<>6 then raise exception 'BUYER_READ_FAILED'; end if;
 begin
  perform public.account_dispute_open((select item_id from settlement_qa_fixture where label='expired'),gen_random_uuid(),'Late dispute fixture');raise exception 'LATE_DISPUTE_ALLOWED';
 exception when raise_exception then if sqlerrm<>'DISPUTE_WINDOW_EXPIRED' then raise; end if; end;
 for fixture in select * from settlement_qa_fixture where label in ('refund','seller') loop
  result:=public.account_dispute_open(fixture.item_id,fixture.request_id,'Timely dispute fixture');
  update settlement_qa_fixture set dispute_id=(result->>'id')::uuid where label=fixture.label;
  if public.account_dispute_open(fixture.item_id,fixture.request_id,'Timely dispute fixture')->>'id'<>result->>'id' then raise exception 'DISPUTE_RETRY_FAILED'; end if;
 end loop;
 begin
  perform public.account_admin_dispute((select dispute_id from settlement_qa_fixture where label='refund'),'resolved_buyer','Unauthorized decision',gen_random_uuid());raise exception 'BUYER_DECISION_ALLOWED';
 exception when raise_exception then if sqlerrm<>'ADMIN_REQUIRED' then raise; end if; end;
 begin
  update public.account_order_settlements set state='released' where order_item_id=(select item_id from settlement_qa_fixture where label='not_due');raise exception 'DIRECT_WRITE_ALLOWED';
 exception when insufficient_privilege then null; end;
 begin
  perform account_settlement_private.release_due();raise exception 'WORKER_CALL_ALLOWED';
 exception when insufficient_privilege then null; end;
 if (public.account_test_settlements()->>'is_test')<>'true' then raise exception 'TEST_LABEL_MISSING'; end if;
end;$$;
reset role;
-- Move disputed fixtures past their deadline to prove time cannot release a dispute.
update public.account_order_settlements set purchased_at=purchased_at-interval '3 hours',release_at=release_at-interval '3 hours'
where order_item_id in(select item_id from settlement_qa_fixture where label in ('refund','seller'));
select account_settlement_private.release_due();
select account_settlement_private.release_due(); -- retry must be a no-op for these fixtures

do $$ begin
 if (select state from public.account_order_settlements where order_item_id=(select item_id from settlement_qa_fixture where label='not_due'))<>'held' then raise exception 'EARLY_RELEASE'; end if;
 if (select state from public.account_order_settlements where order_item_id=(select item_id from settlement_qa_fixture where label='due'))<>'released' then raise exception 'AUTOMATIC_RELEASE_FAILED'; end if;
 if (select state from public.account_order_settlements where order_item_id=(select item_id from settlement_qa_fixture where label='no_owner'))<>'needs_review' then raise exception 'UNASSIGNED_SELLER_RELEASED'; end if;
 if exists(select 1 from public.account_order_settlements s join settlement_qa_fixture f on f.item_id=s.order_item_id where f.label in('refund','seller') and s.state<>'disputed') then raise exception 'DISPUTED_RELEASED'; end if;
 if (select count(*) from account_settlement_private.events e join settlement_qa_fixture f on f.item_id=e.order_item_id where f.label='due' and e.new_state='released')<>1 then raise exception 'DOUBLE_RELEASE'; end if;
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('settlement_test.seller'),true);
do $$ declare did uuid; request uuid:=gen_random_uuid(); begin
 select dispute_id into did from settlement_qa_fixture where label='refund';
 begin
  perform public.account_admin_dispute(did,'closed','No winner fixture',gen_random_uuid());raise exception 'CLOSE_WITHOUT_WINNER_ALLOWED';
 exception when raise_exception then if sqlerrm<>'DISPUTE_WINNER_REQUIRED' then raise; end if; end;
 perform public.account_admin_dispute(did,'resolved_buyer','Refund fixture',request);
 perform public.account_admin_dispute(did,'resolved_buyer','Refund fixture',request);
 begin
  perform public.account_admin_dispute(did,'resolved_seller','Reverse result fixture',gen_random_uuid());raise exception 'DOUBLE_SETTLEMENT_ALLOWED';
 exception when raise_exception then if sqlerrm<>'SETTLEMENT_FINAL' then raise; end if; end;
 begin
  perform public.account_admin_dispute(did,'open','Reopen fixture',gen_random_uuid());raise exception 'REOPEN_AFTER_SETTLEMENT_ALLOWED';
 exception when raise_exception then if sqlerrm<>'SETTLEMENT_FINAL' then raise; end if; end;
 perform public.account_admin_dispute((select dispute_id from settlement_qa_fixture where label='seller'),'resolved_seller','Seller fixture',gen_random_uuid());
end;$$;
reset role;
do $$ begin
 if (select state from public.account_order_settlements where order_item_id=(select item_id from settlement_qa_fixture where label='refund'))<>'refunded' then raise exception 'BUYER_REFUND_FAILED'; end if;
 if (select state from public.account_order_settlements where order_item_id=(select item_id from settlement_qa_fixture where label='seller'))<>'released' then raise exception 'SELLER_RELEASE_FAILED'; end if;
 if (select count(*) from account_settlement_private.events e join settlement_qa_fixture f on f.item_id=e.order_item_id where f.label='refund' and e.new_state='refunded')<>1 then raise exception 'DOUBLE_REFUND'; end if;
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('settlement_test.outsider'),true);
do $$ begin
 if exists(select 1 from public.account_order_settlements where order_item_id in(select item_id from settlement_qa_fixture)) then raise exception 'OUTSIDER_CAN_READ'; end if;
 if exists(select 1 from jsonb_array_elements(public.account_test_settlements()->'settlements') s where s->>'order_item_id' in(select item_id::text from settlement_qa_fixture)) then raise exception 'RPC_OUTSIDER_CAN_READ'; end if;
end;$$;
set local role anon;
do $$ begin
 if has_function_privilege('anon','public.account_test_settlements()','execute') then raise exception 'ANON_RPC_EXECUTE'; end if;
 begin perform 1 from public.account_order_settlements;raise exception 'ANON_CAN_READ';exception when insufficient_privilege then null; end;
end;$$;
rollback;
