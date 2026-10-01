alter table public.profiles add column if not exists admin_credit_balance numeric not null default 0;

update public.profiles p set admin_credit_balance = greatest(0, least(p.balance, coalesce((
  select sum(t.amount) from public.transactions t
  where t.user_id = p.id and t.type = 'bonus' and t.processed_by is not null and t.status = 'approved'), 0)));

create or replace function public.profiles_clamp_admin_credit()
 returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.admin_credit_balance := greatest(0, least(coalesce(new.admin_credit_balance, 0), new.balance));
  return new;
end; $$;

drop trigger if exists profiles_clamp_admin_credit_trg on public.profiles;
create trigger profiles_clamp_admin_credit_trg before update on public.profiles
for each row execute function public.profiles_clamp_admin_credit();

create or replace function public.admin_adjust_balance(_user_id uuid, _amount numeric, _reason text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Accès refusé'; end if;
  update public.profiles
     set balance = balance + _amount,
         admin_credit_balance = admin_credit_balance + greatest(_amount, 0)
   where id = _user_id;
  insert into public.transactions (user_id, type, amount, net_amount, status, description, processed_by)
  values (_user_id, case when _amount >= 0 then 'bonus' else 'adjustment' end, abs(_amount), abs(_amount), 'approved',
    coalesce(_reason,'Ajustement administrateur'), auth.uid());
  return json_build_object('ok', true);
end; $function$;

create or replace function public.purchase_product(_product_id uuid)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare p public.products; me public.profiles; upid uuid; from_admin numeric; commissionable numeric;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me is null then raise exception 'Profil introuvable'; end if;
  if me.is_frozen then raise exception 'Compte gelé'; end if;
  select * into p from public.products where id = _product_id and is_active;
  if p is null then raise exception 'Produit indisponible'; end if;
  if me.balance < p.price then raise exception 'Solde insuffisant'; end if;

  -- L'argent crédité par l'admin est utilisé en premier et ne génère aucune commission.
  from_admin := least(me.admin_credit_balance, p.price);
  commissionable := p.price - from_admin;

  update public.profiles
     set balance = balance - p.price,
         admin_credit_balance = admin_credit_balance - from_admin
   where id = me.id;
  insert into public.user_products (user_id, product_id) values (me.id, p.id) returning id into upid;
  insert into public.transactions (user_id, type, amount, net_amount, status, description, metadata)
  values (me.id, 'purchase', p.price, p.price, 'approved', 'Achat ' || p.name,
    json_build_object('product_id', p.id, 'admin_funded', from_admin, 'commissionable', commissionable));

  if commissionable > 0 then
    perform public.distribute_commissions(me.id, commissionable);
  end if;
  perform public.refresh_missions(me.id);
  if me.referred_by is not null then perform public.refresh_missions(me.referred_by); end if;

  return json_build_object('ok', true, 'user_product_id', upid);
end; $function$;

create or replace function public.gateway_confirm_deposit(_reference text, _success boolean, _metadata jsonb DEFAULT '{}'::jsonb)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare tx public.transactions; gw_tx text; local_ref text; referrer_id uuid;
begin
  local_ref := coalesce(_reference, '');
  gw_tx := coalesce(_metadata->>'gateway_transaction_id', '');
  select * into tx from public.transactions
  where type = 'deposit' and reference = local_ref order by created_at desc limit 1;
  if tx is null then
    select * into tx from public.transactions
    where type = 'deposit'
      and (metadata->>'gateway_transaction_id' = local_ref or reference = local_ref
        or metadata->>'local_reference' = local_ref
        or (gw_tx <> '' and (metadata->>'gateway_transaction_id' = gw_tx or reference = gw_tx)))
    order by created_at desc limit 1;
  end if;
  if tx is null then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  if tx.status <> 'pending' then return json_build_object('ok', true, 'reason', 'already_processed'); end if;

  if _success then
    update public.profiles set balance = balance + tx.amount, total_deposits = total_deposits + tx.amount
     where id = tx.user_id;
    update public.transactions set status = 'approved', updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(_metadata, '{}'::jsonb)
     where id = tx.id;
    -- Plus de commission au dépôt : les commissions sont versées uniquement à l'achat.
    perform public.refresh_missions(tx.user_id);
    select referred_by into referrer_id from public.profiles where id = tx.user_id;
    if referrer_id is not null then perform public.refresh_missions(referrer_id); end if;
  else
    update public.transactions set status = 'rejected', updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(_metadata, '{}'::jsonb)
     where id = tx.id;
  end if;
  return json_build_object('ok', true);
end; $function$;