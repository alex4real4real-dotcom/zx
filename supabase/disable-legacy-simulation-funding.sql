-- Disable remaining historical simulation funding/review entry points.
create or replace function public.account_test_topup(p_request_id uuid,p_amount numeric,p_note text default '') returns jsonb language plpgsql security invoker set search_path='' as $$begin raise exception 'PAYMENTS_NOT_ENABLED';end;$$;
create or replace function public.account_admin_topup(p_id uuid,p_approve boolean,p_note text default '') returns jsonb language plpgsql security invoker set search_path='' as $$begin raise exception 'PAYMENTS_NOT_ENABLED';end;$$;
create or replace function public.account_admin_withdrawal_review(p_id uuid,p_approve boolean,p_note text,p_request_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$begin raise exception 'PAYMENTS_NOT_ENABLED';end;$$;
notify pgrst,'reload schema';
