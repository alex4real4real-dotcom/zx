-- Official storefront: payment methods remain inactive until merchant integration.
-- Preserve all existing order, support, listing and audit records.
create or replace function public.account_place_test_order(p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin raise exception 'PAYMENTS_NOT_ENABLED';end;$$;
create or replace function public.account_add_bank(p_request_id uuid,p_bank text,p_holder text,p_iban text)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin raise exception 'PAYMENTS_NOT_ENABLED';end;$$;
create or replace function public.account_request_withdrawal(p_request_id uuid,p_bank_id uuid,p_amount numeric,p_note text default '')
returns jsonb language plpgsql security invoker set search_path='' as $$
begin raise exception 'PAYMENTS_NOT_ENABLED';end;$$;
notify pgrst,'reload schema';
