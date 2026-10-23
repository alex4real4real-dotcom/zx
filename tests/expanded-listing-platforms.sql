begin;
select set_config('platform_test.seller',(select p.id::text from public.account_profiles p join auth.users u on u.id=p.id where not p.banned and u.email_confirmed_at is not null limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('platform_test.seller'),true);
set local role authenticated;
do $$declare kind text; ident text; saved jsonb;begin
 foreach kind in array array['tellonym','discord','playstation','xbox','telegram'] loop
  ident:=gen_random_uuid()::text;
  saved:=public.account_seller_save_product(ident,'Rollback platform check',375,kind,'Rollback only',
   '{"account_email":"dummy@example.invalid","email_password":"rollback-mail","account_username":"rollback-user","account_password":"rollback-account"}'::jsonb,false);
  if saved->>'listing_type'<>kind or saved->>'active'<>'false' then raise exception 'PLATFORM_NOT_SAVED';end if;
 end loop;
 foreach kind in array array['facebook','youtube','invalid'] loop
  begin
   perform public.account_seller_save_product(gen_random_uuid()::text,'Rejected platform',375,kind,'','{}',false);
   raise exception 'REMOVED_PLATFORM_ALLOWED';
  exception when raise_exception then if sqlerrm<>'INVALID_PRODUCT' then raise;end if;end;
 end loop;
 begin perform public.account_place_test_order(gen_random_uuid());raise exception 'PAYMENT_GATE_LOST';
 exception when raise_exception then if sqlerrm<>'PAYMENTS_NOT_ENABLED' then raise;end if;end;
end;$$;
reset role;
select 'New platform drafts save; removed types rejected; payments remain inactive' as result;
rollback;
