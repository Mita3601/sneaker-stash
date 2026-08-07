-- Retroactively credit missing referral commissions for past product purchases.
-- This will credit 27% / 2% / 1% to the sponsor chain and track the source purchase.
create or replace function public.repay_referral_commissions()
returns void language plpgsql security definer set search_path = public as $$
declare
  purchase record;
  l1 uuid;
  l2 uuid;
  l3 uuid;
  c numeric;
begin
  for purchase in
    select id as purchase_tx_id, user_id, amount
    from public.transactions
    where type = 'purchase'
  loop
    select referred_by into l1 from public.profiles where id = purchase.user_id;
    if l1 is not null then
      if not exists(
        select 1 from public.transactions tx
        where tx.type = 'commission'
          and tx.user_id = l1
          and tx.metadata->>'purchase_tx_id' = purchase.purchase_tx_id::text
          and tx.metadata->>'level' = '1'
      ) then
        c := round(purchase.amount * 0.27, 2);
        update public.profiles set balance = balance + c, total_bonus = total_bonus + c where id = l1;
        insert into public.transactions (user_id, type, amount, net_amount, status, description, metadata)
        values (
          l1,
          'commission',
          c,
          c,
          'approved',
          'Commission niveau 1 (27%)',
          json_build_object('purchase_tx_id', purchase.purchase_tx_id, 'level', 1, 'source_user_id', purchase.user_id)
        );
      end if;

      select referred_by into l2 from public.profiles where id = l1;
      if l2 is not null then
        if not exists(
          select 1 from public.transactions tx
          where tx.type = 'commission'
            and tx.user_id = l2
            and tx.metadata->>'purchase_tx_id' = purchase.purchase_tx_id::text
            and tx.metadata->>'level' = '2'
        ) then
          c := round(purchase.amount * 0.02, 2);
          update public.profiles set balance = balance + c, total_bonus = total_bonus + c where id = l2;
          insert into public.transactions (user_id, type, amount, net_amount, status, description, metadata)
          values (
            l2,
            'commission',
            c,
            c,
            'approved',
            'Commission niveau 2 (2%)',
            json_build_object('purchase_tx_id', purchase.purchase_tx_id, 'level', 2, 'source_user_id', purchase.user_id)
          );
        end if;
      end if;

      select referred_by into l3 from public.profiles where id = l2;
      if l3 is not null then
        if not exists(
          select 1 from public.transactions tx
          where tx.type = 'commission'
            and tx.user_id = l3
            and tx.metadata->>'purchase_tx_id' = purchase.purchase_tx_id::text
            and tx.metadata->>'level' = '3'
        ) then
          c := round(purchase.amount * 0.01, 2);
          update public.profiles set balance = balance + c, total_bonus = total_bonus + c where id = l3;
          insert into public.transactions (user_id, type, amount, net_amount, status, description, metadata)
          values (
            l3,
            'commission',
            c,
            c,
            'approved',
            'Commission niveau 3 (1%)',
            json_build_object('purchase_tx_id', purchase.purchase_tx_id, 'level', 3, 'source_user_id', purchase.user_id)
          );
        end if;
      end if;
    end if;
  end loop;
end; $$;

grant execute on function public.repay_referral_commissions() to service_role;
revoke execute on function public.repay_referral_commissions() from anon;

select public.repay_referral_commissions();
