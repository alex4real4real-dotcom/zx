begin;

create schema if not exists account_reviews_private;
revoke all on schema account_reviews_private from public;

create table if not exists account_reviews_private.platform_reviews (
  order_id uuid primary key references public.account_orders(id) on delete cascade,
  queued_at timestamptz not null default now(),
  rating smallint,
  comment text,
  published_at timestamptz,
  constraint platform_review_state_check check (
    (published_at is null and rating is null and comment is null)
    or (
      published_at is not null and rating is not null and rating between 1 and 5
      and comment is not null and char_length(comment) between 1 and 1000
      and comment ~ '[^[:space:]]'
    )
  )
);

alter table account_reviews_private.platform_reviews enable row level security;
revoke all on table account_reviews_private.platform_reviews from public, anon, authenticated;

create index if not exists platform_reviews_published_idx
  on account_reviews_private.platform_reviews (published_at desc, order_id desc)
  where published_at is not null;

-- The payment integration records live/paid only after verifying the payment.
-- Existing test orders and orders awaiting payment never enter the review queue.
create or replace function account_reviews_private.queue_paid_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_mode = 'live' and new.status = 'paid' then
    insert into account_reviews_private.platform_reviews (order_id)
    values (new.id)
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function account_reviews_private.queue_paid_order() from public, anon, authenticated;
drop trigger if exists account_queue_platform_review on public.account_orders;
create trigger account_queue_platform_review
after insert or update of payment_mode, status on public.account_orders
for each row execute function account_reviews_private.queue_paid_order();

create or replace function account_reviews_private.list_reviews(p_offset integer, p_limit integer)
returns table (rating smallint, comment text)
language sql stable security definer set search_path = '' as $$
  select review.rating, review.comment
  from account_reviews_private.platform_reviews as review
  where review.published_at is not null
  order by review.published_at desc, review.order_id desc
  limit least(greatest(coalesce(p_limit, 13), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function account_reviews_private.pending_review()
returns uuid language sql stable security definer set search_path = '' as $$
  select review.order_id
  from account_reviews_private.platform_reviews as review
  join public.account_orders as orders on orders.id = review.order_id
  where orders.user_id = (select auth.uid())
    and orders.payment_mode = 'live'
    and review.published_at is null
  order by review.queued_at, review.order_id
  limit 1;
$$;

create or replace function account_reviews_private.submit_review(
  p_order_id uuid, p_rating integer, p_comment text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  buyer uuid := auth.uid();
  cleaned_comment text := regexp_replace(coalesce(p_comment, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  reviewed_order uuid;
begin
  if buyer is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_rating is null or p_rating not between 1 and 5
    or char_length(cleaned_comment) not between 1 and 1000 then
    raise exception 'INVALID_PLATFORM_REVIEW';
  end if;

  update account_reviews_private.platform_reviews as review
  set rating = p_rating, comment = cleaned_comment, published_at = now()
  from public.account_orders as orders
  where review.order_id = p_order_id
    and review.published_at is null
    and orders.id = review.order_id
    and orders.user_id = buyer
    and orders.payment_mode = 'live'
  returning review.order_id into reviewed_order;

  if reviewed_order is null then
    -- A repeated submission returns the saved review without changing it.
    select review.order_id into reviewed_order
    from account_reviews_private.platform_reviews as review
    join public.account_orders as orders on orders.id = review.order_id
    where review.order_id = p_order_id and review.published_at is not null
      and orders.user_id = buyer and orders.payment_mode = 'live';
  end if;

  if reviewed_order is null then raise exception 'PLATFORM_REVIEW_NOT_AVAILABLE'; end if;
  return reviewed_order;
end;
$$;

create or replace function public.account_platform_reviews(p_offset integer default 0, p_limit integer default 13)
returns table (rating smallint, comment text)
language sql stable security invoker set search_path = '' as $$
  select * from account_reviews_private.list_reviews(p_offset, p_limit);
$$;

create or replace function public.account_pending_platform_review()
returns uuid language sql stable security invoker set search_path = '' as $$
  select account_reviews_private.pending_review();
$$;

create or replace function public.account_submit_platform_review(
  p_order_id uuid, p_rating integer, p_comment text
)
returns uuid language sql security invoker set search_path = '' as $$
  select account_reviews_private.submit_review(p_order_id, p_rating, p_comment);
$$;

grant usage on schema account_reviews_private to anon, authenticated;

revoke all on function account_reviews_private.list_reviews(integer, integer) from public, anon, authenticated;
revoke all on function account_reviews_private.pending_review() from public, anon, authenticated;
revoke all on function account_reviews_private.submit_review(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.account_platform_reviews(integer, integer) from public, anon, authenticated;
revoke all on function public.account_pending_platform_review() from public, anon, authenticated;
revoke all on function public.account_submit_platform_review(uuid, integer, text) from public, anon, authenticated;

grant execute on function account_reviews_private.list_reviews(integer, integer) to anon, authenticated;
grant execute on function public.account_platform_reviews(integer, integer) to anon, authenticated;
grant execute on function account_reviews_private.pending_review() to authenticated;
grant execute on function account_reviews_private.submit_review(uuid, integer, text) to authenticated;
grant execute on function public.account_pending_platform_review() to authenticated;
grant execute on function public.account_submit_platform_review(uuid, integer, text) to authenticated;

notify pgrst, 'reload schema';
commit;
