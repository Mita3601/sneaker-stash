-- Rebuild `user_products` and recompute `profiles` balances from `transactions`.
-- Safely backs up `profiles` and `user_products` before making changes.
-- Run this migration from Supabase SQL editor or psql. It is idempotent and creates backups.

create or replace function public.rebuild_profiles_and_user_products()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Backups (timestamped)
  if not exists (select 1 from pg_tables where schemaname='public' and tablename='profiles_backup_20260807') then
    execute 'create table public.profiles_backup_20260807 as select * from public.profiles';
  end if;
  if not exists (select 1 from pg_tables where schemaname='public' and tablename='user_products_backup_20260807') then
    execute 'create table public.user_products_backup_20260807 as select * from public.user_products';
  end if;

  -- Rebuild user_products from purchase transactions
  -- Remove all current user_products and reinsert based on transactions of type 'purchase'
  delete from public.user_products;

  insert into public.user_products (id, user_id, product_id, purchase_date, last_claim_date, total_earned, status)
  select gen_random_uuid(), t.user_id, (t.metadata->>'product_id')::uuid, t.created_at, null, 0, 'active'
  from public.transactions t
  where t.type = 'purchase'
  order by t.created_at;

  -- Recompute profile aggregates and balance from transactions (approved/pending statuses considered appropriately)
  update public.profiles p set
    total_deposits = coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type = 'deposit' and t.status = 'approved'), 0),
    total_withdrawals = coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type = 'withdraw' and t.status = 'approved'), 0),
    total_bonus = coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type in ('bonus','commission') and t.status = 'approved'), 0),
    balance = (
      coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type = 'deposit' and t.status = 'approved'),0)
      + coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type in ('bonus','commission','yield') and t.status = 'approved'),0)
      - coalesce((select sum(t.amount) from public.transactions t where t.user_id = p.id and t.type in ('withdraw','purchase','adjustment') and t.status in ('approved','pending')),0)
    );

end; $$;

grant execute on function public.rebuild_profiles_and_user_products() to service_role;
revoke execute on function public.rebuild_profiles_and_user_products() from anon;

-- Execute immediately when running the migration
select public.rebuild_profiles_and_user_products();
