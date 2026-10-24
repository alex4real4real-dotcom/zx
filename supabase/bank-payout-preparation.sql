-- Prepared SAR payout ledger. Collection and bank connections start disabled.
-- Historical test settlements and test withdrawals are never real credits.
create schema account_payout_private;
revoke all on schema account_payout_private from public,anon,authenticated,service_role;
grant usage on schema account_payout_private to authenticated,service_role;
create table account_payout_private.settings(
 singleton boolean primary key default true check(singleton),
 provider text not null default 'alrajhi' check(provider='alrajhi'),
 enabled boolean not null default false, collections_ready boolean not null default false,
 bank_ready boolean not null default false, adapter_ready boolean not null default false
);
insert into account_payout_private.settings(singleton) values(true);
alter table account_withdrawal_private.bank_accounts add column verified_at timestamptz,
 add column verification_reference text;
create table account_payout_private.credits(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.account_profiles(id),
 source_id text not null unique check(char_length(source_id) between 1 and 200),
 bank_settlement_reference text not null check(char_length(bank_settlement_reference) between 1 and 200),
 amount numeric(14,2) not null check(amount>0 and amount<'Infinity'::numeric),
 currency text not null default 'SAR' check(currency='SAR'), created_at timestamptz not null default clock_timestamp()
);
create table account_payout_private.requests(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.account_profiles(id),
 request_id uuid not null, bank_account_id uuid not null references account_withdrawal_private.bank_accounts(id),
 amount numeric(14,2) not null check(amount>0 and amount<'Infinity'::numeric),currency text not null default 'SAR' check(currency='SAR'),
 status text not null default 'queued' check(status in('queued','processing','reconciling','paid','failed','cancelled')),
 bank_name text not null,holder_name text not null,iban text not null,
 note text not null default '' check(char_length(note)<=1000),
 provider_reference text, claim_id uuid, claimed_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz, unique(user_id,request_id),
 check((status in('paid','failed','cancelled'))=(completed_at is not null)),
 check(status<>'paid' or provider_reference is not null)
);
create unique index payout_provider_reference_unique on account_payout_private.requests(provider_reference) where provider_reference is not null;
create index payout_owner_created on account_payout_private.requests(user_id,created_at desc,id);
create index payout_queue on account_payout_private.requests(status,claimed_at,created_at);
create index payout_credit_owner on account_payout_private.credits(user_id);
create index payout_request_bank on account_payout_private.requests(bank_account_id);
create table account_payout_private.receipts(
 event_id text primary key check(char_length(event_id) between 1 and 200),
 request_id uuid not null references account_payout_private.requests(id),
 status text not null check(status in('paid','failed','reconciling')),
 provider_reference text not null default '',created_at timestamptz not null default clock_timestamp()
);
create index payout_receipt_request on account_payout_private.receipts(request_id);
alter table account_payout_private.settings enable row level security;
alter table account_payout_private.credits enable row level security;
alter table account_payout_private.requests enable row level security;
alter table account_payout_private.receipts enable row level security;
revoke all on all tables in schema account_payout_private from public,anon,authenticated,service_role;

create function account_payout_private.integration() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('provider',provider,'enabled',enabled,'collections_ready',collections_ready,
  'bank_ready',bank_ready,'adapter_ready',adapter_ready,'can_submit',enabled and collections_ready and bank_ready and adapter_ready)
 from account_payout_private.settings where singleton;
$$;
create function account_payout_private.balances(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with c as(select coalesce(sum(amount),0) earned from account_payout_private.credits where user_id=p_user),
 r as(select coalesce(sum(amount)filter(where status in('queued','processing','reconciling')),0) reserved,
 coalesce(sum(amount)filter(where status='paid'),0) paid from account_payout_private.requests where user_id=p_user)
 select jsonb_build_object('earned',c.earned,'available',c.earned-r.reserved-r.paid,'reserved',r.reserved,
 'paid',r.paid,'reserved_and_approved',r.reserved+r.paid,'currency','SAR','is_test',false) from c,r;
$$;
create function account_payout_private.wallet() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;begin
 uid:=account_admin_private.require_user();return account_payout_private.balances(uid);
end;$$;
create function account_payout_private.visible(p_row account_payout_private.requests) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p_row.id,'bank_account_id',p_row.bank_account_id,'amount',p_row.amount,'currency',p_row.currency,
 'status',p_row.status,'bank_name',p_row.bank_name,'holder_name',p_row.holder_name,'iban_masked','SA•• •••• •••• '||right(p_row.iban,4),
 'note',p_row.note,'provider_reference',p_row.provider_reference,'created_at',p_row.created_at,'completed_at',p_row.completed_at,'is_test',false);
