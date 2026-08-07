-- Fix referral commission distribution on product purchase.
-- The sponsor chain should receive 27% / 2% / 1% of the purchase amount.
create or replace function public.purchase_product(_product_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare p public.products; me public.profiles; upid uuid;
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

  return json_build_object('ok', true, 'user_product_id', upid);
end; $$;

grant execute on function public.purchase_product(uuid) to authenticated;
grant execute on function public.purchase_product(uuid) to service_role;
revoke execute on function public.purchase_product(uuid) from anon;
