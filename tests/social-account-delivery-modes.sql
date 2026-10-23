begin;
select set_config('delivery_modes.seller',(select id::text from public.account_profiles where not banned order by created_at limit 1),true),
set_config('delivery_modes.buyer',(select id::text from public.account_profiles where not banned order by created_at offset 1 limit 1),true),
set_config('delivery_modes.social',gen_random_uuid()::text,true),set_config('delivery_modes.service',gen_random_uuid()::text,true);
update public.account_profiles set is_verified=true where id=current_setting('delivery_modes.seller')::uuid;
insert into public.account_products(id,title,description,price,seller_id,active,listing_type)values
(current_setting('delivery_modes.social'),'No opt-in dummy','Rollback only',50,current_setting('delivery_modes.seller')::uuid,true,'instagram'),
(current_setting('delivery_modes.service'),'Repeatable service','Rollback only',10,current_setting('delivery_modes.seller')::uuid,true,'service');
insert into account_seller_private.product_secrets(product_id,account_email,email_password,account_username,account_password,test_delivery)values(current_setting('delivery_modes.social'),'dummy@example.invalid','never-deliver-mail','never-deliver-user','never-deliver-account',false);
insert into public.account_cart(user_id,product_id,quantity)values(current_setting('delivery_modes.buyer')::uuid,current_setting('delivery_modes.social'),1),(current_setting('delivery_modes.buyer')::uuid,current_setting('delivery_modes.service'),2);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('delivery_modes.buyer'),true);
do $$declare result jsonb;item uuid;begin
 result:=public.account_place_test_order(gen_random_uuid());
 select id into item from public.account_order_items where order_id=(result->>'order_id')::uuid and product_id=current_setting('delivery_modes.social');
 if public.account_order_delivery(item)->>'state'<>'not_ready' or public.account_order_delivery(item)::text like '%never-deliver%' then raise exception 'NON_OPTED_DETAILS_LEAKED';end if;
end;$$;
reset role;
do $$begin
 if not (select active from public.account_products where id=current_setting('delivery_modes.service')) then raise exception 'SERVICE_HIDDEN';end if;
 if exists(select 1 from account_seller_private.product_sales where product_id=current_setting('delivery_modes.service')) then raise exception 'SERVICE_MARKED_SOLD';end if;
end;$$;
-- The service remains purchasable; seller/buyer eligibility checks still apply.
insert into public.account_cart(user_id,product_id,quantity)values(current_setting('delivery_modes.buyer')::uuid,current_setting('delivery_modes.service'),1);
update public.account_profiles set is_verified=false where id=current_setting('delivery_modes.seller')::uuid;
set local role authenticated;
do $$begin
 begin perform public.account_place_test_order(gen_random_uuid());raise exception 'UNVERIFIED_SELLER_ALLOWED';exception when raise_exception then if sqlerrm<>'PRODUCT_UNAVAILABLE' then raise;end if;end;
end;$$;
reset role;
update public.account_profiles set is_verified=true,banned=true where id=current_setting('delivery_modes.seller')::uuid;
set local role authenticated;
do $$begin
 begin perform public.account_place_test_order(gen_random_uuid());raise exception 'BANNED_SELLER_ALLOWED';exception when raise_exception then if sqlerrm<>'PRODUCT_UNAVAILABLE' then raise;end if;end;
end;$$;
reset role;
update public.account_profiles set banned=false where id=current_setting('delivery_modes.seller')::uuid;
update public.account_profiles set banned=true where id=current_setting('delivery_modes.buyer')::uuid;
set local role authenticated;
do $$begin
 begin perform public.account_place_test_order(gen_random_uuid());raise exception 'BANNED_BUYER_ALLOWED';exception when raise_exception then if sqlerrm<>'ACCOUNT_BANNED' then raise;end if;end;
end;$$;
reset role;
update public.account_profiles set banned=false where id=current_setting('delivery_modes.buyer')::uuid;
set local role authenticated;
select public.account_place_test_order(gen_random_uuid())->>'success' as repeatable_service;
rollback;
