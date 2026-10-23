begin;
select set_config('test.idea_owner',(select id::text from public.account_profiles where not banned and role<>'admin' limit 1),true);
select set_config('test.idea_admin',(select id::text from public.account_profiles where not banned and role='admin' limit 1),true);
select set_config('test.idea_id',gen_random_uuid()::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.idea_owner'),true);
set local role authenticated;
select public.account_submit_idea(current_setting('test.idea_id')::uuid,'اقتراح لتحسين البحث','إضافة خيارات تسهّل العثور على الحسابات المعروضة.');
select public.account_submit_idea(current_setting('test.idea_id')::uuid,'اقتراح لتحسين البحث','إضافة خيارات تسهّل العثور على الحسابات المعروضة.');
do $$begin
 if exists(select 1 from public.account_ideas where id=current_setting('test.idea_id')::uuid) then raise exception 'NON_ADMIN_CAN_READ_IDEA';end if;
 if has_function_privilege('anon','public.account_submit_idea(uuid,text,text)','execute') then raise exception 'GUEST_CAN_SUBMIT';end if;
 if has_table_privilege('authenticated','public.account_ideas','insert') then raise exception 'DIRECT_INSERT_ALLOWED';end if;
 begin perform public.account_submit_idea(gen_random_uuid(),'a','b');raise exception 'INVALID_ACCEPTED';exception when others then if sqlerrm<>'INVALID_IDEA' then raise;end if;end;
end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.idea_admin'),true);
do $$declare n int;begin
 select count(*) into n from public.account_ideas where id=current_setting('test.idea_id')::uuid and user_id=current_setting('test.idea_owner')::uuid;
 if n<>1 then raise exception 'ADMIN_DELIVERY_OR_IDEMPOTENCY_FAILED';end if;
end;$$;
select 'Member submission, admin delivery, guest denial, privacy, validation and retry protection passed' as result;
rollback;
