begin;
select set_config('payout_test.owner',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where p.role='admin' and not p.banned and u.email_confirmed_at is not null limit 1),true),
 set_config('payout_test.other',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where p.role<>'admin' and not p.banned and u.email_confirmed_at is not null limit 1),true);
update public.account_profiles set is_verified=true where id in(current_setting('payout_test.owner')::uuid,current_setting('payout_test.other')::uuid);
create temp table payout_qa(label text primary key,value jsonb);grant select,insert,update on payout_qa to authenticated,service_role;
create function pg_temp.test_iban(body text) returns text language sql as $$select 'SA'||lpad((98-mod((body||'281000')::numeric,97))::text,2,'0')||body;$$;
select set_config('payout_test.iban',pg_temp.test_iban('80'||lpad('987654321',18,'0')),true);
set local role authenticated;
do $$declare result jsonb; nonce uuid:=gen_random_uuid();begin
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.owner'),true);
 result:=public.account_payout_dashboard(0);
 if (result->'integration'->>'can_submit')::boolean or (result->'balances'->>'available')::numeric<>0 then raise exception 'PREPARATION_NOT_DISABLED_OR_TEST_FUNDS_IMPORTED';end if;
 result:=public.account_payout_add_bank(nonce,'QA bank','Fixture owner',current_setting('payout_test.iban'));
 insert into payout_qa values('bank',result);
 if public.account_payout_add_bank(nonce,'QA bank','Fixture owner',current_setting('payout_test.iban'))->>'id'<>result->>'id' then raise exception 'BANK_RETRY_FAILED';end if;
 begin perform public.account_payout_request(gen_random_uuid(),(result->>'id')::uuid,1,'not connected');raise exception 'UNCONFIGURED_WITHDRAWAL_ALLOWED';exception when raise_exception then if sqlerrm<>'BANK_INTEGRATION_NOT_READY' then raise;end if;end;
 if public.account_payout_dashboard(0)::text like '%'||current_setting('payout_test.iban')||'%' then raise exception 'FULL_IBAN_EXPOSED';end if;
 begin perform public.account_payout_credit(current_setting('payout_test.owner')::uuid,'fake',100,'fake');raise exception 'CLIENT_CREATED_REAL_MONEY';exception when insufficient_privilege then null;end;
 begin perform public.account_payout_claim();raise exception 'CLIENT_CLAIMED_TRANSFER';exception when insufficient_privilege then null;end;
 begin perform 1 from account_payout_private.settings;raise exception 'CLIENT_READ_SETTINGS';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.other'),true);
 if jsonb_array_length(public.account_payout_dashboard(0)->'bank_accounts')<>0 then raise exception 'CROSS_USER_BANK_LEAK';end if;
 begin perform public.account_payout_admin(0,'');raise exception 'NON_ADMIN_READ_PAYOUTS';exception when raise_exception then if sqlerrm<>'ADMIN_REQUIRED' then raise;end if;end;
end;$$;
reset role;
set local role service_role;
do $$begin
 begin perform public.account_payout_credit(current_setting('payout_test.owner')::uuid,'unconfigured-credit',100,'not-settled');raise exception 'UNCONFIGURED_CREDIT_ALLOWED';exception when raise_exception then if sqlerrm<>'COLLECTIONS_NOT_READY' then raise;end if;end;
end;$$;
reset role;
-- Only transaction-local fixtures enable connections; all changes roll back.
update account_payout_private.settings set enabled=true,collections_ready=true,bank_ready=true,adapter_ready=true;
set local role service_role;
do $$declare id uuid;begin
 id:=public.account_payout_credit(current_setting('payout_test.owner')::uuid,'qa-credit',100,'qa-settled-bank');
 if public.account_payout_credit(current_setting('payout_test.owner')::uuid,'qa-credit',100,'qa-settled-bank')<>id then raise exception 'CREDIT_REPLAY_DUPLICATED';end if;
 begin perform public.account_payout_credit(current_setting('payout_test.owner')::uuid,'qa-credit',101,'qa-settled-bank');raise exception 'CREDIT_REUSED';exception when raise_exception then if sqlerrm<>'SOURCE_REUSED' then raise;end if;end;
