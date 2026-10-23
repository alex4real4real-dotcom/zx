begin;
create temp table payment_gate_counts as select
 (select count(*) from public.account_orders) orders,
 (select count(*) from account_withdrawal_private.bank_accounts) banks,
 (select count(*) from account_withdrawal_private.requests) requests;
set local role authenticated;
do $$begin
 begin perform public.account_place_test_order(gen_random_uuid());raise exception 'CHECKOUT_STILL_ENABLED';exception when raise_exception then if sqlerrm<>'PAYMENTS_NOT_ENABLED' then raise;end if;end;
 begin perform public.account_add_bank(gen_random_uuid(),'Bank','Name','SA0000000000000000000000');raise exception 'BANK_WRITE_STILL_ENABLED';exception when raise_exception then if sqlerrm<>'PAYMENTS_NOT_ENABLED' then raise;end if;end;
 begin perform public.account_request_withdrawal(gen_random_uuid(),gen_random_uuid(),1,'');raise exception 'WITHDRAWAL_STILL_ENABLED';exception when raise_exception then if sqlerrm<>'PAYMENTS_NOT_ENABLED' then raise;end if;end;
end;$$;
reset role;
do $$declare before_row payment_gate_counts;begin
 select * into before_row from payment_gate_counts;
 if before_row.orders<>(select count(*) from public.account_orders) or before_row.banks<>(select count(*) from account_withdrawal_private.bank_accounts) or before_row.requests<>(select count(*) from account_withdrawal_private.requests) then raise exception 'DISABLED_ACTION_WROTE_RECORDS';end if;
 if has_function_privilege('anon','public.account_place_test_order(uuid)','execute') or has_function_privilege('anon','public.account_request_withdrawal(uuid,uuid,numeric,text)','execute') or has_function_privilege('anon','public.account_add_bank(uuid,text,text,text)','execute') then raise exception 'ANON_ACCESS_EXPANDED';end if;
end;$$;
rollback;
