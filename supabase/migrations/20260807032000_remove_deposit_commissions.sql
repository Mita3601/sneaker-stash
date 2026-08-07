-- Remove referral commission distribution from deposit approval.
-- Commissions should be paid on actual product purchases, not on deposit processing.
create or replace function public.admin_review_transaction(_tx_id uuid, _approve boolean)
returns json language plpgsql security definer set search_path = public as $$
declare tx public.transactions;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Accès refusé'; end if;
  select * into tx from public.transactions where id = _tx_id;
  if tx is null or tx.status <> 'pending' then raise exception 'Transaction invalide'; end if;

  if _approve then
    if tx.type = 'deposit' then
      update public.profiles set balance = balance + tx.amount, total_deposits = total_deposits + tx.amount where id = tx.user_id;
    elsif tx.type = 'withdraw' then
      update public.profiles set total_withdrawals = total_withdrawals + tx.amount where id = tx.user_id;
    end if;
    update public.transactions set status = 'approved', processed_by = auth.uid(), updated_at = now() where id = tx.id;
  else
    if tx.type = 'withdraw' then
      update public.profiles set balance = balance + tx.amount where id = tx.user_id;
    end if;
    update public.transactions set status = 'rejected', processed_by = auth.uid(), updated_at = now() where id = tx.id;
  end if;
  return json_build_object('ok', true);
end; $$;

grant execute on function public.admin_review_transaction(uuid, boolean) to authenticated;
grant execute on function public.admin_review_transaction(uuid, boolean) to service_role;
revoke execute on function public.admin_review_transaction(uuid, boolean) from anon;
