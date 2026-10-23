begin;
create temp table signup_qa(id uuid,email text,phone text);
insert into signup_qa values(gen_random_uuid(),'qa-'||gen_random_uuid()::text||'@example.invalid','+9665'||lpad((random()*99999999)::bigint::text,8,'0'));
do $$declare fixture signup_qa;other_id uuid:=gen_random_uuid();begin
 select * into fixture from signup_qa;
 insert into auth.users(id,email,raw_user_meta_data) values(fixture.id,fixture.email,jsonb_build_object('name','Rollback fixture','phone',fixture.phone));
 if (select phone from public.account_profiles where id=fixture.id)<>fixture.phone then raise exception 'PHONE_NOT_SAVED';end if;
 -- Email is reserved while email_confirmed_at is still null.
 if (select email_confirmed_at from auth.users where id=fixture.id) is not null then raise exception 'EXPECTED_PENDING_ACCOUNT';end if;
 if public.account_signup_availability(upper(fixture.email),'+15550009999')<>'email_in_use' then raise exception 'EMAIL_REUSE_ALLOWED';end if;
 if public.account_signup_availability('new-'||fixture.email,'0'||substr(fixture.phone,5))<>'phone_in_use' then raise exception 'LOCAL_PHONE_REUSE_ALLOWED';end if;
 if public.account_signup_availability('new-'||fixture.email,'00'||substr(fixture.phone,2))<>'phone_in_use' then raise exception 'INTERNATIONAL_PHONE_REUSE_ALLOWED';end if;
 if public.account_signup_availability('new-'||fixture.email,translate(fixture.phone,'0123456789','٠١٢٣٤٥٦٧٨٩'))<>'phone_in_use' then raise exception 'ARABIC_PHONE_REUSE_ALLOWED';end if;
 begin
  insert into auth.users(id,email,raw_user_meta_data) values(other_id,'new-'||fixture.email,jsonb_build_object('phone',fixture.phone));
  raise exception 'AUTH_DUPLICATE_PHONE_ALLOWED';
 exception when raise_exception then if sqlerrm<>'PHONE_IN_USE' then raise;end if;end;
 if exists(select 1 from auth.users where id=other_id) or exists(select 1 from public.account_profiles where id=other_id) then raise exception 'REJECTED_SIGNUP_LEFT_ACCOUNT';end if;
 begin
  insert into auth.users(id,email,raw_user_meta_data) values(other_id,upper(fixture.email),jsonb_build_object('phone','+15550009999'));
  raise exception 'AUTH_DUPLICATE_EMAIL_ALLOWED';
 exception when unique_violation then null;when raise_exception then if sqlerrm<>'EMAIL_IN_USE' then raise;end if;end;
 insert into auth.users(id,email,raw_user_meta_data) values(other_id,'new-'||fixture.email,jsonb_build_object('phone','+15550009999'));
 begin update public.account_profiles set phone=fixture.phone where id=other_id;raise exception 'PROFILE_PHONE_REUSE_ALLOWED';exception when raise_exception then if sqlerrm<>'PHONE_IN_USE' then raise;end if;end;
 update auth.users set raw_user_meta_data=jsonb_build_object('phone','+15550008888') where id=fixture.id;
 if public.account_signup_availability('newer-'||fixture.email,fixture.phone)<>'phone_in_use' then raise exception 'METADATA_CHANGE_RELEASED_PHONE';end if;
 delete from auth.users where id=other_id;
 if public.account_signup_availability('new-'||fixture.email,'+15550007777')<>'email_in_use' then raise exception 'DELETION_RELEASED_EMAIL';end if;
 if public.account_signup_availability('unused-'||fixture.email,'+15550007777')<>'available' then raise exception 'UNUSED_DETAILS_BLOCKED';end if;
end;$$;
grant select on signup_qa to anon;
set local role anon;
do $$declare fixture signup_qa;begin
 select * into fixture from signup_qa;
 if public.account_signup_availability(fixture.email,fixture.phone)<>'email_in_use' then raise exception 'PUBLIC_CHECK_FAILED';end if;
 begin perform 1 from account_signup_private.identifiers;raise exception 'PRIVATE_IDENTIFIERS_EXPOSED';exception when insufficient_privilege then null;end;
end;$$;
rollback;
