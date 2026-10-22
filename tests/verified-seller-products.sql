begin;
select set_config('catalog_test.verified', (select id::text from public.account_profiles where is_verified and not banned limit 1), true),
       set_config('catalog_test.unverified', (select id::text from public.account_profiles where not is_verified and not banned limit 1), true),
       set_config('catalog_test.prefix', 'qa-catalog-' || gen_random_uuid()::text, true);
do $$ begin
  if current_setting('catalog_test.verified') is null or current_setting('catalog_test.unverified') is null then
    raise exception 'TEST_SELLERS_REQUIRED';
  end if;
end $$;
insert into public.account_products(id,title,description,price,seller_id,active,ban_hidden,listing_type)
values
(current_setting('catalog_test.prefix')||'-verified','Catalog QA','Rollback fixture',10,current_setting('catalog_test.verified')::uuid,true,false,'service'),
(current_setting('catalog_test.prefix')||'-unverified','Catalog QA','Rollback fixture',10,current_setting('catalog_test.unverified')::uuid,true,false,'service'),
(current_setting('catalog_test.prefix')||'-inactive','Catalog QA','Rollback fixture',10,current_setting('catalog_test.verified')::uuid,false,false,'service'),
(current_setting('catalog_test.prefix')||'-hidden','Catalog QA','Rollback fixture',10,current_setting('catalog_test.verified')::uuid,true,true,'service'),
(current_setting('catalog_test.prefix')||'-no-owner','Catalog QA','Rollback fixture',10,null,true,false,'service');
set local role anon;
do $$ declare ids text[]; begin
 select array_agg(id) into ids from public.account_verified_seller_products() where id like current_setting('catalog_test.prefix')||'%';
 if ids is distinct from array[current_setting('catalog_test.prefix')||'-verified'] then raise exception 'CATALOG_FILTER_FAILED: %',ids; end if;
 begin
  if exists(select 1 from public.account_profiles) then raise exception 'PROFILES_EXPOSED'; end if;
 exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ declare ids text[]; begin
 select array_agg(id) into ids from public.account_verified_seller_products() where id like current_setting('catalog_test.prefix')||'%';
 if ids is distinct from array[current_setting('catalog_test.prefix')||'-verified'] then raise exception 'AUTH_CATALOG_FILTER_FAILED'; end if;
end $$;
rollback;
