-- Run after admin.sql and test-settlement.sql. Test-only; no payment-provider calls.
begin;
create or replace function account_settlement_private.dispute_transition()
returns trigger language plpgsql security definer set search_path='' as $$
declare settlement public.account_order_settlements; stamp timestamptz;
begin
 -- A final decision is immutable for every case, including pre-policy orders.
 if tg_op='UPDATE' then
   if old.status<>'open' and new.status is distinct from old.status then raise exception 'SETTLEMENT_FINAL'; end if;
   if new.status='closed' and new.status is distinct from old.status then raise exception 'DISPUTE_WINNER_REQUIRED'; end if;
 end if;
 select * into settlement from public.account_order_settlements where order_item_id=new.order_item_id for update;
 if not found then return new; end if; -- Pre-policy orders keep their existing support workflow.
 stamp:=clock_timestamp();
 if new.buyer_id is distinct from settlement.buyer_id or new.seller_id is distinct from settlement.seller_id then
   raise exception 'INVALID_DISPUTE_PARTICIPANTS';
 end if;
 if tg_op='INSERT' then
   if settlement.state<>'held' or stamp>=settlement.release_at then raise exception 'DISPUTE_WINDOW_EXPIRED'; end if;
   update public.account_order_settlements set state='disputed',updated_at=stamp where order_item_id=new.order_item_id;
 elsif new.status is distinct from old.status then
   if settlement.state in ('released','refunded') then raise exception 'SETTLEMENT_FINAL'; end if;
   if new.status='closed' then raise exception 'DISPUTE_WINNER_REQUIRED'; end if;
   if new.status in ('resolved_buyer','resolved_seller') then
     if settlement.state<>'disputed' then raise exception 'INVALID_SETTLEMENT_STATE'; end if;
     if new.status='resolved_seller' and settlement.seller_id is null then raise exception 'SETTLEMENT_SELLER_REQUIRED'; end if;
     update public.account_order_settlements set
       state=case when new.status='resolved_buyer' then 'refunded' else 'released' end,
       settled_at=stamp,updated_at=stamp where order_item_id=new.order_item_id;
   end if;
 end if;
 return new;
end;$$;

create function account_settlement_private.party_close(p_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; dispute public.account_disputes; result_status text; actor_role text; actor_name text; previous public.account_dispute_replies; mode text;
begin
 actor:=account_admin_private.require_user();
 if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
 select * into dispute from public.account_disputes where id=p_id for update;
 if not found or (actor is distinct from dispute.buyer_id and actor is distinct from dispute.seller_id) then raise exception 'RECORD_NOT_FOUND'; end if;
 if dispute.buyer_id=dispute.seller_id then raise exception 'PARTICIPANT_CONFLICT'; end if;
 -- The server derives the winner. A caller cannot select themselves as recipient.
 actor_role:=case when actor=dispute.buyer_id then 'buyer' else 'seller' end;
 result_status:=case when actor_role='buyer' then 'resolved_seller' else 'resolved_buyer' end;
 select * into previous from public.account_dispute_replies where dispute_id=p_id and sender_id=actor and request_id=p_request_id;
 if found then
   if previous.event_status is distinct from result_status then raise exception 'REQUEST_ID_REUSED'; end if;
   return jsonb_build_object('id',p_id,'status',result_status,'is_test',true);
 end if;
 if dispute.status<>'open' then raise exception 'DISPUTE_CLOSED'; end if;
 select o.payment_mode into mode from public.account_orders o join public.account_order_items i on i.order_id=o.id where i.id=dispute.order_item_id;
 if mode is distinct from 'test' then raise exception 'PAYMENT_SETTLEMENT_UNAVAILABLE'; end if;
 update public.account_disputes set status=result_status,
   decision_note=case when actor_role='buyer' then 'أغلق المشتري النزاع لصالح البائع.' else 'أغلق البائع النزاع لصالح المشتري.' end,
   decided_by=actor,decided_at=clock_timestamp(),updated_at=clock_timestamp() where id=p_id;
 select coalesce(nullif(display_name,''),email) into actor_name from public.account_profiles where id=actor;
 insert into public.account_dispute_replies(dispute_id,sender_id,request_id,sender_role,sender_name,body,event_status)
 values(p_id,actor,p_request_id,actor_role,actor_name,
   case when actor_role='buyer' then 'أغلق المشتري النزاع لصالح البائع.' else 'أغلق البائع النزاع لصالح المشتري.' end,result_status);
 insert into public.account_admin_audit(actor_id,action,target_id,details)
 values(actor,'dispute_party_closed',p_id::text,jsonb_build_object('status',result_status,'closed_by',actor_role,'payment_mode','test'));
 return jsonb_build_object('id',p_id,'status',result_status,'is_test',true);
end;$$;
revoke all on function account_settlement_private.party_close(uuid,uuid) from public,anon,authenticated;
grant usage on schema account_settlement_private to authenticated;
grant execute on function account_settlement_private.party_close(uuid,uuid) to authenticated;
create function public.account_dispute_party_close(p_id uuid,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select account_settlement_private.party_close(p_id,p_request_id);
$$;
revoke all on function public.account_dispute_party_close(uuid,uuid) from public,anon,authenticated;
grant execute on function public.account_dispute_party_close(uuid,uuid) to authenticated;

-- A seller can read only items for which the purchase-time snapshot names them.
-- Return display fields, never the buyer's email, address or account credentials.
create function account_settlement_private.seller_orders(p_offset integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; rows jsonb;
begin
 uid:=account_admin_private.require_user();
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into rows from (
   select o.id,o.user_id,o.created_at,o.payment_mode,o.status,o.currency,
    (select jsonb_agg(jsonb_build_object('id',i.id,'product_id',i.product_id,'title',i.title,
       'unit_price',i.unit_price,'quantity',i.quantity,'seller_id',i.seller_id,'listing_type',p.listing_type) order by i.id)
     from public.account_order_items i left join public.account_products p on p.id=i.product_id
     where i.order_id=o.id and i.seller_id=uid) as items
   from public.account_orders o where exists(select 1 from public.account_order_items i where i.order_id=o.id and i.seller_id=uid)
   order by o.created_at desc,o.id limit 50 offset greatest(coalesce(p_offset,0),0)
 ) x;
 return rows;
end;$$;
revoke all on function account_settlement_private.seller_orders(integer) from public,anon,authenticated;
grant execute on function account_settlement_private.seller_orders(integer) to authenticated;
create function public.account_seller_orders(p_offset integer default 0)
returns jsonb language sql security invoker set search_path='' as $$
 select account_settlement_private.seller_orders(p_offset);
$$;
revoke all on function public.account_seller_orders(integer) from public,anon,authenticated;
grant execute on function public.account_seller_orders(integer) to authenticated;
commit;
