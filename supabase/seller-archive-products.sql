alter table public.account_products add column deleted_at timestamptz;
alter table public.account_products add constraint account_products_deleted_inactive check(deleted_at is null or not active);

create function account_seller_private.archive_product(p_id text,p_restore boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; product public.account_products;
begin
 uid:=account_admin_private.require_user();
 if p_restore is null then raise exception 'INVALID_PRODUCT';end if;
 select * into product from public.account_products where id=p_id and seller_id=uid for update;
 if not found then raise exception 'PRODUCT_NOT_FOUND';end if;
 update public.account_products set deleted_at=case when p_restore then null else coalesce(product.deleted_at,clock_timestamp()) end,
 active=false,updated_at=clock_timestamp() where id=p_id returning * into product;
 return jsonb_build_object('id',product.id,'deleted_at',product.deleted_at,'active',product.active);
end;$$;
revoke all on function account_seller_private.archive_product(text,boolean) from public,anon,authenticated;
grant execute on function account_seller_private.archive_product(text,boolean) to authenticated;
create function public.account_seller_archive_product(p_id text,p_restore boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select account_seller_private.archive_product(p_id,p_restore);$$;
revoke all on function public.account_seller_archive_product(text,boolean) from public,anon,authenticated;
grant execute on function public.account_seller_archive_product(text,boolean) to authenticated;

-- Preserve current ownership, verification and credential validation rules.
do $$declare source text;updated text;begin
 select pg_get_functiondef('account_seller_private.save_product(text,text,numeric,text,text,jsonb,boolean)'::regprocedure) into source;
 updated:=replace(source,'  if found and existing_owner is distinct from uid then raise exception ''PRODUCT_NOT_FOUND''; end if;',
 '  if found and existing_owner is distinct from uid then raise exception ''PRODUCT_NOT_FOUND''; end if;
  if exists(select 1 from public.account_products where id=p_id and seller_id=uid and deleted_at is not null) then raise exception ''PRODUCT_DELETED'';end if;');
 if updated=source then raise exception 'OWNER_CHECK_NOT_FOUND';end if;
 execute updated;
 select pg_get_functiondef('account_seller_private.set_visibility(text,boolean)'::regprocedure) into source;
 updated:=replace(source,'where id=p_id and seller_id=uid returning * into record','where id=p_id and seller_id=uid and deleted_at is null returning * into record');
 if updated=source then raise exception 'VISIBILITY_CHECK_NOT_FOUND';end if;
 execute updated;
end;$$;
notify pgrst,'reload schema';
