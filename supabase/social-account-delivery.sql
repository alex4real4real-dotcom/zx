-- Scope: future social-account purchases only. No historical listings are changed.
-- Test delivery is opt-in and copies only data explicitly marked as fictitious.
alter table account_seller_private.product_secrets add column test_delivery boolean not null default false;
alter table public.account_products add column sold_at timestamptz;
create table account_seller_private.product_sales(
 product_id text primary key,order_item_id uuid not null unique references public.account_order_items(id),
 sold_at timestamptz not null default now(),test_delivery_data jsonb
);
alter table account_seller_private.product_sales enable row level security;
revoke all on account_seller_private.product_sales from public,anon,authenticated;
create function account_seller_private.mark_social_sold() returns trigger language plpgsql security definer set search_path='' as $$
declare product public.account_products;dummy jsonb;mode text;
begin
 select * into product from public.account_products where id=new.product_id for update;
 if product.listing_type not in('x','instagram','snapchat','tiktok','facebook','youtube') then return new;end if;
 if new.quantity<>1 then raise exception 'INVALID_QUANTITY';end if;
 if not product.active or exists(select 1 from account_seller_private.product_sales where product_id=new.product_id) then raise exception 'PRODUCT_SOLD';end if;
 select payment_mode into mode from public.account_orders where id=new.order_id;
 if mode='test' then
  select jsonb_build_object('account_email',account_email,'email_password',email_password,'account_username',account_username,'account_password',account_password)
  into dummy from account_seller_private.product_secrets where product_id=new.product_id and test_delivery=true;
 end if;
 begin
 insert into account_seller_private.product_sales(product_id,order_item_id,test_delivery_data)values(new.product_id,new.id,dummy);
 exception when unique_violation then raise exception 'PRODUCT_SOLD';end;
 update public.account_products set active=false,sold_at=clock_timestamp() where id=new.product_id;
 return new;
end;$$;
create trigger z_account_social_single_sale after insert on public.account_order_items for each row execute function account_seller_private.mark_social_sold();
create function account_seller_private.sold_visibility() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.active and exists(select 1 from account_seller_private.product_sales where product_id=new.id) then raise exception 'PRODUCT_SOLD';end if;
 if old.sold_at is not null then new.sold_at:=old.sold_at;end if;
 return new;
