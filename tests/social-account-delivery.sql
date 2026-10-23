-- Execute only after the two social delivery migrations; all fixtures roll back.
begin;
select set_config('delivery_qa.seller',(select id::text from public.account_profiles where not banned order by created_at limit 1),true),
 set_config('delivery_qa.buyer',(select id::text from public.account_profiles where not banned order by created_at offset 1 limit 1),true),
 set_config('delivery_qa.product',gen_random_uuid()::text,true),set_config('delivery_qa.item',gen_random_uuid()::text,true),set_config('delivery_qa.order',gen_random_uuid()::text,true),set_config('delivery_qa.nonce',gen_random_uuid()::text,true);
update public.account_profiles set is_verified=true where id=current_setting('delivery_qa.seller')::uuid;
insert into public.account_products(id,title,description,price,seller_id,active,listing_type)values(current_setting('delivery_qa.product'),'Dummy Instagram','Rollback only',50,current_setting('delivery_qa.seller')::uuid,true,'instagram');
insert into account_seller_private.product_secrets(product_id,account_email,email_password,account_username,account_password,test_delivery)values(current_setting('delivery_qa.product'),'dummy@example.invalid','dummy-mail','dummy-user','dummy-account',true);
insert into public.account_cart(user_id,product_id,quantity) values(current_setting('delivery_qa.buyer')::uuid,current_setting('delivery_qa.product'),1);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('delivery_qa.buyer'),true);
do $$declare result jsonb;oid uuid;item uuid;begin
 result:=public.account_place_test_order(current_setting('delivery_qa.nonce')::uuid);oid:=(result->>'order_id')::uuid;
 select id into item from public.account_order_items where order_id=oid;
 perform set_config('delivery_qa.item',item::text,true);
 if public.account_order_delivery(item)->'credentials'->>'account_username'<>'dummy-user' then raise exception 'DUMMY_DELIVERY_MISSING';end if;
 if (public.account_place_test_order(current_setting('delivery_qa.nonce')::uuid)->>'order_id')::uuid<>oid then raise exception 'IDEMPOTENT_CHECKOUT_FAILED';end if;
end;$$;
reset role;
do $$declare oid uuid;begin
 if (select active from public.account_products where id=current_setting('delivery_qa.product')) then raise exception 'SOLD_STILL_VISIBLE';end if;
 if not exists(select 1 from public.account_orders where user_id=current_setting('delivery_qa.buyer')::uuid) then raise exception 'ORDER_HISTORY_MISSING';end if;
 begin update public.account_products set active=true where id=current_setting('delivery_qa.product');raise exception 'REPUBLISH_ALLOWED';exception when raise_exception then if sqlerrm<>'PRODUCT_SOLD' then raise;end if;end;
 insert into public.account_orders(user_id,request_id,total)values(current_setting('delivery_qa.seller')::uuid,gen_random_uuid(),50) returning id into oid;
 begin insert into public.account_order_items(order_id,product_id,title,unit_price,quantity)values(oid,current_setting('delivery_qa.product'),'Second buyer',50,1);raise exception 'SECOND_PURCHASE_ALLOWED';exception when raise_exception then if sqlerrm<>'PRODUCT_SOLD' then raise;end if;end;
 -- Editing original credentials cannot replace a purchased dummy snapshot.
 update account_seller_private.product_secrets set account_username='changed-after-sale' where product_id=current_setting('delivery_qa.product');
end;$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('delivery_qa.buyer'),true);
do $$begin
 if public.account_order_delivery(current_setting('delivery_qa.item')::uuid)->'credentials'->>'account_username'<>'dummy-user' then raise exception 'SNAPSHOT_CHANGED';end if;
 begin perform 1 from account_seller_private.product_sales;raise exception 'DIRECT_SECRET_READ_ALLOWED';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('delivery_qa.seller'),true);
do $$begin
 begin perform public.account_order_delivery(current_setting('delivery_qa.item')::uuid);raise exception 'OTHER_BUYER_READ_ALLOWED';exception when raise_exception then if sqlerrm<>'DELIVERY_FORBIDDEN' then raise;end if;end;
end;$$;
set local role anon;
do $$begin if has_function_privilege('anon','public.account_order_delivery(uuid)','execute') then raise exception 'ANON_DELIVERY_ALLOWED';end if;end;$$;
rollback;
