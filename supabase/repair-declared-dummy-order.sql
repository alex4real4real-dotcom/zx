-- Apply only after explicit approval for the user's pictured fictitious order.
-- The user identified order prefix c089527e, listing dddf, and declared all its data fictitious.
do $$declare item public.account_order_items;buyer_order public.account_orders;payload jsonb;matches integer;
begin
 select count(*) into matches from public.account_order_items i join public.account_orders o on o.id=i.order_id where o.id::text like 'c089527e%' and i.title='dddf' and o.payment_mode='test';
 if matches<>1 then raise exception 'DUMMY_ORDER_NOT_UNIQUE';end if;
 select i.* into item from public.account_order_items i join public.account_orders o on o.id=i.order_id where o.id::text like 'c089527e%' and i.title='dddf' and o.payment_mode='test';
 select * into buyer_order from public.account_orders where id=item.order_id;
 perform 1 from public.account_products where id=item.product_id and listing_type in('x','instagram','snapchat','tiktok','facebook','youtube') for update;
 if not found then raise exception 'DUMMY_PRODUCT_UNAVAILABLE';end if;
 update account_seller_private.product_secrets set test_delivery=true where product_id=item.product_id;
 select jsonb_build_object('account_email',account_email,'email_password',email_password,'account_username',account_username,'account_password',account_password) into payload from account_seller_private.product_secrets where product_id=item.product_id and test_delivery;
 if payload is null then raise exception 'DUMMY_DETAILS_MISSING';end if;
 if exists(select 1 from account_seller_private.product_sales where product_id=item.product_id and order_item_id<>item.id) then raise exception 'DIFFERENT_SALE_REQUIRES_REVIEW';end if;
 insert into account_seller_private.product_sales(product_id,order_item_id,sold_at,test_delivery_data)values(item.product_id,item.id,buyer_order.created_at,payload) on conflict(product_id)do update set test_delivery_data=excluded.test_delivery_data where product_sales.order_item_id=excluded.order_item_id;
 update public.account_products set active=false,sold_at=buyer_order.created_at where id=item.product_id;
end;$$;
