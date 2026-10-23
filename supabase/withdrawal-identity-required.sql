-- Identity verification is required even when the client is bypassed.
create or replace function account_withdrawal_private.dashboard(p_offset integer)
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
create or replace function account_withdrawal_private.add_bank(p_request_id uuid,p_bank text,p_holder text,p_iban text)
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
create or replace function account_withdrawal_private.request(p_request_id uuid,p_bank_id uuid,p_amount numeric,p_note text)
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
