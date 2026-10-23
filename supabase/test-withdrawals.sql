-- Test-only withdrawal requests. No real wallet, bank transfer or payout provider.
-- Requires admin.sql, test-settlement.sql and inline-order-disputes.sql.
begin;
create schema account_withdrawal_private;
revoke all on schema account_withdrawal_private from public,anon,authenticated;
create table account_withdrawal_private.bank_accounts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.account_profiles(id),
 request_id uuid not null,bank_name text not null check(char_length(bank_name) between 2 and 100),
 holder_name text not null check(char_length(holder_name) between 2 and 120),
 iban text not null check(iban ~ '^SA[0-9]{4}[A-Z0-9]{18}$'),created_at timestamptz not null default clock_timestamp(),
 unique(user_id,request_id),unique(user_id,iban)
);
create table account_withdrawal_private.requests(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.account_profiles(id),
 request_id uuid not null,bank_account_id uuid not null references account_withdrawal_private.bank_accounts(id),
 amount numeric(14,2) not null check(amount>0 and amount<'Infinity'::numeric),
 currency text not null default 'SAR' check(currency='SAR'),payment_mode text not null default 'test' check(payment_mode='test'),
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 bank_name text not null,holder_name text not null,iban text not null,note text not null default '' check(char_length(note)<=1000),
 review_note text not null default '' check(char_length(review_note)<=1000),reviewed_by uuid references public.account_profiles(id),
 review_request_id uuid,created_at timestamptz not null default clock_timestamp(),reviewed_at timestamptz,
 unique(user_id,request_id),check((status='pending')=(reviewed_at is null))
);
create index withdrawal_user_status on account_withdrawal_private.requests(user_id,status);
create index withdrawal_status_created on account_withdrawal_private.requests(status,created_at desc,id);
create index withdrawal_bank on account_withdrawal_private.requests(bank_account_id);
create index withdrawal_reviewer on account_withdrawal_private.requests(reviewed_by);
alter table account_withdrawal_private.bank_accounts enable row level security;
alter table account_withdrawal_private.requests enable row level security;
revoke all on all tables in schema account_withdrawal_private from public,anon,authenticated;

create function account_withdrawal_private.valid_iban(value text)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare rearranged text; letter text; digit integer; remainder integer:=0; pos integer;
begin
 if value is null or value!~'^SA[0-9]{4}[A-Z0-9]{18}$' then return false; end if;
 rearranged:=substr(value,5)||substr(value,1,4);
 for pos in 1..char_length(rearranged) loop
  letter:=substr(rearranged,pos,1);
  if letter between 'A' and 'Z' then digit:=ascii(letter)-55;remainder:=mod(remainder*100+digit,97);
  else remainder:=mod(remainder*10+letter::integer,97);end if;
 end loop;
 return remainder=1;
end;$$;
create function account_withdrawal_private.balances(uid uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with credits as (select coalesce(sum(amount),0) earned from public.account_order_settlements where seller_id=uid and payment_mode='test' and state='released'),
 debits as (select coalesce(sum(amount)filter(where status='pending'),0) pending,coalesce(sum(amount)filter(where status='approved'),0) approved from account_withdrawal_private.requests where user_id=uid)
 select jsonb_build_object('available',credits.earned-debits.pending-debits.approved,'earned',credits.earned,'pending',debits.pending,'approved',debits.approved,'reserved_and_approved',debits.pending+debits.approved,'is_test',true) from credits,debits;
$$;
create function account_withdrawal_private.dashboard(p_offset integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; accounts jsonb; rows jsonb;
begin
 uid:=account_admin_private.require_user();
 if not exists(select 1 from public.account_profiles where id=uid and is_verified=true and not banned) then raise exception 'IDENTITY_VERIFICATION_REQUIRED'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'bank_name',b.bank_name,'holder_name',b.holder_name,'iban_masked','SA•• •••• •••• '||right(b.iban,4)) order by b.created_at),'[]'::jsonb)
 into accounts from account_withdrawal_private.bank_accounts b where b.user_id=uid;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into rows from (
  select r.id,r.bank_account_id,r.amount,r.currency,r.payment_mode,r.status,r.bank_name,r.holder_name,
   'SA•• •••• •••• '||right(r.iban,4) as iban_masked,r.note,r.review_note,r.created_at,r.reviewed_at
  from account_withdrawal_private.requests r where r.user_id=uid order by r.created_at desc,r.id limit 50 offset greatest(coalesce(p_offset,0),0)
 ) x;
 return jsonb_build_object('balances',account_withdrawal_private.balances(uid),'bank_accounts',accounts,'requests',rows,'more',jsonb_array_length(rows)=50,'is_test',true);
