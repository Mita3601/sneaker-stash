-- Remove products wrongly granted to sponsors when a referred user purchased a product.
-- This cleans up historical incorrect allocations without affecting legitimate purchases.
create or replace function public.revoke_wrong_sponsor_products()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.user_products up
  where not exists (
    select 1 from public.transactions t
    where t.user_id = up.user_id and t.type = 'purchase'
  )
  and exists (
    select 1
    from public.profiles child
    join public.transactions child_tx on child_tx.user_id = child.id and child_tx.type = 'purchase'
    where child.referred_by = up.user_id
      and (child_tx.metadata->>'product_id')::uuid = up.product_id
  );
end; $$;

grant execute on function public.revoke_wrong_sponsor_products() to service_role;
revoke execute on function public.revoke_wrong_sponsor_products() from anon;

select public.revoke_wrong_sponsor_products();
