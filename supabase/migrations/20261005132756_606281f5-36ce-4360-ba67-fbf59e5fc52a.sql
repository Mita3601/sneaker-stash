CREATE OR REPLACE FUNCTION public.find_gateway_deposit(p_ref text)
RETURNS TABLE(id text, status text, amount numeric, reference text, metadata jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select id::text, status, amount, reference, metadata, created_at
  from transactions
  where type = 'deposit' and (reference = p_ref or (metadata->>'ref_id') = p_ref)
  order by created_at desc limit 1;
$$;

CREATE OR REPLACE FUNCTION public.list_pending_gateway_deposits(p_gateway text, p_limit integer DEFAULT 500)
RETURNS TABLE(reference text, metadata jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select reference, metadata, created_at from transactions
  where type = 'deposit' and status = 'pending' and (metadata->>'gateway') = p_gateway
  order by created_at asc limit least(greatest(p_limit,1),500);
$$;

-- Règlement idempotent PRISCA : crédite le montant RÉELLEMENT reçu (collectedAmount).
CREATE OR REPLACE FUNCTION public.prisca_settle_deposit(_ref_id text, _success boolean, _collected_amount numeric, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare tx public.transactions; credit numeric; referrer_id uuid;
begin
  select * into tx from public.transactions
   where type = 'deposit' and reference = coalesce(_ref_id,'') and (metadata->>'gateway') = 'prisca'
   order by created_at desc limit 1 for update;
  if tx is null then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  if tx.status <> 'pending' then return json_build_object('ok', true, 'reason', 'already_processed', 'status', tx.status); end if;

  if _success then
    credit := coalesce(_collected_amount, 0);
    if credit <= 0 then return json_build_object('ok', false, 'reason', 'invalid_collected_amount'); end if;
    update public.profiles set balance = balance + credit, total_deposits = total_deposits + credit where id = tx.user_id;
    update public.transactions set status = 'approved', amount = credit, net_amount = credit, updated_at = now(),
      metadata = coalesce(metadata,'{}'::jsonb) || coalesce(_metadata,'{}'::jsonb)
        || jsonb_build_object('requested_amount', tx.amount, 'collected_amount', credit, 'statut', 'paid', 'credited_at', now())
     where id = tx.id;
    perform public.refresh_missions(tx.user_id);
    select referred_by into referrer_id from public.profiles where id = tx.user_id;
    if referrer_id is not null then perform public.refresh_missions(referrer_id); end if;
    return json_build_object('ok', true, 'status', 'approved', 'credited', credit);
  else
    update public.transactions set status = 'rejected', updated_at = now(),
      metadata = coalesce(metadata,'{}'::jsonb) || coalesce(_metadata,'{}'::jsonb) || jsonb_build_object('statut','failure')
     where id = tx.id;
    return json_build_object('ok', true, 'status', 'rejected');
  end if;
end; $$;

GRANT EXECUTE ON FUNCTION public.find_gateway_deposit(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_pending_gateway_deposits(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prisca_settle_deposit(text, boolean, numeric, jsonb) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.find_moneyfusion_transaction(text);
DROP FUNCTION IF EXISTS public.list_pending_moneyfusion_deposits(integer);
DROP FUNCTION IF EXISTS public.update_moneyfusion_transaction(text, text, text, jsonb);