-- Update purchase_product and gateway_confirm_deposit to refresh referrer's missions when a referred user makes a purchase
create or replace function public.purchase_product(_product_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare p public.products; me public.profiles; upid uuid; referrer_id uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null then raise exception 'Profil introuvable'; end if;
  if me.is_frozen then raise exception 'Compte gelé'; end if;
  select * into p from public.products where id = _product_id and is_active;
  if p is null then raise exception 'Produit indisponible'; end if;
  if me.balance < p.price then raise exception 'Solde insuffisant'; end if;

  update public.profiles set balance = balance - p.price where id = me.id;
  insert into public.user_products (user_id, product_id) values (me.id, p.id) returning id into upid;
  insert into public.transactions (user_id, type, amount, net_amount, status, description, metadata)
  values (me.id, 'purchase', p.price, p.price, 'approved', 'Achat ' || p.name, json_build_object('product_id', p.id));

  perform public.distribute_commissions(me.id, p.price);
  perform public.refresh_missions(me.id);

  -- Refresh referrer's missions if user was referred
  if me.referred_by is not null then
    perform public.refresh_missions(me.referred_by);
  end if;

  return json_build_object('ok', true, 'user_product_id', upid);
end; $$;

grant execute on function public.purchase_product(uuid) to authenticated;
grant execute on function public.purchase_product(uuid) to service_role;
revoke execute on function public.purchase_product(uuid) from anon;

create or replace function public.gateway_confirm_deposit(_reference text, _success boolean, _metadata jsonb default '{}'::jsonb)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare tx public.transactions; gw_tx text; local_ref text; referrer_id uuid;
begin
  local_ref := coalesce(_reference, '');
  gw_tx := coalesce(_metadata->>'gateway_transaction_id', '');

  select * into tx from public.transactions
  where type = 'deposit' and reference = local_ref
  order by created_at desc limit 1;

  if tx is null then
    select * into tx from public.transactions
    where type = 'deposit'
      and (
        metadata->>'gateway_transaction_id' = local_ref
        or reference = local_ref
        or metadata->>'local_reference' = local_ref
        or (gw_tx <> '' and (metadata->>'gateway_transaction_id' = gw_tx or reference = gw_tx))
      )
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

    -- Refresh referrer's missions if user was referred
    select referred_by into referrer_id from public.profiles where id = tx.user_id;
    if referrer_id is not null then
      perform public.refresh_missions(referrer_id);
    end if;
  else
    update public.transactions
      set status = 'rejected',
          updated_at = now(),
          metadata = coalesce(metadata, '{}'::jsonb) || coalesce(_metadata, '{}'::jsonb)
      where id = tx.id;
  end if;

  return json_build_object('ok', true);
end; $$;

grant execute on function public.gateway_confirm_deposit(text, boolean, jsonb) to authenticated;
grant execute on function public.gateway_confirm_deposit(text, boolean, jsonb) to service_role;
revoke execute on function public.gateway_confirm_deposit(text, boolean, jsonb) from anon;
