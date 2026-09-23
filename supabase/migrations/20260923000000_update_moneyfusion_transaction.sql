-- Migration: create RPCs to handle MoneyFusion transaction updates without service role key

-- 1) Find a deposit by token (reference or metadata fields)
create or replace function public.find_moneyfusion_transaction(
  p_token text
)
returns table(id text, status text, amount numeric, reference text, metadata jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select id::text, status, amount, reference, metadata, created_at
  from transactions
  where type = 'deposit'
    and (
      reference = p_token
      or (metadata->> 'token') = p_token
      or (metadata->> 'local_reference') = p_token
      or (metadata->> 'gateway_transaction_id') = p_token
    )
  order by created_at desc
  limit 1;
$$;

revoke all on function public.find_moneyfusion_transaction(text) from public;
grant execute on function public.find_moneyfusion_transaction(text) to anon, authenticated;

-- 2) Update a transaction status identified by token, without overwriting final statuses
create or replace function public.update_moneyfusion_transaction(
  p_token text,
  p_new_status text,
  p_gateway_transaction_id text,
  p_raw_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _match boolean;
  _new_meta jsonb := '{}';
  _tx_ref text := null;
begin
  -- Compute whether a matching row exists and isn't final.
  select exists(
    select 1 from transactions
    where type = 'deposit'
      and (
        reference = p_token
        or (metadata->> 'token') = p_token
        or (metadata->> 'local_reference') = p_token
        or (metadata->> 'gateway_transaction_id') = p_token
      )
      and coalesce(status, '') not in ('paid', 'failure')
  ) into _match;

  if not _match then
    -- nothing to do
    return;
  end if;

  -- Build new metadata by preserving existing fields and setting gateway_transaction_id and raw payload when provided
  select coalesce(metadata, '{}'::jsonb), reference into _new_meta, _tx_ref
  from transactions
  where type = 'deposit'
    and (
      reference = p_token
      or (metadata->> 'token') = p_token
      or (metadata->> 'local_reference') = p_token
      or (metadata->> 'gateway_transaction_id') = p_token
    )
  order by created_at desc
  limit 1;

  if p_gateway_transaction_id is not null and char_length(trim(p_gateway_transaction_id)) > 0 then
    _new_meta := jsonb_set(_new_meta, '{gateway_transaction_id}', to_jsonb(p_gateway_transaction_id::text), true);
  end if;

  if p_raw_payload is not null then
    _new_meta := jsonb_set(_new_meta, '{moneyfusion_raw_payload}', p_raw_payload, true);
  end if;

  -- Update metadata only; do NOT set status here because
  -- `gateway_confirm_deposit` expects the transaction to still be 'pending'
  -- and will perform the status update and crediting atomically.
  update transactions
  set metadata = _new_meta,
      updated_at = now()
  where type = 'deposit'
    and (
      reference = p_token
      or (metadata->> 'token') = p_token
      or (metadata->> 'local_reference') = p_token
      or (metadata->> 'gateway_transaction_id') = p_token
    )
    and coalesce(status, '') not in ('paid', 'failure');

  -- Call gateway_confirm_deposit to run the business logic (crediting, commissions, etc.).
  -- Pass _success = true when p_new_status signals a successful payment ('paid'),
  -- otherwise pass false to mark as rejected.
  if p_new_status = 'paid' then
    perform public.gateway_confirm_deposit(_reference := coalesce(_tx_ref, p_token), _success := true, _metadata := _new_meta);
  else
    perform public.gateway_confirm_deposit(_reference := coalesce(_tx_ref, p_token), _success := false, _metadata := _new_meta);
  end if;
end;
$$;

revoke all on function public.update_moneyfusion_transaction(text, text, text, jsonb) from public;
grant execute on function public.update_moneyfusion_transaction(text, text, text, jsonb) to anon, authenticated;

-- 3) Helper: list pending moneyfusion deposits (used by cron job)
create or replace function public.list_pending_moneyfusion_deposits(
  p_limit integer default 500
)
returns table(reference text, metadata jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select reference, metadata, created_at
  from transactions
  where type = 'deposit'
    and coalesce(status, '') = 'pending'
    and (metadata->> 'gateway') = 'moneyfusion'
  order by created_at desc
  limit p_limit;
$$;

revoke all on function public.list_pending_moneyfusion_deposits(integer) from public;
grant execute on function public.list_pending_moneyfusion_deposits(integer) to anon, authenticated;
