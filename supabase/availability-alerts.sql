begin;

-- Configure account_availability_resend_key and account_availability_email_from
-- in Supabase Vault to enable delivery with a verified Resend sender.

create extension if not exists http with schema extensions;

create schema if not exists account_alert_private;
revoke all on schema account_alert_private from public, anon, authenticated;
grant usage on schema account_alert_private to authenticated;

alter table public.account_products add column if not exists service_type text
  check (service_type in ('programming', 'design', 'video', 'other'));

create table if not exists account_alert_private.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('username', 'service')),
  qualifier text not null,
  target text not null,
  target_key text not null,
  locale text not null check (locale in ('ar', 'en')),
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  uncertain_since timestamptz,
  last_http_status integer,
  sent_at timestamptz
);
alter table account_alert_private.requests enable row level security;
revoke all on account_alert_private.requests from public, anon, authenticated;

create unique index if not exists account_alert_pending_target
  on account_alert_private.requests (user_id, kind, qualifier, target_key)
  where sent_at is null;
create index if not exists account_alert_due
  on account_alert_private.requests (next_attempt_at, created_at)
  where sent_at is null;

create or replace function account_alert_private.username_key(value text)
returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(coalesce(value, '')), '^@', ''));
$$;

create or replace function account_alert_private.service_key(value text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
    lower(translate(coalesce(value, ''), 'أإآىةًٌٍَُِّْـ', 'ااايه')),
    '[[:space:][:punct:]]+', ' ', 'g'
  ));
$$;

create or replace function account_alert_private.service_matches(
  requested_type text, query text, listing_type text, title text, description text
)
returns boolean language sql immutable set search_path = '' as $$
  select query <> ''
    and (listing_type is null or listing_type = requested_type)
    and (
      strpos(' ' || account_alert_private.service_key(title) || ' ', ' ' || query || ' ') > 0
      or strpos(' ' || account_alert_private.service_key(description) || ' ', ' ' || query || ' ') > 0
    );
$$;

create or replace function account_alert_private.mail_configured()
returns boolean language sql stable set search_path = '' as $$
  select count(distinct name) = 2
  from vault.decrypted_secrets
  where name in ('account_availability_resend_key', 'account_availability_email_from')
    and nullif(btrim(decrypted_secret), '') is not null;
$$;

create or replace function account_alert_private.save_request(
  p_kind text, p_qualifier text, p_target text, p_locale text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  buyer_id uuid := (select auth.uid());
  target_text text := btrim(coalesce(p_target, ''));
  match_key text;
begin
  if buyer_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users
    where id = buyer_id and email_confirmed_at is not null and nullif(email, '') is not null
  ) then
    raise exception 'EMAIL_CONFIRMATION_REQUIRED' using errcode = '42501';
  end if;
  if exists (select 1 from public.account_profiles where id = buyer_id and banned) then
    raise exception 'ACCOUNT_BANNED' using errcode = '42501';
  end if;

  if p_kind = 'username' then
    match_key := account_alert_private.username_key(target_text);
    if coalesce(p_qualifier, '') not in ('instagram', 'tiktok', 'telegram', 'x', 'discord', 'tellonym', 'playstation', 'xbox')
      or char_length(match_key) not between 1 and 64
      or match_key ~ '[[:space:]@]' then
      raise exception 'INVALID_AVAILABILITY_ALERT' using errcode = '22023';
    end if;
    target_text := '@' || regexp_replace(target_text, '^@', '');
  elsif p_kind = 'service' then
    match_key := account_alert_private.service_key(target_text);
    if coalesce(p_qualifier, '') not in ('programming', 'design', 'video', 'other')
      or char_length(target_text) not between 1 and 100 or match_key = '' then
      raise exception 'INVALID_AVAILABILITY_ALERT' using errcode = '22023';
    end if;
  else
    raise exception 'INVALID_AVAILABILITY_ALERT' using errcode = '22023';
  end if;

  insert into account_alert_private.requests (user_id, kind, qualifier, target, target_key, locale)
  values (buyer_id, p_kind, p_qualifier, target_text, match_key, case when p_locale = 'en' then 'en' else 'ar' end)
  on conflict (user_id, kind, qualifier, target_key) where sent_at is null do nothing;

  return jsonb_build_object('mail_configured', account_alert_private.mail_configured());
end;
$$;

create or replace function public.account_save_availability_alert(
  p_kind text, p_qualifier text, p_target text, p_locale text
)
returns jsonb language sql security invoker set search_path = '' as $$
  select account_alert_private.save_request(p_kind, p_qualifier, p_target, p_locale);
$$;

