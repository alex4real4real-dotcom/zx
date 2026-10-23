begin;
select set_config('profile_qa.owner',(select id::text from public.account_profiles where not banned order by created_at limit 1),true),
 set_config('profile_qa.other',(select id::text from public.account_profiles where not banned order by created_at offset 1 limit 1),true),
 set_config('profile_qa.phone','+1555'||lpad((random()*9999999)::bigint::text,7,'0'),true),
 set_config('profile_qa.other_phone','+1556'||lpad((random()*9999999)::bigint::text,7,'0'),true);
update public.account_profiles set phone=current_setting('profile_qa.other_phone') where id=current_setting('profile_qa.other')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('profile_qa.owner'),true);
do $$declare before_row public.account_profiles;after_row public.account_profiles;begin
 select * into before_row from public.account_profiles where id=auth.uid();
 perform public.account_update_profile('QA profile saved',current_setting('profile_qa.phone'),null);
 select * into after_row from public.account_profiles where id=auth.uid();
 if after_row.display_name<>'QA profile saved' or after_row.phone<>current_setting('profile_qa.phone') then raise exception 'PROFILE_SAVE_FAILED';end if;
 if before_row.email is distinct from after_row.email or before_row.role is distinct from after_row.role or before_row.is_verified is distinct from after_row.is_verified or before_row.banned is distinct from after_row.banned then raise exception 'PROTECTED_FIELDS_CHANGED';end if;
 perform public.account_update_profile('QA saved again',current_setting('profile_qa.phone'),null);
 begin perform public.account_update_profile('Rejected phone',current_setting('profile_qa.other_phone'),null);raise exception 'DUPLICATE_PHONE_ALLOWED';exception when raise_exception then if sqlerrm<>'PHONE_IN_USE' then raise;end if;end;
 if (select display_name from public.account_profiles where id=auth.uid())<>'QA saved again' then raise exception 'PARTIAL_UPDATE_ON_FAILURE';end if;
 begin perform public.account_update_profile('Bad phone','invalid',null);raise exception 'BAD_PHONE_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_PHONE' then raise;end if;end;
 begin perform public.account_update_profile('Bad avatar',current_setting('profile_qa.phone'),current_setting('profile_qa.other')||'/avatar.png');raise exception 'OTHER_AVATAR_ALLOWED';exception when raise_exception then if sqlerrm<>'INVALID_AVATAR' then raise;end if;end;
end;$$;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin perform public.account_update_profile('No session',current_setting('profile_qa.phone'),null);raise exception 'MISSING_SESSION_ALLOWED';exception when raise_exception then if sqlerrm<>'AUTH_REQUIRED' then raise;end if;end;
end;$$;
set local role anon;
do $$begin
 if has_function_privilege('anon','public.account_update_profile(text,text,text)','execute') then raise exception 'ANON_EDIT_ALLOWED';end if;
end;$$;
rollback;
