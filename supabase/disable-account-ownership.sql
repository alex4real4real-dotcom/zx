-- Remove the biography-code requirement without deleting historical records.
update account_bio_private.settings set enabled=false where singleton;
revoke execute on function public.account_bio_start(text,text,text),
 public.account_bio_status(text),public.account_bio_admin_list(integer,text),
 public.account_bio_service(text,uuid,uuid,boolean,text)
 from public,anon,authenticated,service_role;
revoke execute on function account_bio_private.start(text,text,text),
 account_bio_private.latest(text),account_bio_private.admin_list(integer,text),
 account_bio_private.service(text,uuid,uuid,boolean,text)
 from public,anon,authenticated,service_role;
notify pgrst, 'reload schema';