end;$$;
create function account_withdrawal_private.add_bank(p_request_id uuid,p_bank text,p_holder text,p_iban text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; existing account_withdrawal_private.bank_accounts; normalized text:=regexp_replace(upper(coalesce(p_iban,'')),'[[:space:]-]','','g'); bank text:=btrim(coalesce(p_bank,'')); holder text:=btrim(coalesce(p_holder,''));
begin
 uid:=account_admin_private.require_user();
 if not exists(select 1 from public.account_profiles where id=uid and is_verified=true and not banned) then raise exception 'IDENTITY_VERIFICATION_REQUIRED'; end if;
 if p_request_id is null or char_length(bank) not between 2 and 100 or char_length(holder) not between 2 and 120 or not account_withdrawal_private.valid_iban(normalized) then raise exception 'INVALID_BANK_ACCOUNT'; end if;
 select * into existing from account_withdrawal_private.bank_accounts where user_id=uid and request_id=p_request_id;
 if found then
  if existing.iban<>normalized or existing.bank_name<>bank or existing.holder_name<>holder then raise exception 'REQUEST_ID_REUSED'; end if;
  return jsonb_build_object('id',existing.id);
 end if;
 select * into existing from account_withdrawal_private.bank_accounts where user_id=uid and iban=normalized;
 if found then return jsonb_build_object('id',existing.id); end if;
 insert into account_withdrawal_private.bank_accounts(user_id,request_id,bank_name,holder_name,iban) values(uid,p_request_id,bank,holder,normalized) returning * into existing;
 return jsonb_build_object('id',existing.id);
end;$$;
create function account_withdrawal_private.request(p_request_id uuid,p_bank_id uuid,p_amount numeric,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; bank account_withdrawal_private.bank_accounts; existing account_withdrawal_private.requests; available numeric;
begin
 -- require_user locks this user's profile. Every reservation/review takes the same lock.
 -- Concurrent requests therefore cannot spend the same available test balance.
 uid:=account_admin_private.require_user();
 if not exists(select 1 from public.account_profiles where id=uid and is_verified=true and not banned) then raise exception 'IDENTITY_VERIFICATION_REQUIRED'; end if;
 if p_request_id is null or p_amount is null or p_amount::text in('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount<>trunc(p_amount,2) or char_length(coalesce(p_note,''))>1000 then raise exception 'INVALID_WITHDRAWAL_AMOUNT'; end if;
 select * into existing from account_withdrawal_private.requests where user_id=uid and request_id=p_request_id;
 if found then
  if existing.bank_account_id is distinct from p_bank_id or existing.amount<>p_amount or existing.note<>btrim(coalesce(p_note,'')) then raise exception 'REQUEST_ID_REUSED'; end if;
  return jsonb_build_object('id',existing.id,'is_test',true);
 end if;
 select * into bank from account_withdrawal_private.bank_accounts where id=p_bank_id and user_id=uid;
 if not found then raise exception 'BANK_ACCOUNT_REQUIRED'; end if;
 available:=(account_withdrawal_private.balances(uid)->>'available')::numeric;
 if p_amount>available then raise exception 'INSUFFICIENT_BALANCE'; end if;
 insert into account_withdrawal_private.requests(user_id,request_id,bank_account_id,amount,bank_name,holder_name,iban,note)
 values(uid,p_request_id,bank.id,p_amount,bank.bank_name,bank.holder_name,bank.iban,btrim(coalesce(p_note,''))) returning * into existing;
 return jsonb_build_object('id',existing.id,'is_test',true);
end;$$;
create function account_withdrawal_private.admin_rows(p_offset integer,p_filter text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; rows jsonb;
begin
 actor:=account_admin_private.require_admin(false);
 if coalesce(p_filter,'') not in('','pending','approved','rejected') then raise exception 'INVALID_STATUS'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into rows from (
  select r.id,r.user_id,p.email,r.amount,r.currency,r.payment_mode,r.status,r.bank_name,r.holder_name,
    'SA•• •••• •••• '||right(r.iban,4) as iban_masked,r.note,r.review_note,r.created_at,r.reviewed_at
  from account_withdrawal_private.requests r join public.account_profiles p on p.id=r.user_id
  where coalesce(p_filter,'')='' or r.status=p_filter order by r.created_at desc,r.id limit 50 offset greatest(coalesce(p_offset,0),0)
 ) x;
 return jsonb_build_object('rows',rows,'more',jsonb_array_length(rows)=50);
end;$$;
create function account_withdrawal_private.review(p_id uuid,p_approve boolean,p_note text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; owner_id uuid; record account_withdrawal_private.requests; target text:=case when p_approve then 'approved' else 'rejected' end;
begin
 actor:=account_admin_private.require_admin(true);
 if p_approve is null or p_request_id is null or char_length(coalesce(p_note,''))>1000 or (not p_approve and char_length(btrim(coalesce(p_note,'')))<3) then raise exception 'REASON_REQUIRED'; end if;
 select user_id into owner_id from account_withdrawal_private.requests where id=p_id;
 if not found then raise exception 'RECORD_NOT_FOUND'; end if;
 perform id from public.account_profiles where id=owner_id for update;
 select * into record from account_withdrawal_private.requests where id=p_id for update;
 if record.status<>'pending' then
  if record.reviewed_by=actor and record.review_request_id=p_request_id and record.status=target and record.review_note=btrim(coalesce(p_note,'')) then return jsonb_build_object('success',true,'is_test',true);end if;
  raise exception 'ALREADY_REVIEWED';
 end if;
 update account_withdrawal_private.requests set status=target,review_note=btrim(coalesce(p_note,'')),reviewed_by=actor,review_request_id=p_request_id,reviewed_at=clock_timestamp() where id=p_id;
 insert into public.account_admin_audit(actor_id,action,target_id,details) values(actor,'test_withdrawal_reviewed',p_id::text,jsonb_build_object('status',target,'amount',record.amount,'payment_mode','test'));
 return jsonb_build_object('success',true,'is_test',true);
end;$$;
revoke all on all functions in schema account_withdrawal_private from public,anon,authenticated;
grant usage on schema account_withdrawal_private to authenticated;
grant execute on function account_withdrawal_private.dashboard(integer),account_withdrawal_private.add_bank(uuid,text,text,text),account_withdrawal_private.request(uuid,uuid,numeric,text),account_withdrawal_private.admin_rows(integer,text),account_withdrawal_private.review(uuid,boolean,text,uuid) to authenticated;
create function public.account_withdrawal_dashboard(p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select account_withdrawal_private.dashboard(p_offset);$$;
create function public.account_add_bank(p_request_id uuid,p_bank text,p_holder text,p_iban text) returns jsonb language sql security invoker set search_path='' as $$select account_withdrawal_private.add_bank(p_request_id,p_bank,p_holder,p_iban);$$;
create function public.account_request_withdrawal(p_request_id uuid,p_bank_id uuid,p_amount numeric,p_note text default '') returns jsonb language sql security invoker set search_path='' as $$select account_withdrawal_private.request(p_request_id,p_bank_id,p_amount,p_note);$$;
create function public.account_admin_withdrawals(p_offset integer default 0,p_filter text default '') returns jsonb language sql security invoker set search_path='' as $$select account_withdrawal_private.admin_rows(p_offset,p_filter);$$;
create function public.account_admin_withdrawal_review(p_id uuid,p_approve boolean,p_note text,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$select account_withdrawal_private.review(p_id,p_approve,p_note,p_request_id);$$;
revoke all on function public.account_withdrawal_dashboard(integer),public.account_add_bank(uuid,text,text,text),public.account_request_withdrawal(uuid,uuid,numeric,text),public.account_admin_withdrawals(integer,text),public.account_admin_withdrawal_review(uuid,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.account_withdrawal_dashboard(integer),public.account_add_bank(uuid,text,text,text),public.account_request_withdrawal(uuid,uuid,numeric,text),public.account_admin_withdrawals(integer,text),public.account_admin_withdrawal_review(uuid,boolean,text,uuid) to authenticated;
commit;
