create or replace function public.create_gateway_deposit(_amount numeric, _reference text, _metadata jsonb default '{}'::jsonb)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare tx_id uuid;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if _amount <= 0 then raise exception 'Montant invalide'; end if;
  if coalesce(_reference, '') = '' then raise exception 'Référence manquante'; end if;

  insert into public.transactions (user_id, type, amount, net_amount, status, reference, description, metadata)
  values (auth.uid(), 'deposit', _amount, _amount, 'pending', _reference, 'Recharge mobile money', coalesce(_metadata, '{}'::jsonb))
  returning id into tx_id;

  return json_build_object('ok', true, 'transaction_id', tx_id, 'reference', _reference);
end; $$;

create or replace function public.gateway_confirm_deposit(_reference text, _success boolean, _metadata jsonb default '{}'::jsonb)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare tx public.transactions;
begin
  select * into tx from public.transactions
  where reference = _reference and type = 'deposit'
  order by created_at desc limit 1;

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
end; $$;

revoke all on function public.create_gateway_deposit(numeric, text, jsonb) from public, anon;
grant execute on function public.create_gateway_deposit(numeric, text, jsonb) to authenticated, service_role;

revoke all on function public.gateway_confirm_deposit(text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.gateway_confirm_deposit(text, boolean, jsonb) to service_role;