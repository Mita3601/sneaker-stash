create table if not exists public.robotpay_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  country text not null,
  currency text not null check (currency in ('XOF', 'XAF', 'CDF', 'GNF', 'KES', 'GHS', 'NGN', 'PKR', 'PHP', 'INR')),
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'credited', 'needs_review', 'expired')),
  tx_id text unique null,
  credited_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.robotpay_payments (
  tx_id text primary key,
  amount integer,
  currency text,
  country text,
  payer text,
  merchant_slug text,
  provider text,
  raw_payload jsonb,
  deposit_id uuid null references public.robotpay_deposits(id) on delete set null,
  status text null check (status in ('received', 'credited', 'needs_review')),
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists robotpay_deposits_user_id_idx
  on public.robotpay_deposits(user_id);

create index if not exists robotpay_deposits_status_idx
  on public.robotpay_deposits(status);

create index if not exists robotpay_deposits_created_at_idx
  on public.robotpay_deposits(created_at desc);

create index if not exists robotpay_payments_status_idx
  on public.robotpay_payments(status);

alter table public.robotpay_deposits enable row level security;
alter table public.robotpay_payments enable row level security;

create policy robotpay_deposits_select_own on public.robotpay_deposits
  for select to authenticated
  using (user_id = auth.uid());

create policy robotpay_deposits_no_client_write on public.robotpay_deposits
  for insert to authenticated with check (false);

create policy robotpay_deposits_no_client_update on public.robotpay_deposits
  for update to authenticated using (false) with check (false);

create policy robotpay_deposits_no_client_delete on public.robotpay_deposits
  for delete to authenticated using (false);

create policy robotpay_payments_admin_read on public.robotpay_payments
  for select to authenticated
  using (public.is_admin());

create policy robotpay_payments_no_client_write on public.robotpay_payments
  for insert to authenticated with check (false);

create policy robotpay_payments_no_client_update on public.robotpay_payments
  for update to authenticated using (false) with check (false);

create policy robotpay_payments_no_client_delete on public.robotpay_payments
  for delete to authenticated using (false);

create or replace function public.credit_robotpay_deposit(p_deposit_id uuid, p_tx_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit public.robotpay_deposits;
begin
  select * into v_deposit
  from public.robotpay_deposits
  where id = p_deposit_id
  for update;

  if v_deposit is null then
    raise exception 'Dépôt RobotPay introuvable';
  end if;

  if v_deposit.status = 'credited' then
    return;
  end if;

  if p_tx_id is null or btrim(p_tx_id) = '' then
    raise exception 'p_tx_id requis';
  end if;

  perform public.gateway_confirm_deposit(
    _reference := p_tx_id,
    _success := true,
    _metadata := jsonb_build_object(
      'gateway', 'robotpay',
      'deposit_id', p_deposit_id,
      'country', v_deposit.country,
      'currency', v_deposit.currency,
      'method', 'RobotPay'
    )
  );

  update public.robotpay_deposits
  set status = 'credited',
      tx_id = p_tx_id,
      credited_at = now()
  where id = p_deposit_id;

  update public.robotpay_payments
  set status = 'credited',
      deposit_id = p_deposit_id,
      note = null
  where tx_id = p_tx_id;
end;
$$;

revoke all on function public.credit_robotpay_deposit(uuid, text) from public, anon, authenticated;
grant execute on function public.credit_robotpay_deposit(uuid, text) to service_role;

revoke all on table public.robotpay_deposits from public, anon, authenticated;
revoke all on table public.robotpay_payments from public, anon, authenticated;

grant select on table public.robotpay_deposits to authenticated;
grant select on table public.robotpay_payments to authenticated;
grant all on table public.robotpay_deposits to service_role;
grant all on table public.robotpay_payments to service_role;
