begin;
select set_config('withdraw_identity.user',(select id::text from public.account_profiles where not banned limit 1),true);
update public.account_profiles set is_verified=false where id=current_setting('withdraw_identity.user')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('withdraw_identity.user'),true);
do $$begin
 begin perform public.account_withdrawal_dashboard(0);raise exception 'UNVERIFIED_DASHBOARD_ALLOWED';exception when raise_exception then if sqlerrm<>'IDENTITY_VERIFICATION_REQUIRED' then raise;end if;end;
 begin perform public.account_add_bank(gen_random_uuid(),'QA bank','QA fixture','SA0380000000000608010167519');raise exception 'UNVERIFIED_BANK_ALLOWED';exception when raise_exception then if sqlerrm<>'IDENTITY_VERIFICATION_REQUIRED' then raise;end if;end;
 begin perform public.account_request_withdrawal(gen_random_uuid(),gen_random_uuid(),1,'QA');raise exception 'UNVERIFIED_REQUEST_ALLOWED';exception when raise_exception then if sqlerrm<>'IDENTITY_VERIFICATION_REQUIRED' then raise;end if;end;
end;$$;
reset role;
update public.account_profiles set is_verified=true where id=current_setting('withdraw_identity.user')::uuid;
set local role authenticated;
do $$begin
 if public.account_withdrawal_dashboard(0)->>'is_test'<>'true' then raise exception 'VERIFIED_DASHBOARD_DENIED';end if;
end;$$;
rollback;
