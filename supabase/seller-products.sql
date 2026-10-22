begin;

-- Public catalog metadata and private seller-owned delivery information.
alter table public.account_products add column if not exists listing_type text not null default 'service'
  check (listing_type in ('x','instagram','snapchat','tiktok','facebook','youtube','service','game'));
alter table public.account_products add column if not exists updated_at timestamptz not null default now();
create index if not exists account_products_seller_created on public.account_products(seller_id,created_at desc,id);
alter table public.account_products enable row level security;
drop policy if exists account_product_owner_read on public.account_products;
create policy account_product_owner_read on public.account_products for select to authenticated
  using (seller_id=(select auth.uid()));

create schema if not exists account_seller_private;
revoke all on schema account_seller_private from public,anon,authenticated;
grant usage on schema account_seller_private to authenticated;
create table if not exists account_seller_private.product_secrets (
  product_id text primary key references public.account_products(id) on delete cascade,
  account_email text not null,
  email_password text not null,
  account_username text not null,
  account_password text not null,
  updated_at timestamptz not null default now()
);
alter table account_seller_private.product_secrets enable row level security;
revoke all on account_seller_private.product_secrets from public,anon,authenticated;

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
    insert into account_seller_private.product_secrets(product_id,account_email,email_password,account_username,account_password)
      values(p_id,btrim(credentials->>'account_email'),credentials->>'email_password',btrim(credentials->>'account_username'),credentials->>'account_password')
      on conflict(product_id) do update set account_email=excluded.account_email,email_password=excluded.email_password,
        account_username=excluded.account_username,account_password=excluded.account_password,updated_at=clock_timestamp();
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
    'account_username',account_username,'account_password',account_password)
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

-- Only authenticated wrappers are exposed; each private implementation checks auth.uid() and ownership.
revoke all on function account_seller_private.save_product(text,text,numeric,text,text,jsonb,boolean),
  account_seller_private.read_product(text),account_seller_private.set_visibility(text,boolean) from public,anon,authenticated;
grant execute on function account_seller_private.save_product(text,text,numeric,text,text,jsonb,boolean),
  account_seller_private.read_product(text),account_seller_private.set_visibility(text,boolean) to authenticated;
create or replace function public.account_seller_save_product(p_id text,p_title text,p_price numeric,p_listing_type text,p_description text,p_credentials jsonb,p_active boolean)
returns jsonb language sql security invoker set search_path='' as $$
  select account_seller_private.save_product(p_id,p_title,p_price,p_listing_type,p_description,p_credentials,p_active);
$$;
create or replace function public.account_seller_read_product(p_id text)
returns jsonb language sql security invoker set search_path='' as $$select account_seller_private.read_product(p_id);$$;
create or replace function public.account_seller_set_visibility(p_id text,p_active boolean)
returns jsonb language sql security invoker set search_path='' as $$select account_seller_private.set_visibility(p_id,p_active);$$;
revoke all on function public.account_seller_save_product(text,text,numeric,text,text,jsonb,boolean),
  public.account_seller_read_product(text),public.account_seller_set_visibility(text,boolean) from public,anon,authenticated;
grant execute on function public.account_seller_save_product(text,text,numeric,text,text,jsonb,boolean),
  public.account_seller_read_product(text),public.account_seller_set_visibility(text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