-- The existing product save function enforces seller ownership and publishing rules.
create or replace function account_alert_private.save_service(
  p_id text, p_title text, p_price numeric, p_description text, p_active boolean, p_service_type text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  saved jsonb;
begin
  if p_service_type is not null and p_service_type not in ('programming', 'design', 'video', 'other') then
    raise exception 'INVALID_PRODUCT' using errcode = '22023';
  end if;
  saved := account_seller_private.save_product(p_id, p_title, p_price, 'service', p_description, '{}'::jsonb, p_active);
  update public.account_products set service_type = p_service_type
  where id = p_id and seller_id = (select auth.uid());
  return saved || jsonb_build_object('service_type', p_service_type);
end;
$$;

create or replace function public.account_seller_save_service(
  p_id text, p_title text, p_price numeric, p_description text, p_active boolean, p_service_type text
)
returns jsonb language sql security invoker set search_path = '' as $$
  select account_alert_private.save_service(p_id, p_title, p_price, p_description, p_active, p_service_type);
$$;

create or replace function account_alert_private.mail_message(
  alert_kind text, qualifier text, target_text text, locale text
)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  platform_name text;
  subject text;
  message text;
  catalog_url text := 'https://alex4real4real-dotcom.github.io/zx/shop.html?category=';
begin
  if alert_kind = 'username' then
    if locale = 'en' then
      platform_name := case qualifier
        when 'instagram' then 'Instagram' when 'tiktok' then 'TikTok'
        when 'telegram' then 'Telegram' when 'x' then 'X' when 'discord' then 'Discord'
        when 'tellonym' then 'Tellonym' when 'playstation' then 'PlayStation' when 'xbox' then 'Xbox'
      end;
      subject := 'The username you requested is available';
      message := format('%s on %s is now listed on Account.', target_text, platform_name);
    else
      platform_name := case qualifier
        when 'instagram' then 'إنستغرام' when 'tiktok' then 'تيك توك'
        when 'telegram' then 'تيليجرام' when 'x' then 'إكس' when 'discord' then 'ديسكورد'
        when 'tellonym' then 'تيلونيم' when 'playstation' then 'بلايستيشن' when 'xbox' then 'إكس بوكس'
      end;
      subject := 'توفر اليوزر اللي طلبته';
      message := format('توفر %s على %s في موقع Account.', target_text, platform_name);
    end if;
    catalog_url := catalog_url || 'social';
  else
    subject := case when locale = 'en' then 'The service you requested is available' else 'توفرت الخدمة اللي طلبتها' end;
    message := case when locale = 'en' then format('A service matching "%s" is now listed on Account.', target_text)
      else format('نُشر في موقع Account إعلان يطابق الخدمة اللي طلبتها «%s».', target_text) end;
    catalog_url := catalog_url || 'services';
  end if;
  return jsonb_build_object('subject', subject, 'text', message || chr(10) || chr(10) || catalog_url);
end;
$$;

create or replace function account_alert_private.deliver(
  api_key text, sender text, recipient text, alert_id uuid, message jsonb
)
returns integer language sql set search_path = '' as $$
  select response.status
  from extensions.http((
    'POST',
    'https://api.resend.com/emails',
    array[
      extensions.http_header('Authorization', 'Bearer ' || api_key),
      extensions.http_header('Idempotency-Key', 'account-availability/' || alert_id)
    ],
    'application/json',
    (jsonb_build_object('from', sender, 'to', jsonb_build_array(recipient)) || message)::text
  )::extensions.http_request) as response;
$$;

-- The mail job runs independently of seller saves and keeps credentials in Vault.
create or replace function account_alert_private.dispatch()
returns integer language plpgsql set search_path = '' as $$
declare
  run_at timestamptz := now();
  api_key text;
  sender text;
  alert record;
  provider_status integer;
  sent_count integer := 0;
begin
  if not pg_try_advisory_xact_lock(812531, 230717) then return 0; end if;
  select nullif(btrim(decrypted_secret), '') into api_key from vault.decrypted_secrets
  where name = 'account_availability_resend_key';
  select nullif(btrim(decrypted_secret), '') into sender from vault.decrypted_secrets
  where name = 'account_availability_email_from';
  if api_key is null or sender is null then return 0; end if;

  for alert in
    with published as materialized (
      select listing_type, service_type, title, description
      from account_catalog_private.verified_seller_products()
      where sold_at is null and deleted_at is null
    )
    select request.*, recipient.email
    from account_alert_private.requests as request
    join auth.users as recipient on recipient.id = request.user_id
    where request.sent_at is null
      and request.next_attempt_at <= run_at
      and (request.uncertain_since is null or request.uncertain_since > run_at - interval '23 hours')
      and recipient.email_confirmed_at is not null and nullif(recipient.email, '') is not null
      and not exists (select 1 from public.account_profiles where id = recipient.id and banned)
      and exists (
        select 1 from published as product
        where (
          request.kind = 'username' and product.listing_type = request.qualifier
          and account_alert_private.username_key(product.title) = request.target_key
        ) or (
          request.kind = 'service' and product.listing_type = 'service'
          and account_alert_private.service_matches(
            request.qualifier, request.target_key, product.service_type, product.title, product.description
          )
        )
      )
    order by request.next_attempt_at, request.created_at, request.id
    limit 2
    for update of request skip locked
  loop
    begin
      provider_status := account_alert_private.deliver(
        api_key, sender, alert.email, alert.id,
        account_alert_private.mail_message(alert.kind, alert.qualifier, alert.target, alert.locale)
      );
    exception when others then
      provider_status := null;
    end;
    update account_alert_private.requests
    set sent_at = case when provider_status between 200 and 299 then run_at end,
        last_http_status = provider_status,
        uncertain_since = case when provider_status is null or provider_status = 409 or provider_status >= 500
          then coalesce(uncertain_since, run_at) end,
        next_attempt_at = run_at + interval '5 minutes'
    where id = alert.id;
    if provider_status between 200 and 299 then sent_count := sent_count + 1; end if;
  end loop;
  return sent_count;
end;
$$;

revoke all on all functions in schema account_alert_private from public, anon, authenticated;
grant execute on function account_alert_private.save_request(text,text,text,text),
  account_alert_private.save_service(text,text,numeric,text,boolean,text) to authenticated;
revoke all on function public.account_save_availability_alert(text,text,text,text),
  public.account_seller_save_service(text,text,numeric,text,boolean,text) from public, anon, authenticated;
grant execute on function public.account_save_availability_alert(text,text,text,text),
  public.account_seller_save_service(text,text,numeric,text,boolean,text) to authenticated;

select cron.schedule('account-availability-mail', '* * * * *', 'select account_alert_private.dispatch();');
notify pgrst, 'reload schema';

commit;
