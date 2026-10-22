begin;

-- This public catalog deliberately returns only existing product metadata.
-- Profiles stay private; the privileged join is isolated in an unexposed schema.
create schema if not exists account_catalog_private;
revoke all on schema account_catalog_private from public, anon, authenticated;
grant usage on schema account_catalog_private to anon, authenticated;

create or replace function account_catalog_private.verified_seller_products()
returns setof public.account_products
language sql stable security definer set search_path = ''
as $$
  select product.*
  from public.account_products product
  join public.account_profiles seller on seller.id = product.seller_id
  where product.active = true
    and product.ban_hidden = false
    and seller.is_verified = true
    and seller.banned = false
  order by product.created_at desc, product.id;
$$;
revoke all on function account_catalog_private.verified_seller_products() from public, anon, authenticated;
grant execute on function account_catalog_private.verified_seller_products() to anon, authenticated;

create or replace function public.account_verified_seller_products()
returns setof public.account_products
language sql stable security invoker set search_path = ''
as $$ select * from account_catalog_private.verified_seller_products(); $$;
revoke all on function public.account_verified_seller_products() from public, anon, authenticated;
grant execute on function public.account_verified_seller_products() to anon, authenticated;

commit;
