CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.gateway_keys (name text PRIMARY KEY, value text NOT NULL);
REVOKE ALL ON private.gateway_keys FROM PUBLIC, anon, authenticated;
INSERT INTO private.gateway_keys(name, value)
VALUES ('prisca_settle', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

DROP FUNCTION IF EXISTS public.prisca_settle_deposit(text, boolean, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.prisca_settle_deposit(_key text, _ref_id text, _success boolean, _collected_amount numeric, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare tx public.transactions; credit numeric; referrer_id uuid; k text;
begin
  select value into k from private.gateway_keys where name = 'prisca_settle';
  if k is null or coalesce(_key,'') <> k then raise exception 'Forbidden'; end if;

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
GRANT EXECUTE ON FUNCTION public.prisca_settle_deposit(text, text, boolean, numeric, jsonb) TO anon, authenticated, service_role;