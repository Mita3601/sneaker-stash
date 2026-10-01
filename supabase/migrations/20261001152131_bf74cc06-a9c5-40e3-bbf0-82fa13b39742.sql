create extension if not exists pg_cron;

create or replace function public.request_withdrawal(_amount numeric, _bank_account_id uuid)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare
  me public.profiles; fee numeric; net numeric; ba public.bank_accounts; today_count int;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me is null then raise exception 'Profil introuvable'; end if;
  if me.is_frozen then raise exception 'Compte gelé'; end if;
  if _amount is null or _amount < 1000 then raise exception 'Montant minimum de retrait : 1 000 FCFA'; end if;
  if me.balance < _amount then raise exception 'Solde insuffisant'; end if;
  if not exists (select 1 from public.user_products where user_id = me.id) then
    raise exception 'Vous devez acheter au moins un parfum avant de demander un retrait';
  end if;
  select count(*) into today_count from public.transactions
   where user_id = me.id and type = 'withdraw' and status <> 'rejected'
     and created_at >= date_trunc('day', now());
  if today_count >= 2 then raise exception 'Limite atteinte : 2 retraits maximum par jour'; end if;
  select * into ba from public.bank_accounts where id = _bank_account_id and user_id = me.id;
  if ba is null then raise exception 'Compte de retrait introuvable'; end if;
  fee := round(_amount * 0.15, 2); net := _amount - fee;
  update public.profiles set balance = balance - _amount where id = me.id;
  insert into public.transactions (user_id, type, amount, fee, net_amount, status, description, metadata)
  values (me.id, 'withdraw', _amount, fee, net, 'pending', 'Demande de retrait',
    json_build_object('provider', ba.provider, 'account_number', ba.account_number, 'account_name', ba.account_name));
  return json_build_object('ok', true, 'fee', fee, 'net', net);
end; $function$;

create or replace function public.process_all_yields()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare r record; gain numeric; base timestamptz; credited int := 0;
begin
  for r in
    select up.id, up.user_id, up.total_earned, up.last_claim_date, up.purchase_date, p.daily_yield, p.total_yield, p.name
    from public.user_products up join public.products p on p.id = up.product_id
    where up.status = 'active'
      and coalesce(up.last_claim_date, up.purchase_date) <= now() - interval '24 hours'
    for update of up skip locked
  loop
    base := coalesce(r.last_claim_date, r.purchase_date);
    while base <= now() - interval '24 hours' and r.total_earned < r.total_yield loop
      gain := least(r.daily_yield, r.total_yield - r.total_earned);
      exit when gain <= 0;
      base := base + interval '24 hours';
      r.total_earned := r.total_earned + gain;
      update public.profiles set balance = balance + gain, total_bonus = total_bonus + gain where id = r.user_id;
      insert into public.transactions (user_id, type, amount, net_amount, status, description)
      values (r.user_id, 'yield', gain, gain, 'approved', 'Revenu quotidien ' || r.name);
      credited := credited + 1;
    end loop;
    update public.user_products
      set total_earned = r.total_earned, last_claim_date = base,
          status = case when r.total_earned >= r.total_yield then 'completed' else 'active' end
    where id = r.id;
  end loop;
  return credited;
end; $function$;

revoke all on function public.process_all_yields() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'process-all-yields';
select cron.schedule('process-all-yields', '0 * * * *', $$select public.process_all_yields();$$);