end;$$;
set local role authenticated;
do $$declare bank uuid:=(select (value->>'id')::uuid from payout_qa where label='bank');begin
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.owner'),true);
 begin perform public.account_payout_request(gen_random_uuid(),bank,60,'unverified bank');raise exception 'UNVERIFIED_BENEFICIARY_ALLOWED';exception when raise_exception then if sqlerrm<>'BANK_ACCOUNT_NOT_VERIFIED' then raise;end if;end;
end;$$;
reset role;
update account_withdrawal_private.bank_accounts set verified_at=clock_timestamp(),verification_reference='QA-only-bank-check' where id=(select (value->>'id')::uuid from payout_qa where label='bank');
set local role authenticated;
do $$declare bank uuid:=(select (value->>'id')::uuid from payout_qa where label='bank');nonce uuid:=gen_random_uuid();result jsonb;begin
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.other'),true);
 begin perform public.account_payout_request(gen_random_uuid(),bank,1,'foreign bank');raise exception 'FOREIGN_BANK_USED';exception when raise_exception then if sqlerrm<>'BANK_ACCOUNT_REQUIRED' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.owner'),true);
 result:=public.account_payout_request(nonce,bank,60,'sixty');insert into payout_qa values('sixty',result);
 if public.account_payout_request(nonce,bank,60,'sixty')->>'id'<>result->>'id' then raise exception 'REQUEST_RETRY_DUPLICATED';end if;
 begin perform public.account_payout_request(nonce,bank,61,'sixty');raise exception 'REQUEST_KEY_REUSED';exception when raise_exception then if sqlerrm<>'REQUEST_ID_REUSED' then raise;end if;end;
 begin perform public.account_payout_request(gen_random_uuid(),bank,0.001,'fraction');raise exception 'FRACTION_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_WITHDRAWAL_AMOUNT' then raise;end if;end;
 begin perform public.account_payout_request(gen_random_uuid(),bank,'NaN'::numeric,'nan');raise exception 'NAN_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_WITHDRAWAL_AMOUNT' then raise;end if;end;
 if (public.account_payout_dashboard(0)->'balances'->>'available')::numeric<>40 then raise exception 'RESERVATION_FAILED';end if;
 begin perform public.account_payout_request(gen_random_uuid(),bank,41,'overspend');raise exception 'OVERDRAFT_ALLOWED';exception when raise_exception then if sqlerrm<>'INSUFFICIENT_BALANCE' then raise;end if;end;
 result:=public.account_payout_request(gen_random_uuid(),bank,40,'forty');insert into payout_qa values('forty',result);
 perform public.account_payout_cancel((result->>'id')::uuid);perform public.account_payout_cancel((result->>'id')::uuid);
 if (public.account_payout_dashboard(0)->'balances'->>'available')::numeric<>40 then raise exception 'CANCELLATION_RELEASED_TWICE';end if;
end;$$;
set local role service_role;
do $$declare job jsonb;result jsonb;begin
 job:=public.account_payout_claim();insert into payout_qa values('job',job);
 if job->>'action'<>'submit' or job->>'id'<>(select value->>'id' from payout_qa where label='sixty') then raise exception 'BAD_CLAIM';end if;
 if public.account_payout_claim() is not null then raise exception 'JOB_CLAIMED_TWICE';end if;
 begin perform public.account_payout_report((job->>'id')::uuid,(job->>'claim_id')::uuid,'paid','qa-bad','qa-ref',61,job->>'iban');raise exception 'WRONG_AMOUNT_ACCEPTED';exception when raise_exception then if sqlerrm<>'INVALID_PAYOUT_RESULT' then raise;end if;end;
 result:=public.account_payout_report((job->>'id')::uuid,(job->>'claim_id')::uuid,'reconciling','qa-unknown','',60,job->>'iban');
 if result->>'status'<>'reconciling' then raise exception 'UNCERTAIN_TRANSFER_NOT_HELD';end if;
