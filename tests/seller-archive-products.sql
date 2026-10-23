begin;
select set_config('archive_qa.owner',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where not p.banned and u.email_confirmed_at is not null order by p.created_at limit 1),true),
set_config('archive_qa.other',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where not p.banned and u.email_confirmed_at is not null order by p.created_at offset 1 limit 1),true),
set_config('archive_qa.product',gen_random_uuid()::text,true),set_config('archive_qa.order',gen_random_uuid()::text,true);
select set_config('request.jwt.claim.sub',current_setting('archive_qa.owner'),true);
set local role authenticated;
select public.account_seller_save_product(current_setting('archive_qa.product'),'Archive check',50,'service','Rollback only','{}',false)->>'id';
select public.account_seller_save_product(current_setting('archive_qa.product'),'Edited listing',75,'service','Updated description','{}',false)->>'price';
reset role;
insert into public.account_orders(id,user_id,request_id,total)values(current_setting('archive_qa.order')::uuid,current_setting('archive_qa.other')::uuid,gen_random_uuid(),75);
insert into public.account_order_items(order_id,product_id,title,unit_price,quantity,seller_id)values(current_setting('archive_qa.order')::uuid,current_setting('archive_qa.product'),'Edited listing',75,1,current_setting('archive_qa.owner')::uuid);
select set_config('request.jwt.claim.sub',current_setting('archive_qa.other'),true);
set local role authenticated;
do $$begin
 begin perform public.account_seller_archive_product(current_setting('archive_qa.product'),false);raise exception 'OTHER_OWNER_DELETE_ALLOWED';
 exception when raise_exception then if sqlerrm<>'PRODUCT_NOT_FOUND' then raise;end if;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('archive_qa.owner'),true);
do $$declare result jsonb;begin
 result:=public.account_seller_archive_product(current_setting('archive_qa.product'),false);
 if result->>'deleted_at' is null or (result->>'active')::boolean then raise exception 'DELETE_FAILED';end if;
 begin perform public.account_seller_save_product(current_setting('archive_qa.product'),'No revival',75,'service','','{}',false);raise exception 'DELETED_EDIT_ALLOWED';
 exception when raise_exception then if sqlerrm<>'PRODUCT_DELETED' then raise;end if;end;
 result:=public.account_seller_archive_product(current_setting('archive_qa.product'),true);
 if result->>'deleted_at' is not null or (result->>'active')::boolean then raise exception 'RESTORE_NOT_DRAFT';end if;
end;$$;
reset role;
do $$begin
 if not exists(select 1 from public.account_orders where id=current_setting('archive_qa.order')::uuid) or not exists(select 1 from public.account_order_items where order_id=current_setting('archive_qa.order')::uuid and title='Edited listing' and unit_price=75) then raise exception 'ORDER_HISTORY_CHANGED';end if;
 if has_function_privilege('anon','public.account_seller_archive_product(text,boolean)','execute') then raise exception 'ANON_DELETE_ALLOWED';end if;
end;$$;
select 'Owner edit/delete/restore passed; other owners blocked; order history preserved' as result;
rollback;
