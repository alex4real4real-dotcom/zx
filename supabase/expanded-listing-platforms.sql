-- New listing choices; keep legacy types valid for historical records.
alter table public.account_products drop constraint account_products_listing_type_check;
alter table public.account_products add constraint account_products_listing_type_check
 check(listing_type in('x','instagram','snapchat','tiktok','tellonym','discord','playstation','xbox','telegram','service','game','facebook','youtube'));
do $$declare definition text; updated text;begin
 select pg_get_functiondef('account_seller_private.save_product(text,text,numeric,text,text,jsonb,boolean)'::regprocedure) into definition;
 updated:=replace(definition,'''x'',''instagram'',''snapchat'',''tiktok'',''facebook'',''youtube'',''service'',''game''',
 '''x'',''instagram'',''snapchat'',''tiktok'',''tellonym'',''discord'',''playstation'',''xbox'',''telegram'',''service'',''game''');
 if updated=definition then raise exception 'SAVE_PRODUCT_PLATFORM_LIST_NOT_FOUND';end if;
 execute updated;
 select pg_get_functiondef('account_seller_private.mark_social_sold()'::regprocedure) into definition;
 updated:=replace(definition,'''x'',''instagram'',''snapchat'',''tiktok'',''facebook'',''youtube''',
 '''x'',''instagram'',''snapchat'',''tiktok'',''tellonym'',''discord'',''playstation'',''xbox'',''telegram'',''facebook'',''youtube''');
 if updated=definition then raise exception 'SOLD_PLATFORM_LIST_NOT_FOUND';end if;
 execute updated;
end;$$;
notify pgrst,'reload schema';
