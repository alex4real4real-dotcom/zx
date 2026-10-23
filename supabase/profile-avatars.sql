-- Private profile avatars: owner-only writes and signed read URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('account-avatars','account-avatars',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy account_avatar_select_own on storage.objects for select to authenticated
using(bucket_id='account-avatars' and name in((select auth.uid())::text||'/avatar.png',(select auth.uid())::text||'/avatar.jpg',(select auth.uid())::text||'/avatar.webp') and exists(select 1 from public.account_profiles where id=(select auth.uid()) and not banned));
create policy account_avatar_insert_own on storage.objects for insert to authenticated
with check(bucket_id='account-avatars' and name in((select auth.uid())::text||'/avatar.png',(select auth.uid())::text||'/avatar.jpg',(select auth.uid())::text||'/avatar.webp') and exists(select 1 from public.account_profiles where id=(select auth.uid()) and not banned));
create policy account_avatar_update_own on storage.objects for update to authenticated
using(bucket_id='account-avatars' and name in((select auth.uid())::text||'/avatar.png',(select auth.uid())::text||'/avatar.jpg',(select auth.uid())::text||'/avatar.webp') and exists(select 1 from public.account_profiles where id=(select auth.uid()) and not banned))
with check(bucket_id='account-avatars' and name in((select auth.uid())::text||'/avatar.png',(select auth.uid())::text||'/avatar.jpg',(select auth.uid())::text||'/avatar.webp') and exists(select 1 from public.account_profiles where id=(select auth.uid()) and not banned));