end;$$;
set local role authenticated;
do $$begin
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.owner'),true);
 if (public.account_payout_dashboard(0)->'balances'->>'available')::numeric<>40 then raise exception 'UNCERTAIN_FUNDS_RELEASED';end if;
 begin perform public.account_payout_cancel((select (value->>'id')::uuid from payout_qa where label='sixty'));raise exception 'INFLIGHT_CANCELLED';exception when raise_exception then if sqlerrm<>'PAYOUT_ALREADY_PROCESSING' then raise;end if;end;
end;$$;
reset role;
update account_payout_private.requests set claimed_at=clock_timestamp()-interval '3 minutes' where id=(select (value->>'id')::uuid from payout_qa where label='sixty');
set local role service_role;
do $$declare job jsonb;old_job jsonb:=(select value from payout_qa where label='job');result jsonb;begin
 job:=public.account_payout_claim();
 if job->>'action'<>'lookup' or job->>'idempotency_key'<>old_job->>'idempotency_key' then raise exception 'UNCERTAIN_TRANSFER_RESUBMITTED';end if;
 begin perform public.account_payout_report((job->>'id')::uuid,(old_job->>'claim_id')::uuid,'paid','qa-stale','qa-paid',60,job->>'iban');raise exception 'STALE_WORKER_CHANGED_MONEY';exception when raise_exception then if sqlerrm<>'STALE_PAYOUT_RESULT' then raise;end if;end;
 result:=public.account_payout_report((job->>'id')::uuid,(job->>'claim_id')::uuid,'paid','qa-paid-event','qa-paid-reference',60,job->>'iban');
 perform public.account_payout_report((job->>'id')::uuid,(job->>'claim_id')::uuid,'paid','qa-paid-event','qa-paid-reference',60,job->>'iban');
 if result->>'status'<>'paid' then raise exception 'BANK_PAID_NOT_RECORDED';end if;
 begin perform public.account_payout_report((job->>'id')::uuid,(job->>'claim_id')::uuid,'failed','qa-paid-event','',60,job->>'iban');raise exception 'EVENT_CHANGED_OUTCOME';exception when raise_exception then if sqlerrm<>'EVENT_REUSED' then raise;end if;end;
end;$$;
set local role authenticated;
do $$declare result jsonb;bank uuid:=(select (value->>'id')::uuid from payout_qa where label='bank');begin
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.owner'),true);
 result:=public.account_payout_dashboard(0);
 if public.account_payout_wallet() is distinct from result->'balances' then raise exception 'HEADER_WALLET_DIFFERENT_FROM_PAYOUT_LEDGER';end if;
 if (result->'balances'->>'available')::numeric<>40 or (result->'balances'->>'paid')::numeric<>60 or (result->'balances'->>'reserved')::numeric<>0 then raise exception 'PAID_NOT_DEBITED_EXACTLY_ONCE';end if;
 result:=public.account_payout_request(gen_random_uuid(),bank,40,'reject');insert into payout_qa values('reject',result);
end;$$;
set local role service_role;
do $$declare job jsonb;begin
 job:=public.account_payout_claim();perform public.account_payout_report((job->>'id')::uuid,(job->>'claim_id')::uuid,'failed','qa-definitive-failure','',40,job->>'iban');
end;$$;
set local role authenticated;
do $$begin
 perform set_config('request.jwt.claim.sub',current_setting('payout_test.owner'),true);
 if (public.account_payout_dashboard(0)->'balances'->>'available')::numeric<>40 then raise exception 'DEFINITE_FAILURE_NOT_RELEASED';end if;
end;$$;
set local role anon;
do $$begin
 if has_function_privilege('anon','public.account_payout_wallet()','execute') or has_function_privilege('anon','public.account_payout_dashboard(integer)','execute') or has_function_privilege('authenticated','public.account_payout_report(uuid,uuid,text,text,text,numeric,text)','execute') then raise exception 'PAYOUT_API_EXPOSED';end if;
end;$$;
rollback;
select jsonb_build_object('prepared_but_disabled',true,'test_money_excluded',true,'identity_and_bank_ownership_enforced',true,'reservations_and_idempotency',true,'uncertain_transfers_stay_reserved',true,'reconcile_without_resubmission',true,'paid_exactly_once',true,'definitive_failure_restores_funds',true,'all_fixtures_rolled_back',true) as checks;