$$;
create function account_payout_private.require_seller() returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid;begin
 uid:=account_admin_private.require_user();
 if not exists(select 1 from public.account_profiles p join auth.users u on u.id=p.id where p.id=uid and p.is_verified and u.email_confirmed_at is not null) then raise exception 'IDENTITY_VERIFICATION_REQUIRED';end if;
 return uid;
end;$$;
create function account_payout_private.dashboard(p_offset integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; banks jsonb; rows jsonb;begin
 uid:=account_payout_private.require_seller();
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'bank_name',b.bank_name,'holder_name',b.holder_name,
 'iban_masked','SA•• •••• •••• '||right(b.iban,4),'verified',b.verified_at is not null) order by b.created_at),'[]'::jsonb)
 into banks from account_withdrawal_private.bank_accounts b where b.user_id=uid;
 select coalesce(jsonb_agg(x.value order by x.created_at desc,x.id),'[]'::jsonb) into rows from (
 select r.id,r.created_at,account_payout_private.visible(r) value from account_payout_private.requests r where r.user_id=uid
 order by r.created_at desc,r.id limit 50 offset greatest(coalesce(p_offset,0),0)) x;
 return jsonb_build_object('balances',account_payout_private.balances(uid),'bank_accounts',banks,'requests',rows,
 'more',jsonb_array_length(rows)=50,'integration',account_payout_private.integration(),'is_test',false);
