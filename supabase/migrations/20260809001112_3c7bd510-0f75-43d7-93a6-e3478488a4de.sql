create or replace function public.gateway_confirm_deposit(_reference text, _success boolean, _metadata jsonb default '{}'::jsonb)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare tx public.transactions; gw_tx text;
begin
  gw_tx := coalesce(_metadata->>'gateway_transaction_id', '');

  select * into tx from public.transactions
  where type = 'deposit' and reference = _reference
  order by created_at desc limit 1;

  if tx is null and gw_tx <> '' then
    select * into tx from public.transactions
    where type = 'deposit'
      and (metadata->>'gateway_transaction_id' = gw_tx or reference = gw_tx)
    order by created_at desc limit 1;
  end if;

  if tx is null then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  if tx.status <> 'pending' then return json_build_object('ok', true, 'reason', 'already_processed'); end if;

  if _success then
    update public.profiles
      set balance = balance + tx.amount,
          total_deposits = total_deposits + tx.amount
      where id = tx.user_id;

    update public.transactions
      set status = 'approved',
          updated_at = now(),
          metadata = coalesce(metadata, '{}'::jsonb) || coalesce(_metadata, '{}'::jsonb)
      where id = tx.id;

    perform public.distribute_commissions(tx.user_id, tx.amount);
    perform public.refresh_missions(tx.user_id);
  else
    update public.transactions
      set status = 'rejected',
          updated_at = now(),
          metadata = coalesce(metadata, '{}'::jsonb) || coalesce(_metadata, '{}'::jsonb)
      where id = tx.id;
  end if;

  return json_build_object('ok', true);
end; $function$;