create or replace function public.create_manual_deposit(_amount numeric, _payer_phone text, _provider text, _channel text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare tx_id uuid; ref text;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if _amount is null or _amount < 200 then raise exception 'Montant minimum : 200 FCFA'; end if;
  if length(regexp_replace(coalesce(_payer_phone,''), '\D', '', 'g')) < 8 then raise exception 'Numéro invalide'; end if;
  ref := 'TXN' || lpad((floor(random()*1e12))::bigint::text, 12, '0');
  insert into public.transactions (user_id, type, amount, net_amount, status, reference, description, metadata)
  values (auth.uid(), 'deposit', _amount, _amount, 'pending', ref, 'Recharge ' || coalesce(_channel, _provider),
    jsonb_build_object('gateway', lower(coalesce(_provider,'manual')) || '_manual', 'payer_phone', _payer_phone,
      'channel', coalesce(_channel, _provider), 'provider', coalesce(_provider)))
  returning id into tx_id;
  return json_build_object('ok', true, 'transaction_id', tx_id, 'reference', ref, 'amount', _amount);
end; $$;

create or replace function public.submit_manual_proof(_reference text, _sms text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare tx public.transactions;
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  if length(trim(coalesce(_sms,''))) < 5 then raise exception 'Collez le SMS reçu'; end if;
  select * into tx from public.transactions where reference = _reference and user_id = auth.uid() and type = 'deposit';
  if tx is null then raise exception 'Dépôt introuvable'; end if;
  if tx.status <> 'pending' then raise exception 'Dépôt déjà traité'; end if;
  update public.transactions set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('sms', left(trim(_sms), 1000), 'sms_at', now()), updated_at = now() where id = tx.id;
  return json_build_object('ok', true);
end; $$;

create or replace function public.create_wave_manual_deposit(_amount numeric, _payer_phone text)
returns json language sql as $$
  select public.create_manual_deposit(_amount, _payer_phone, 'Wave', 'Wave Côte d''Ivoire');
$$;

create or replace function public.submit_wave_proof(_reference text, _sms text)
returns json language sql as $$
  select public.submit_manual_proof(_reference, _sms);
$$;

grant execute on function public.create_manual_deposit(numeric, text, text, text) to authenticated;
grant execute on function public.submit_manual_proof(text, text) to authenticated;
grant execute on function public.create_wave_manual_deposit(numeric, text) to authenticated;
grant execute on function public.submit_wave_proof(text, text) to authenticated;