CREATE OR REPLACE FUNCTION public.account_place_test_order(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); blocked boolean; oid uuid; amount numeric; rows_json jsonb;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  select banned into blocked from public.account_profiles where id=uid for update;
  if not found then raise exception 'PROFILE_NOT_READY'; end if;
  if blocked then raise exception 'ACCOUNT_BANNED'; end if;
  select id,total into oid,amount from public.account_orders where user_id=uid and request_id=p_request_id;
  if found then return jsonb_build_object('success',true,'order_id',oid,'total',amount,'is_test',true); end if;
  if not exists(select 1 from public.account_cart where user_id=uid) then raise exception 'CART_EMPTY'; end if;
  perform p.id from public.account_products p join public.account_cart c on c.product_id=p.id
    where c.user_id=uid order by p.id for update of p;
  if exists(select 1 from public.account_cart c join public.account_products p on p.id=c.product_id
    where c.user_id=uid and not p.active) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  -- Preserve buyer authentication/ban checks above and require an eligible seller.
  if exists(select 1 from public.account_cart c
    left join public.account_products p on p.id=c.product_id
    left join public.account_profiles seller on seller.id=p.seller_id
    where c.user_id=uid and (p.id is null or p.ban_hidden or p.sold_at is not null
      or not coalesce(seller.is_verified,false) or coalesce(seller.banned,true)))
    then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if exists(select 1 from public.account_cart c join public.account_products p on p.id=c.product_id
    where c.user_id=uid and p.listing_type not in('service','game') and c.quantity<>1)
    then raise exception 'INVALID_QUANTITY'; end if;
  select sum(c.quantity*p.price),jsonb_agg(jsonb_build_object('product_id',p.id,'title',p.title,'price',p.price,'quantity',c.quantity))
    into amount,rows_json from public.account_cart c join public.account_products p on p.id=c.product_id where c.user_id=uid;
  insert into public.account_orders(user_id,request_id,total) values(uid,p_request_id,amount) returning id into oid;
  insert into public.account_order_items(order_id,product_id,title,unit_price,quantity)
    select oid,item->>'product_id',item->>'title',(item->>'price')::numeric,(item->>'quantity')::integer
    from jsonb_array_elements(rows_json) item;
  delete from public.account_cart where user_id=uid;
  return jsonb_build_object('success',true,'order_id',oid,'total',amount,'is_test',true);
end;
$function$;