end;$$;
create trigger account_social_sold_visibility before update on public.account_products for each row execute function account_seller_private.sold_visibility();
create function account_seller_private.order_delivery(p_item uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid;data jsonb;begin
 uid:=account_admin_private.require_user();
 if not exists(select 1 from public.account_order_items i join public.account_orders o on o.id=i.order_id where i.id=p_item and o.user_id=uid) then raise exception 'DELIVERY_FORBIDDEN';end if;
 select test_delivery_data into data from account_seller_private.product_sales where order_item_id=p_item;
 return case when data is null then jsonb_build_object('state','not_ready') else jsonb_build_object('state','delivered','is_test',true,'credentials',data) end;
end;$$;
revoke all on function account_seller_private.mark_social_sold(),account_seller_private.sold_visibility(),account_seller_private.order_delivery(uuid) from public,anon,authenticated;
grant execute on function account_seller_private.order_delivery(uuid) to authenticated;
create function public.account_order_delivery(p_order_item_id uuid) returns jsonb language sql security invoker set search_path='' as $$select account_seller_private.order_delivery(p_order_item_id);$$;
revoke all on function public.account_order_delivery(uuid) from public,anon,authenticated;
grant execute on function public.account_order_delivery(uuid) to authenticated;
create or replace function account_seller_private.save_product(
  p_id text,p_title text,p_price numeric,p_listing_type text,p_description text,p_credentials jsonb,p_active boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; existing_owner uuid; verified boolean; social boolean; credentials jsonb; saved public.account_products;
begin
  uid:=account_admin_private.require_user();
  if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'EMAIL_CONFIRMATION_REQUIRED'; end if;
  select (is_verified or role='admin') into verified from public.account_profiles where id=uid;
  if p_active is null then raise exception 'INVALID_PRODUCT'; end if;
  if p_active and not verified then raise exception 'SELLER_VERIFICATION_REQUIRED'; end if;
  if p_id is null or p_id!~'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    or char_length(btrim(coalesce(p_title,''))) not between 2 and 200
    or p_price is null or p_price::text in ('NaN','Infinity','-Infinity') or p_price<0.01 or p_price>1000000
    or p_listing_type is null or p_listing_type not in ('x','instagram','snapchat','tiktok','facebook','youtube','service','game')
    or char_length(coalesce(p_description,''))>5000 then raise exception 'INVALID_PRODUCT'; end if;
  social:=p_listing_type not in ('service','game');
  credentials:=coalesce(p_credentials,'{}'::jsonb);
  if jsonb_typeof(credentials)<>'object' then raise exception 'INVALID_CREDENTIALS'; end if;
  if social and (
    coalesce(credentials->>'account_email','')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(coalesce(credentials->>'account_email',''))>254
    or char_length(coalesce(credentials->>'email_password','')) not between 1 and 512
    or char_length(btrim(coalesce(credentials->>'account_username',''))) not between 1 and 200
    or char_length(coalesce(credentials->>'account_password','')) not between 1 and 512
  ) then raise exception 'INVALID_CREDENTIALS'; end if;
  select seller_id into existing_owner from public.account_products where id=p_id for update;
  if found and existing_owner is distinct from uid then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if not found and (select count(*) from public.account_products where seller_id=uid)>=500 then raise exception 'PRODUCT_LIMIT'; end if;
  insert into public.account_products(id,title,price,description,listing_type,seller_id,active)
    values(p_id,btrim(p_title),round(p_price,2),btrim(coalesce(p_description,'')),p_listing_type,uid,p_active)
    on conflict(id) do update set title=excluded.title,price=excluded.price,description=excluded.description,
      listing_type=excluded.listing_type,active=excluded.active,updated_at=clock_timestamp()
    where account_products.seller_id=uid
    returning * into saved;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if social then
    insert into account_seller_private.product_secrets(product_id,account_email,email_password,account_username,account_password,test_delivery)
      values(p_id,btrim(credentials->>'account_email'),credentials->>'email_password',btrim(credentials->>'account_username'),credentials->>'account_password',coalesce(credentials->>'test_delivery','false')='true')
      on conflict(product_id) do update set account_email=excluded.account_email,email_password=excluded.email_password,
        account_username=excluded.account_username,account_password=excluded.account_password,test_delivery=excluded.test_delivery,updated_at=clock_timestamp();
  else
    delete from account_seller_private.product_secrets where product_id=p_id;
  end if;
  return to_jsonb(saved);
end;$$;

create or replace function account_seller_private.read_product(p_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; record public.account_products; credentials jsonb;
begin
  uid:=account_admin_private.require_user();
  select * into record from public.account_products where id=p_id and seller_id=uid;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  select jsonb_build_object('account_email',account_email,'email_password',email_password,
    'account_username',account_username,'account_password',account_password,'test_delivery',test_delivery)
    into credentials from account_seller_private.product_secrets where product_id=p_id;
  return jsonb_build_object('product',to_jsonb(record),'credentials',coalesce(credentials,'{}'::jsonb));
end;$$;

create or replace function account_seller_private.set_visibility(p_id text,p_active boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; record public.account_products;
begin
  uid:=account_admin_private.require_user();
  if p_active is null then raise exception 'INVALID_PRODUCT'; end if;
  if p_active and not exists(select 1 from public.account_profiles where id=uid and (is_verified or role='admin')) then raise exception 'SELLER_VERIFICATION_REQUIRED'; end if;
  if p_active and not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'EMAIL_CONFIRMATION_REQUIRED'; end if;
  update public.account_products set active=p_active,updated_at=clock_timestamp()
    where id=p_id and seller_id=uid returning * into record;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  return to_jsonb(record);
end;$$;