end;$$;
create function account_payout_private.add_bank(p_request_id uuid,p_bank text,p_holder text,p_iban text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform account_payout_private.require_seller();
 return account_withdrawal_private.add_bank(p_request_id,p_bank,p_holder,p_iban);
end;$$;
create function account_payout_private.request(p_request_id uuid,p_bank_id uuid,p_amount numeric,p_note text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; existing account_payout_private.requests; bank account_withdrawal_private.bank_accounts;begin
 -- The seller-profile row lock serializes all reservations, credits and outcomes.
 uid:=account_payout_private.require_seller();
 if p_request_id is null or p_amount is null or p_amount::text in('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount>1000000 or p_amount<>trunc(p_amount,2) or char_length(coalesce(p_note,''))>1000 then raise exception 'INVALID_WITHDRAWAL_AMOUNT';end if;
 select * into existing from account_payout_private.requests where user_id=uid and request_id=p_request_id;
 if found then
  if existing.bank_account_id is distinct from p_bank_id or existing.amount<>p_amount or existing.note<>btrim(coalesce(p_note,'')) then raise exception 'REQUEST_ID_REUSED';end if;
  return account_payout_private.visible(existing);
 end if;
 if not coalesce((account_payout_private.integration()->>'can_submit')::boolean,false) then raise exception 'BANK_INTEGRATION_NOT_READY';end if;
 select * into bank from account_withdrawal_private.bank_accounts where id=p_bank_id and user_id=uid;
 if not found then raise exception 'BANK_ACCOUNT_REQUIRED';end if;
 if bank.verified_at is null then raise exception 'BANK_ACCOUNT_NOT_VERIFIED';end if;
 if p_amount>(account_payout_private.balances(uid)->>'available')::numeric then raise exception 'INSUFFICIENT_BALANCE';end if;
 insert into account_payout_private.requests(user_id,request_id,bank_account_id,amount,bank_name,holder_name,iban,note)
 values(uid,p_request_id,bank.id,p_amount,bank.bank_name,bank.holder_name,bank.iban,btrim(coalesce(p_note,''))) returning * into existing;
 return account_payout_private.visible(existing);
end;$$;
create function account_payout_private.cancel(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; row account_payout_private.requests;begin
 uid:=account_payout_private.require_seller();
 select * into row from account_payout_private.requests where id=p_id and user_id=uid for update;
 if not found then raise exception 'RECORD_NOT_FOUND';end if;
 if row.status='cancelled' then return account_payout_private.visible(row);end if;
 if row.status<>'queued' then raise exception 'PAYOUT_ALREADY_PROCESSING';end if;
 update account_payout_private.requests set status='cancelled',completed_at=clock_timestamp(),updated_at=clock_timestamp() where id=p_id returning * into row;
 return account_payout_private.visible(row);
end;$$;
create function account_payout_private.admin_rows(p_offset integer,p_filter text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rows jsonb;begin
 perform account_admin_private.require_admin(false);
 if coalesce(p_filter,'') not in('','queued','processing','reconciling','paid','failed','cancelled') then raise exception 'INVALID_STATUS';end if;
 select coalesce(jsonb_agg(x.value order by x.created_at desc,x.id),'[]'::jsonb) into rows from (
 select r.id,r.created_at,account_payout_private.visible(r)||jsonb_build_object('email',p.email) value
 from account_payout_private.requests r join public.account_profiles p on p.id=r.user_id
 where coalesce(p_filter,'')='' or r.status=p_filter order by r.created_at desc,r.id limit 50 offset greatest(coalesce(p_offset,0),0)) x;
 return jsonb_build_object('rows',rows,'more',jsonb_array_length(rows)=50,'integration',account_payout_private.integration());
end;$$;

-- Called only by a future verified collection/settlement integration after the
-- bank settlement and the sale's protection/dispute period have been resolved.
create function account_payout_private.credit(p_user uuid,p_source text,p_amount numeric,p_settlement text) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing account_payout_private.credits; result uuid;begin
 if not exists(select 1 from account_payout_private.settings where singleton and collections_ready) then raise exception 'COLLECTIONS_NOT_READY';end if;
 perform id from public.account_profiles where id=p_user for update;
 if not found then raise exception 'RECORD_NOT_FOUND';end if;
 if p_amount is null or p_amount::text in('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount>1000000 or p_amount<>trunc(p_amount,2) or char_length(coalesce(p_source,'')) not between 1 and 200 or char_length(coalesce(p_settlement,'')) not between 1 and 200 then raise exception 'INVALID_CREDIT';end if;
 select * into existing from account_payout_private.credits where source_id=p_source;
 if found then
  if existing.user_id<>p_user or existing.amount<>p_amount or existing.bank_settlement_reference<>p_settlement then raise exception 'SOURCE_REUSED';end if;
  return existing.id;
 end if;
 insert into account_payout_private.credits(user_id,source_id,amount,bank_settlement_reference) values(p_user,p_source,p_amount,p_settlement) returning id into result;
 return result;
end;$$;
create function account_payout_private.claim() returns jsonb
language plpgsql security definer set search_path='' as $$
declare row account_payout_private.requests; mode text;begin
 if not coalesce((account_payout_private.integration()->>'can_submit')::boolean,false) then raise exception 'BANK_INTEGRATION_NOT_READY';end if;
 select * into row from account_payout_private.requests r
 where r.status='queued' or (r.status in('processing','reconciling') and r.claimed_at<clock_timestamp()-interval '2 minutes')
 order by r.created_at,r.id limit 1 for update skip locked;
 if not found then return null;end if;
 mode:=case when row.status='queued' then 'submit' else 'lookup' end;
 update account_payout_private.requests set status=case when mode='submit' then 'processing' else 'reconciling' end,
 claim_id=gen_random_uuid(),claimed_at=clock_timestamp(),updated_at=clock_timestamp() where id=row.id returning * into row;
 return jsonb_build_object('id',row.id,'claim_id',row.claim_id,'action',mode,'idempotency_key',row.id::text,
 'amount',row.amount::text,'currency',row.currency,'iban',row.iban,'holder_name',row.holder_name);
end;$$;
create function account_payout_private.report(p_id uuid,p_claim uuid,p_status text,p_event text,p_reference text,p_amount numeric,p_iban text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare row account_payout_private.requests; owner_id uuid; receipt account_payout_private.receipts;begin
 select user_id into owner_id from account_payout_private.requests where id=p_id;
 if not found then raise exception 'RECORD_NOT_FOUND';end if;
 perform id from public.account_profiles where id=owner_id for update;
 select * into row from account_payout_private.requests where id=p_id for update;
 if p_status is null or p_status not in('paid','failed','reconciling') or p_amount is distinct from row.amount or p_iban is distinct from row.iban or char_length(coalesce(p_event,'')) not between 1 and 200 or char_length(coalesce(p_reference,''))>200 or (p_status='paid' and char_length(coalesce(p_reference,''))=0) then raise exception 'INVALID_PAYOUT_RESULT';end if;
 select * into receipt from account_payout_private.receipts where event_id=p_event;
 if found then
  if receipt.request_id<>p_id or receipt.status<>p_status or receipt.provider_reference<>coalesce(p_reference,'') then raise exception 'EVENT_REUSED';end if;
  return account_payout_private.visible(row);
 end if;
 if row.status not in('processing','reconciling') or row.claim_id is distinct from p_claim then raise exception 'STALE_PAYOUT_RESULT';end if;
 insert into account_payout_private.receipts(event_id,request_id,status,provider_reference) values(p_event,p_id,p_status,coalesce(p_reference,''));
 update account_payout_private.requests set status=p_status,
 provider_reference=case when p_status='paid' then p_reference else null end,
 completed_at=case when p_status in('paid','failed') then clock_timestamp() else null end,updated_at=clock_timestamp()
 where id=p_id returning * into row;
 return account_payout_private.visible(row);
end;$$;
revoke all on all functions in schema account_payout_private from public,anon,authenticated,service_role;
grant execute on function account_payout_private.wallet(),account_payout_private.dashboard(integer),account_payout_private.add_bank(uuid,text,text,text),account_payout_private.request(uuid,uuid,numeric,text),account_payout_private.cancel(uuid),account_payout_private.admin_rows(integer,text) to authenticated;
grant execute on function account_payout_private.credit(uuid,text,numeric,text),account_payout_private.claim(),account_payout_private.report(uuid,uuid,text,text,text,numeric,text) to service_role;
create function public.account_payout_dashboard(p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.dashboard(p_offset);$$;
create function public.account_payout_wallet() returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.wallet();$$;
create function public.account_payout_add_bank(p_request_id uuid,p_bank text,p_holder text,p_iban text) returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.add_bank(p_request_id,p_bank,p_holder,p_iban);$$;
create function public.account_payout_request(p_request_id uuid,p_bank_id uuid,p_amount numeric,p_note text default '') returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.request(p_request_id,p_bank_id,p_amount,p_note);$$;
create function public.account_payout_cancel(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.cancel(p_id);$$;
create function public.account_payout_admin(p_offset integer default 0,p_filter text default '') returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.admin_rows(p_offset,p_filter);$$;
create function public.account_payout_credit(p_user uuid,p_source text,p_amount numeric,p_settlement text) returns uuid language sql security invoker set search_path='' as $$select account_payout_private.credit(p_user,p_source,p_amount,p_settlement);$$;
create function public.account_payout_claim() returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.claim();$$;
create function public.account_payout_report(p_id uuid,p_claim uuid,p_status text,p_event text,p_reference text,p_amount numeric,p_iban text) returns jsonb language sql security invoker set search_path='' as $$select account_payout_private.report(p_id,p_claim,p_status,p_event,p_reference,p_amount,p_iban);$$;
revoke all on function public.account_payout_dashboard(integer),public.account_payout_add_bank(uuid,text,text,text),public.account_payout_request(uuid,uuid,numeric,text),public.account_payout_cancel(uuid),public.account_payout_admin(integer,text),public.account_payout_credit(uuid,text,numeric,text),public.account_payout_claim(),public.account_payout_report(uuid,uuid,text,text,text,numeric,text) from public,anon,authenticated,service_role;
revoke all on function public.account_payout_wallet() from public,anon,authenticated,service_role;
grant execute on function public.account_payout_wallet(),public.account_payout_dashboard(integer),public.account_payout_add_bank(uuid,text,text,text),public.account_payout_request(uuid,uuid,numeric,text),public.account_payout_cancel(uuid),public.account_payout_admin(integer,text) to authenticated;
grant execute on function public.account_payout_credit(uuid,text,numeric,text),public.account_payout_claim(),public.account_payout_report(uuid,uuid,text,text,text,numeric,text) to service_role;
notify pgrst,'reload schema';
