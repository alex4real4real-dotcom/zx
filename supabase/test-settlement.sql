-- 12-hour settlement simulation. No real money, wallet credit or provider calls.
-- Applies only to new test order items. Existing orders are not backdated.
begin;
create schema if not exists account_settlement_private;
revoke all on schema account_settlement_private from public,anon,authenticated;

create table public.account_order_settlements (
  order_item_id uuid primary key references public.account_order_items(id),
  buyer_id uuid not null references public.account_profiles(id),
  seller_id uuid references public.account_profiles(id),
  amount numeric not null check(amount>=0),
  currency text not null check(currency='SAR'),
  payment_mode text not null default 'test' check(payment_mode='test'),
  state text not null default 'held' check(state in ('held','disputed','released','refunded','needs_review')),
  purchased_at timestamptz not null,
  release_at timestamptz not null,
  settled_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  check(release_at=purchased_at+interval '12 hours'),
  check((state in ('released','refunded'))=(settled_at is not null))
);
create index account_settlement_due on public.account_order_settlements(release_at,order_item_id) where state='held';
create index account_settlement_buyer on public.account_order_settlements(buyer_id);
create index account_settlement_seller on public.account_order_settlements(seller_id);
alter table public.account_order_settlements enable row level security;
revoke all on public.account_order_settlements from public,anon,authenticated;
grant select on public.account_order_settlements to authenticated;
create policy settlement_participants on public.account_order_settlements for select to authenticated
using(account_admin_private.participant(buyer_id,seller_id));

create table account_settlement_private.events (
 id bigint generated always as identity primary key,
 order_item_id uuid not null references public.account_order_settlements(order_item_id),
 old_state text,new_state text not null,actor_id uuid,created_at timestamptz not null default clock_timestamp()
);
alter table account_settlement_private.events enable row level security;
revoke all on account_settlement_private.events from public,anon,authenticated;

create function account_settlement_private.audit_transition()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
   insert into account_settlement_private.events(order_item_id,new_state,actor_id) values(new.order_item_id,new.state,auth.uid());
 elsif new.state is distinct from old.state then
   insert into account_settlement_private.events(order_item_id,old_state,new_state,actor_id) values(new.order_item_id,old.state,new.state,auth.uid());
 end if;
 return new;
end;$$;
create trigger account_settlement_audit after insert or update on public.account_order_settlements
for each row execute function account_settlement_private.audit_transition();

create function account_settlement_private.start_hold()
returns trigger language plpgsql security definer set search_path='' as $$
declare purchase public.account_orders;
begin
 select * into strict purchase from public.account_orders where id=new.order_id;
 if purchase.payment_mode='test' and purchase.status='test_completed' then
   insert into public.account_order_settlements(order_item_id,buyer_id,seller_id,amount,currency,purchased_at,release_at)
   values(new.id,purchase.user_id,new.seller_id,new.unit_price*new.quantity,purchase.currency,purchase.created_at,purchase.created_at+interval '12 hours');
 end if;
 return new;
end;$$;
create trigger account_settlement_start after insert on public.account_order_items
for each row execute function account_settlement_private.start_hold();

-- This row lock serializes dispute creation, decisions and the scheduled release.
create function account_settlement_private.dispute_transition()
returns trigger language plpgsql security definer set search_path='' as $$
declare settlement public.account_order_settlements; stamp timestamptz;
begin
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
create trigger account_settlement_dispute before insert or update on public.account_disputes
for each row execute function account_settlement_private.dispute_transition();

create function account_settlement_private.release_due()
returns integer language plpgsql security definer set search_path='' as $$
declare settlement public.account_order_settlements; changed integer:=0; stamp timestamptz;
begin
 for settlement in select * from public.account_order_settlements
   where state='held' and release_at<=clock_timestamp() order by release_at,order_item_id
   limit 500 for update skip locked
 loop
   stamp:=clock_timestamp();
   if exists(select 1 from public.account_disputes where order_item_id=settlement.order_item_id) then
     -- Fail closed if any unexpected dispute exists; never auto-release it.
     update public.account_order_settlements set state='disputed',updated_at=stamp where order_item_id=settlement.order_item_id;
   elsif settlement.seller_id is null or settlement.seller_id=settlement.buyer_id then
     update public.account_order_settlements set state='needs_review',updated_at=stamp where order_item_id=settlement.order_item_id;
   else
     update public.account_order_settlements set state='released',settled_at=stamp,updated_at=stamp where order_item_id=settlement.order_item_id;
   end if;
   changed:=changed+1;
 end loop;
 return changed;
end;$$;
revoke all on all functions in schema account_settlement_private from public,anon,authenticated;

-- The server supplies time and filtered settlement rows to buyers, sellers and admins.
create function public.account_test_settlements()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); rows jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into rows from public.account_order_settlements s;
 return jsonb_build_object('server_now',clock_timestamp(),'settlements',rows,'is_test',true);
end;$$;
revoke all on function public.account_test_settlements() from public,anon;
grant execute on function public.account_test_settlements() to authenticated;

create extension if not exists pg_cron;
select cron.schedule('account-test-settlement-release','* * * * *','select account_settlement_private.release_due();');
commit;
